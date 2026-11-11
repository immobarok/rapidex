package engine

import (
	"fmt"
	"sync"
	"time"

	"rappidex/internal/models"
	"rappidex/internal/storage"
)

// Manager orchestrates all active and queued download tasks.
type Manager struct {
	mu      sync.RWMutex
	db      *storage.Database
	tasks   map[string]*Task
	limiter *BandwidthLimiter
}

func NewManager(db *storage.Database) *Manager {
	return &Manager{
		db:      db,
		tasks:   make(map[string]*Task),
		limiter: NewBandwidthLimiter(0),
	}
}

func (m *Manager) AddDownload(url, savePath, fileName string, maxConns int, headers map[string]string) (*models.DownloadItem, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if maxConns <= 0 {
		maxConns = 8
	}

	item := &models.DownloadItem{
		ID:        fmt.Sprintf("dl_%d", time.Now().UnixNano()),
		URL:       url,
		FileName:  fileName,
		SavePath:  savePath,
		Status:    models.StatusQueued,
		MaxConns:  maxConns,
		Headers:   headers,
		CreatedAt: time.Now(),
	}

	task := NewTask(item, m.limiter)
	m.tasks[item.ID] = task
	go task.Start()

	return item, nil
}

func (m *Manager) Pause(id string) error {
	m.mu.RLock()
	task, ok := m.tasks[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("download %s not found", id)
	}
	task.Pause()
	return nil
}

func (m *Manager) Resume(id string) error {
	m.mu.RLock()
	task, ok := m.tasks[id]
	m.mu.RUnlock()
	if !ok {
		return fmt.Errorf("download %s not found", id)
	}
	go task.Start()
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
	return nil
}

func (m *Manager) PauseAll() {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, task := range m.tasks {
		task.Pause()
	}
}

func (m *Manager) List() []*models.DownloadItem {
	m.mu.RLock()
	defer m.mu.RUnlock()
	out := make([]*models.DownloadItem, 0, len(m.tasks))
	for _, t := range m.tasks {
		out = append(out, t.Item)
	}
	return out
}

func (m *Manager) SetSpeedLimit(bytesPerSec int64) {
	m.limiter.SetLimit(bytesPerSec)
}

