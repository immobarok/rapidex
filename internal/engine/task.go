package engine

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"rappidex/internal/engine/protocols"
	"rappidex/internal/models"
	"rappidex/internal/pkg/fileutil"
)

// Task manages the lifecycle, workers, and dynamic chunk splitting of a single download.
type Task struct {
	mu           sync.Mutex
	Item         *models.DownloadItem
	limiter      *BandwidthLimiter
	client       *protocols.HTTPClientWrapper
	cancel       context.CancelFunc
	bytesDelta   atomic.Int64
	downloaded   atomic.Int64
}

func NewTask(item *models.DownloadItem, limiter *BandwidthLimiter) *Task {
	t := &Task{
		Item:    item,
		limiter: limiter,
	}
	t.downloaded.Store(item.Downloaded)
	return t
}

func (t *Task) Start() {
	t.mu.Lock()
	if t.Item.Status == models.StatusCompleted {
		t.mu.Unlock()
		return
	}
	ctx, cancel := context.WithCancel(context.Background())
	t.cancel = cancel
	t.Item.Status = models.StatusProbing
	t.Item.ErrorMessage = ""
	t.mu.Unlock()

	go t.run(ctx)
}

func (t *Task) run(ctx context.Context) {
	// 1. Probe URL if metadata is not yet resolved
	if t.Item.TotalSize == 0 {
		probe, err := Probe(t.Item.URL, t.Item.Headers)
		if err != nil {
			t.fail(err)
			return
		}
		t.mu.Lock()
		if t.Item.FileName == "" {
			t.Item.FileName = probe.FileName
		}
		t.Item.TotalSize = probe.TotalSize
		t.Item.AcceptRanges = probe.AcceptRanges
		t.mu.Unlock()
	}

	// 2. Ensure target directory and pre-allocate file
	saveDir := t.Item.SavePath
	if saveDir == "" {
		saveDir = fileutil.DefaultDownloadDir()
	}
	if err := os.MkdirAll(saveDir, 0o755); err != nil {
		t.fail(err)
		return
	}

	targetPath := filepath.Join(saveDir, t.Item.FileName)
	file, err := AllocateFile(targetPath, t.Item.TotalSize)
	if err != nil {
		t.fail(err)
		return
	}
	defer file.Close()

	// 3. Initialize chunks if starting fresh
	t.mu.Lock()
	if len(t.Item.Chunks) == 0 {
		conns := t.Item.MaxConns
		if !t.Item.AcceptRanges || t.Item.TotalSize <= 0 {
			conns = 1
		}
		t.Item.Chunks = SplitInitial(t.Item.TotalSize, conns)
	}
	t.Item.Status = models.StatusDownloading
	numChunks := len(t.Item.Chunks)
	t.mu.Unlock()

	// 4. Start speed meter ticker
	speedDone := make(chan struct{})
	go t.measureSpeed(ctx, speedDone)
	defer close(speedDone)

	// 5. Launch concurrent HTTP Range workers + Dynamic Work Stealing
	httpClient := protocols.NewHTTPClient()
	var wg sync.WaitGroup
	var firstErr error
	var errOnce sync.Once

	spawnWorker := func(chunkIdx int) {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			for {
				t.mu.Lock()
				chunkPtr := &t.Item.Chunks[idx]
				t.mu.Unlock()

				w := &Worker{
					ID:           idx,
					URL:          t.Item.URL,
					Headers:      t.Item.Headers,
					AcceptRanges: t.Item.AcceptRanges,
					Chunk:        chunkPtr,
					ChunkMu:      &t.mu,
					File:         file,
					Limiter:      t.limiter,
					Client:       httpClient,
					OnBytesLoaded: func(n int64) {
						t.bytesDelta.Add(n)
						total := t.downloaded.Add(n)
						t.mu.Lock()
						t.Item.Downloaded = total
						t.mu.Unlock()
					},
				}

				if err := w.Run(ctx); err != nil {
					if ctx.Err() != nil {
						return
					}
					errOnce.Do(func() {
						firstErr = err
						t.cancel()
					})
					return
				}

				// Worker finished its segment! Attempt IDM-style dynamic work stealing
				t.mu.Lock()
				stolen := StealWork(t.Item.Chunks, len(t.Item.Chunks))
				if stolen == nil {
					t.mu.Unlock()
					return
				}
				t.Item.Chunks = append(t.Item.Chunks, *stolen)
				idx = len(t.Item.Chunks) - 1
				t.mu.Unlock()
			}
		}(chunkIdx)
	}

	for i := 0; i < numChunks; i++ {
		spawnWorker(i)
	}

	wg.Wait()

	if ctx.Err() != nil {
		return
	}
	if firstErr != nil {
		t.fail(firstErr)
		return
	}

	t.mu.Lock()
	now := time.Now()
	t.Item.Status = models.StatusCompleted
	t.Item.SpeedBps = 0
	t.Item.CompletedAt = &now
	t.mu.Unlock()
}

func (t *Task) measureSpeed(ctx context.Context, done <-chan struct{}) {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-done:
			return
		case <-ticker.C:
			delta := t.bytesDelta.Swap(0)
			t.mu.Lock()
			t.Item.SpeedBps = delta * 2 // 500ms window -> bytes per second
			t.mu.Unlock()
		}
	}
}

func (t *Task) fail(err error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.Item.Status = models.StatusFailed
	t.Item.SpeedBps = 0
	t.Item.ErrorMessage = err.Error()
}

func (t *Task) Pause() {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.cancel != nil {
		t.cancel()
	}
	if t.Item.Status == models.StatusDownloading || t.Item.Status == models.StatusProbing {
		t.Item.Status = models.StatusPaused
		t.Item.SpeedBps = 0
	}
}

func (t *Task) Cancel(deleteFile bool) {
	t.Pause()
	if deleteFile && t.Item.FileName != "" {
		saveDir := t.Item.SavePath
		if saveDir == "" {
			saveDir = fileutil.DefaultDownloadDir()
		}
		_ = os.Remove(filepath.Join(saveDir, t.Item.FileName))
	}
}
