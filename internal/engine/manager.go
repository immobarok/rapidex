package engine

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"rappidex/internal/engine/protocols"
	"rappidex/internal/models"
	"rappidex/internal/pkg/netutil"
	"rappidex/internal/storage"
)

// AddDownloadOptions contains all fields from IDM's "Download File Info" dialog.
type AddDownloadOptions struct {
	URL         string            `json:"url"`
	FileName    string            `json:"fileName"`
	SavePath    string            `json:"savePath"`
	CategoryID  string            `json:"categoryId"`
	QueueID     string            `json:"queueId"`
	Description string            `json:"description"`
	Referer     string            `json:"referer"`
	MaxConns    int               `json:"maxConns"`
	StartNow    bool              `json:"startNow"`
	Headers     map[string]string `json:"headers"`
}

// BatchOptions configures IDM's "Add Batch Download" wildcard generator.
type BatchOptions struct {
	Pattern     string `json:"pattern"`     // e.g. "https://example.com/photo_*.jpg"
	From        int    `json:"from"`        // e.g. 1
	To          int    `json:"to"`          // e.g. 20
	WildcardLen int    `json:"wildcardLen"` // zero-pad width, e.g. 3 -> 001..020
	SavePath    string `json:"savePath"`
	CategoryID  string `json:"categoryId"`
	QueueID     string `json:"queueId"`
	StartNow    bool   `json:"startNow"`
}

// Manager orchestrates all active, paused, queued, and completed download tasks.
type Manager struct {
	mu          sync.RWMutex
	db          *storage.Database
	tasks       map[string]*Task
	limiter     *BandwidthLimiter
	onUpdate    func(items []*models.DownloadItem)
	onCompleted func(item *models.DownloadItem)
}

func NewManager(db *storage.Database) *Manager {
	settings := db.Settings().Get()
	m := &Manager{
		db:      db,
		tasks:   make(map[string]*Task),
		limiter: NewBandwidthLimiter(settings.SpeedLimitBps),
	}

	// Restore persisted downloads from disk
	if saved, err := db.Downloads().LoadAll(); err == nil {
		for _, item := range saved {
			if item.Status == models.StatusDownloading || item.Status == models.StatusProbing {
				item.Status = models.StatusPaused
				item.SpeedBps = 0
				for i := range item.Chunks {
					item.Chunks[i].Active = false
				}
			}
			m.tasks[item.ID] = NewTask(item, m.limiter, db.Settings().Get, m.persistState, m.handleCompleted)
		}
	}

	return m
}

func (m *Manager) SetUpdateCallback(fn func(items []*models.DownloadItem)) {
	m.mu.Lock()
	m.onUpdate = fn
	m.mu.Unlock()
}

func (m *Manager) SetCompletedCallback(fn func(item *models.DownloadItem)) {
	m.mu.Lock()
	m.onCompleted = fn
	m.mu.Unlock()
}

func (m *Manager) handleCompleted(item *models.DownloadItem) {
	m.mu.RLock()
	cb := m.onCompleted
	m.mu.RUnlock()
	if cb != nil {
		cb(item)
	}
}

func (m *Manager) StartProgressEmitter(ctx context.Context) {
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()

	saveCounter := 0
	for {
		select {
		case <-ctx.Done():
			m.persistState()
			return
		case <-ticker.C:
			items := m.List()
			m.mu.RLock()
			cb := m.onUpdate
			m.mu.RUnlock()
			if cb != nil {
				cb(items)
			}
			saveCounter++
			if saveCounter%10 == 0 {
				m.persistState()
			}
		}
	}
}

func (m *Manager) persistState() {
	items := m.List()
	_ = m.db.Downloads().SaveAll(items)
}

// ProbeURL inspects a URL using the configured proxy/settings.
func (m *Manager) ProbeURL(rawURL string, headers map[string]string) (*ProbeResult, error) {
	settings := m.db.Settings().Get()
	client := protocols.NewHTTPClient(settings.Proxy.Mode, settings.Proxy.URL)
	ctx, cancel := context.WithTimeout(context.Background(), 25*time.Second)
	defer cancel()
	return Probe(ctx, client, rawURL, headers)
}

