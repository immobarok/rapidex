package engine

import (
	"context"
	"fmt"
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
	cancel       context.CancelFunc
	bytesDelta   atomic.Int64
	downloaded   atomic.Int64
	onCheckpoint func()
}

func NewTask(item *models.DownloadItem, limiter *BandwidthLimiter, onCheckpoint func()) *Task {
	t := &Task{
		Item:         item,
		limiter:      limiter,
		onCheckpoint: onCheckpoint,
	}
	t.downloaded.Store(item.Downloaded)
	return t
}

// Snapshot returns a thread-safe deep copy of the DownloadItem and its chunks.
func (t *Task) Snapshot() *models.DownloadItem {
	t.mu.Lock()
	defer t.mu.Unlock()

	cp := *t.Item
	if len(t.Item.Chunks) > 0 {
		cp.Chunks = make([]models.ChunkState, len(t.Item.Chunks))
		copy(cp.Chunks, t.Item.Chunks)
	}
	return &cp
}

func (t *Task) Start() {
	t.mu.Lock()
	if t.Item.Status == models.StatusCompleted || t.Item.Status == models.StatusDownloading || t.Item.Status == models.StatusProbing {
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
	// 1. Always re-probe if TotalSize <= 1024 (e.g. a previous failed redirect/error page) or filename is empty
	t.mu.Lock()
	needProbe := t.Item.TotalSize <= 1024 || t.Item.FileName == ""
	rawURL := t.Item.URL
	headers := t.Item.Headers
	t.mu.Unlock()

	if needProbe {
		probe, err := Probe(rawURL, headers)
		if err != nil {
			t.fail(err)
			return
		}
		t.mu.Lock()
		if probe.URL != "" {
			t.Item.URL = probe.URL
		}
		if t.Item.FileName == "" {
			t.Item.FileName = probe.FileName
		}
		// Reset stale chunks if size changed
		if t.Item.TotalSize != probe.TotalSize {
			t.Item.Chunks = nil
		}
		t.Item.TotalSize = probe.TotalSize
		t.Item.AcceptRanges = probe.AcceptRanges
		t.mu.Unlock()
	}

	// 2. Ensure target directory and pre-allocate file
	t.mu.Lock()
	saveDir := t.Item.SavePath
	if saveDir == "" {
		saveDir = fileutil.DefaultDownloadDir()
		t.Item.SavePath = saveDir
	}
	fileName := t.Item.FileName
	totalSize := t.Item.TotalSize
	t.mu.Unlock()

	if err := os.MkdirAll(saveDir, 0o755); err != nil {
		t.fail(err)
		return
	}

	targetPath := filepath.Join(saveDir, fileName)
	file, err := AllocateFile(targetPath, totalSize)
	if err != nil {
		t.fail(err)
		return
	}
	defer file.Close()

	// 3. Initialize chunks if starting fresh, or recalculate downloaded bytes on resume
	t.mu.Lock()
	if len(t.Item.Chunks) == 0 {
		conns := t.Item.MaxConns
		if !t.Item.AcceptRanges || t.Item.TotalSize <= 0 {
			conns = 1
		}
		t.Item.Chunks = SplitInitial(t.Item.TotalSize, conns)
		t.downloaded.Store(0)
		t.Item.Downloaded = 0
	} else {
		var resumedBytes int64
		for i := range t.Item.Chunks {
			done := t.Item.Chunks[i].CurrentPos - t.Item.Chunks[i].StartByte
			if done > 0 {
				resumedBytes += done
			}
		}
		t.downloaded.Store(resumedBytes)
		t.Item.Downloaded = resumedBytes
	}
	t.Item.Status = models.StatusDownloading
	numChunks := len(t.Item.Chunks)
	t.mu.Unlock()

	if t.onCheckpoint != nil {
		t.onCheckpoint()
	}

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
				urlStr := t.Item.URL
				hdrs := t.Item.Headers
				acceptRanges := t.Item.AcceptRanges
				t.mu.Unlock()

				w := &Worker{
					ID:           idx,
					URL:          urlStr,
					Headers:      hdrs,
					AcceptRanges: acceptRanges,
					GetChunk: func() *models.ChunkState {
						return &t.Item.Chunks[idx]
					},
					ChunkMu: &t.mu,
					File:    file,
					Limiter: t.limiter,
					Client:  httpClient,
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
	downloadedNow := t.Item.Downloaded
	expectedSize := t.Item.TotalSize
	t.mu.Unlock()

	if downloadedNow == 0 && expectedSize > 0 {
		t.fail(fmt.Errorf("0 bytes received from server"))
		return
	}

	t.mu.Lock()
	now := time.Now()
	if t.Item.TotalSize > 0 {
		t.Item.Downloaded = t.Item.TotalSize
	} else {
		t.Item.TotalSize = t.Item.Downloaded
	}
	t.Item.Status = models.StatusCompleted
	t.Item.SpeedBps = 0
	t.Item.CompletedAt = &now
	t.mu.Unlock()

	if t.onCheckpoint != nil {
		t.onCheckpoint()
	}
}

func (t *Task) measureSpeed(ctx context.Context, done <-chan struct{}) {
	ticker := time.NewTicker(400 * time.Millisecond)
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
			t.Item.SpeedBps = int64(float64(delta) * 2.5) // 400ms window -> bytes/sec
			t.mu.Unlock()
		}
	}
}

func (t *Task) fail(err error) {
	t.mu.Lock()
	t.Item.Status = models.StatusFailed
	t.Item.SpeedBps = 0
	t.Item.ErrorMessage = err.Error()
	t.mu.Unlock()

	if t.onCheckpoint != nil {
		t.onCheckpoint()
	}
}

func (t *Task) Pause() {
	t.mu.Lock()
	if t.cancel != nil {
		t.cancel()
	}
	if t.Item.Status == models.StatusDownloading || t.Item.Status == models.StatusProbing || t.Item.Status == models.StatusQueued {
		t.Item.Status = models.StatusPaused
		t.Item.SpeedBps = 0
	}
	t.mu.Unlock()
}

func (t *Task) Cancel(deleteFile bool) {
	t.Pause()
	t.mu.Lock()
	fileName := t.Item.FileName
	saveDir := t.Item.SavePath
	t.mu.Unlock()

	if deleteFile && fileName != "" {
		if saveDir == "" {
			saveDir = fileutil.DefaultDownloadDir()
		}
		_ = os.Remove(filepath.Join(saveDir, fileName))
	}
}
