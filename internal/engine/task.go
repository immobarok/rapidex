package engine

import (
	"context"
	"sync"

	"rappidex/internal/models"
)

// Task manages the lifecycle, workers, and dynamic chunk splitting of a single download.
type Task struct {
	mu      sync.Mutex
	Item    *models.DownloadItem
	limiter *BandwidthLimiter
	cancel  context.CancelFunc
}

func NewTask(item *models.DownloadItem, limiter *BandwidthLimiter) *Task {
	return &Task{
		Item:    item,
		limiter: limiter,
	}
}

func (t *Task) Start() {
	t.mu.Lock()
	ctx, cancel := context.WithCancel(context.Background())
	t.cancel = cancel
	t.Item.Status = models.StatusDownloading
	t.mu.Unlock()

	_ = ctx
	// Core flow:
	// 1. Probe URL if TotalSize == 0
	// 2. Allocate target file via SparseMerger
	// 3. Create initial chunks via Splitter and spawn Worker goroutines
	// 4. Steal remaining bytes from largest chunk when a worker finishes early
}

func (t *Task) Pause() {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.cancel != nil {
		t.cancel()
	}
	t.Item.Status = models.StatusPaused
}

func (t *Task) Cancel(deleteFile bool) {
	t.Pause()
	_ = deleteFile
}