// AddDownload creates a download task from simple parameters.
func (m *Manager) AddDownload(url, savePath, fileName string, maxConns int, headers map[string]string) (*models.DownloadItem, error) {
	return m.AddDownloadWithOptions(AddDownloadOptions{
		URL:      url,
		FileName: fileName,
		SavePath: savePath,
		MaxConns: maxConns,
		StartNow: true,
		Headers:  headers,
	})
}

// AddDownloadWithOptions supports both "Start Now" and "Download Later" (queued), custom category, description, and referer.
func (m *Manager) AddDownloadWithOptions(opts AddDownloadOptions) (*models.DownloadItem, error) {
	settings := m.db.Settings().Get()
	if opts.MaxConns <= 0 {
		opts.MaxConns = settings.DefaultMaxConns
	}
	if opts.QueueID == "" {
		opts.QueueID = storage.MainQueueID
	}

	originalURL := strings.TrimSpace(opts.URL)
	resolvedURL := originalURL
	fileName := strings.TrimSpace(opts.FileName)
	var totalSize int64
	var acceptRanges bool

	probe, probeErr := m.ProbeURL(originalURL, opts.Headers)
	if probeErr == nil && probe != nil {
		if probe.URL != "" {
			resolvedURL = probe.URL
		}
		if fileName == "" {
			fileName = probe.FileName
		} else {
			fileName = netutil.EnsureExtension(fileName, probe.ContentType)
		}
		totalSize = probe.TotalSize
		acceptRanges = probe.AcceptRanges
	} else if fileName == "" {
		fileName = netutil.ExtractFilename(originalURL, "", "")
	}

	categoryID := opts.CategoryID
	if categoryID == "" {
		categoryID = m.db.Categories().ResolveCategory(fileName)
	}
	savePath := strings.TrimSpace(opts.SavePath)
	if savePath == "" {
		savePath = settings.SaveDirFor(categoryID)
	}

	item := &models.DownloadItem{
		ID:           fmt.Sprintf("dl_%d", time.Now().UnixNano()),
		URL:          resolvedURL,
		OriginalURL:  originalURL,
		FileName:     fileName,
		SavePath:     savePath,
		CategoryID:   categoryID,
		QueueID:      opts.QueueID,
		Description:  opts.Description,
		Referer:      opts.Referer,
		TotalSize:    totalSize,
		AcceptRanges: acceptRanges,
		Status:       models.StatusQueued,
		MaxConns:     opts.MaxConns,
		Headers:      opts.Headers,
		CreatedAt:    time.Now(),
	}

	task := NewTask(item, m.limiter, m.db.Settings().Get, m.persistState, m.handleCompleted)

	m.mu.Lock()
	m.tasks[item.ID] = task
	m.mu.Unlock()

	m.persistState()
	if opts.StartNow {
		task.Start()
	}

	return task.Snapshot(), nil
}

// AddBatchDownloads expands a wildcard pattern (e.g. "https://site.com/img_*.jpg", 1..10) into individual downloads.
func (m *Manager) AddBatchDownloads(opts BatchOptions) ([]*models.DownloadItem, error) {
	if !strings.Contains(opts.Pattern, "*") {
		return nil, fmt.Errorf("pattern must contain '*' as wildcard (for example: https://example.com/file_*.zip)")
	}
	if opts.To < opts.From || opts.To-opts.From > 500 {
		return nil, fmt.Errorf("range must be between 1 and 500 files")
	}

	created := make([]*models.DownloadItem, 0, opts.To-opts.From+1)
	for i := opts.From; i <= opts.To; i++ {
		numStr := fmt.Sprintf("%0*d", max(1, opts.WildcardLen), i)
		u := strings.ReplaceAll(opts.Pattern, "*", numStr)
		item, err := m.AddDownloadWithOptions(AddDownloadOptions{
			URL:        u,
			SavePath:   opts.SavePath,
			CategoryID: opts.CategoryID,
			QueueID:    opts.QueueID,
			StartNow:   opts.StartNow,
		})
		if err == nil {
			created = append(created, item)
		}
	}
	return created, nil
}

