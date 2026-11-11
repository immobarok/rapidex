package engine

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"sync"
	"time"

	"rappidex/internal/models"
	"rappidex/internal/pkg/netutil"
	"rappidex/internal/storage"
)

// Manager orchestrates all active, paused, and completed download tasks.
type Manager struct {
	mu       sync.RWMutex
	db       *storage.Database
	tasks    map[string]*Task
	limiter  *BandwidthLimiter
	onUpdate func(items []*models.DownloadItem)
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
			m.tasks[item.ID] = NewTask(item, m.limiter, m.persistState)
		}
	}

	return m
}

func (m *Manager) SetUpdateCallback(fn func(items []*models.DownloadItem)) {
	m.mu.Lock()
	m.onUpdate = fn
	m.mu.Unlock()
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
			if saveCounter%10 == 0 { // Checkpoint to disk every 2s
				m.persistState()
			}
		}
	}
}

func (m *Manager) persistState() {
	items := m.List()
	_ = m.db.Downloads().SaveAll(items)
}

func (m *Manager) AddDownload(url, savePath, fileName string, maxConns int, headers map[string]string) (*models.DownloadItem, error) {
	settings := m.db.Settings().Get()
	if maxConns <= 0 {
		maxConns = settings.DefaultMaxConns
	}
	if savePath == "" {
		savePath = settings.DefaultDownloadDir
	}

	var totalSize int64
	var acceptRanges bool

	// Probe URL upfront to resolve YouTube/redirect URL, exact file size, filename + extension, and Range support
	probe, probeErr := Probe(url, headers)
	if probeErr == nil && probe != nil {
		if probe.URL != "" {
			url = probe.URL
		}
		if fileName == "" {
			fileName = probe.FileName
		} else {
			fileName = netutil.EnsureExtension(fileName, probe.ContentType)
		}
		totalSize = probe.TotalSize
		acceptRanges = probe.AcceptRanges
	} else if fileName == "" {
		fileName = netutil.ExtractFilename(url, "", "")
	}

	categoryID := m.db.Categories().ResolveCategory(fileName)

	item := &models.DownloadItem{
		ID:           fmt.Sprintf("dl_%d", time.Now().UnixNano()),
		URL:          url,
		FileName:     fileName,
		SavePath:     savePath,
		CategoryID:   categoryID,
		QueueID:      "main",
		TotalSize:    totalSize,
		AcceptRanges: acceptRanges,
		Status:       models.StatusQueued,
		MaxConns:     maxConns,
		Headers:      headers,
		CreatedAt:    time.Now(),
	}

	task := NewTask(item, m.limiter, m.persistState)

	m.mu.Lock()
	m.tasks[item.ID] = task
	m.mu.Unlock()

	m.persistState()
	task.Start()

	return task.Snapshot(), nil
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

func (m *Manager) OpenFileLocation(id string) error {
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
		return exec.Command("open", "-R", fullPath).Start()
	case "windows":
		return exec.Command("explorer", "/select,", fullPath).Start()
	default:
		return exec.Command("xdg-open", snap.SavePath).Start()
	}
}