func (m *Manager) Pause(id string) error {
	m.mu.RLock()
	task, ok := m.tasks[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("download %s not found", id)
	}
	task.Pause()
	m.persistState()
	return nil
}

func (m *Manager) Resume(id string) error {
	m.mu.RLock()
	task, ok := m.tasks[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("download %s not found", id)
	}
	task.Start()
	return nil
}

func (m *Manager) RefreshDownloadURL(id, newURL string) error {
	m.mu.RLock()
	task, ok := m.tasks[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("download %s not found", id)
	}
	task.RefreshURL(strings.TrimSpace(newURL))
	m.persistState()
	return nil
}

func (m *Manager) SetTaskSpeedLimit(id string, bytesPerSec int64) error {
	m.mu.RLock()
	task, ok := m.tasks[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("download %s not found", id)
	}
	task.SetTaskSpeedLimit(bytesPerSec)
	m.persistState()
	return nil
}

func (m *Manager) Cancel(id string, deleteFile bool) error {
	m.mu.Lock()
	task, ok := m.tasks[id]
	if ok {
		delete(m.tasks, id)
	}
	m.mu.Unlock()
	if !ok {
		return fmt.Errorf("download %s not found", id)
	}
	task.Cancel(deleteFile)
	m.persistState()
	return nil
}

func (m *Manager) DeleteCompleted() int {
	m.mu.Lock()
	removed := 0
	for id, t := range m.tasks {
		if t.Snapshot().Status == models.StatusCompleted {
			delete(m.tasks, id)
			removed++
		}
	}
	m.mu.Unlock()
	if removed > 0 {
		m.persistState()
	}
	return removed
}

func (m *Manager) PauseAll() {
	m.mu.RLock()
	tasks := make([]*Task, 0, len(m.tasks))
	for _, t := range m.tasks {
		tasks = append(tasks, t)
	}
	m.mu.RUnlock()

	for _, task := range tasks {
		task.Pause()
	}
	m.persistState()
}

func (m *Manager) ResumeAll() {
	m.mu.RLock()
	tasks := make([]*Task, 0, len(m.tasks))
	for _, t := range m.tasks {
		tasks = append(tasks, t)
	}
	m.mu.RUnlock()

	for _, task := range tasks {
		snap := task.Snapshot()
		if snap.Status == models.StatusPaused || snap.Status == models.StatusFailed || snap.Status == models.StatusQueued {
			task.Start()
		}
	}
}

func (m *Manager) List() []*models.DownloadItem {
	m.mu.RLock()
	out := make([]*models.DownloadItem, 0, len(m.tasks))
	for _, t := range m.tasks {
		out = append(out, t.Snapshot())
	}
	m.mu.RUnlock()

	sort.Slice(out, func(i, j int) bool {
		return out[i].CreatedAt.After(out[j].CreatedAt)
	})
	return out
}

func (m *Manager) SetSpeedLimit(bytesPerSec int64) {
	m.limiter.SetLimit(bytesPerSec)
}

// OpenFile opens the finished file with the default OS application.
func (m *Manager) OpenFile(id string) error {
	m.mu.RLock()
	task, ok := m.tasks[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("download %s not found", id)
	}
	snap := task.Snapshot()
	fullPath := filepath.Join(snap.SavePath, snap.FileName)

	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", fullPath).Start()
	case "windows":
		return exec.Command("cmd", "/c", "start", "", fullPath).Start()
	default:
		return exec.Command("xdg-open", fullPath).Start()
	}
}

// OpenFileLocation reveals the file in Finder / Explorer.
func (m *Manager) OpenFileLocation(id string) error {
	m.mu.RLock()
	task, ok := m.tasks[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("download %s not found", id)
	}
	snap := task.Snapshot()
	fullPath := filepath.Join(snap.SavePath, snap.FileName)
	if snap.Status != models.StatusCompleted {
		fullPath = PartPath(fullPath)
	}

	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", "-R", fullPath).Start()
	case "windows":
		return exec.Command("explorer", "/select,", fullPath).Start()
	default:
		return exec.Command("xdg-open", snap.SavePath).Start()
	}
}
