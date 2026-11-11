package engine

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"sync/atomic"
	"time"

	"rappidex/internal/engine/protocols"
	"rappidex/internal/models"
	"rappidex/internal/pkg/fileutil"
	"rappidex/internal/storage"
)

// Task manages the lifecycle, retries, temporary .rpdx file, workers, and dynamic chunk splitting of a download.
type Task struct {
	mu           sync.Mutex
	Item         *models.DownloadItem
	globalLimit  *BandwidthLimiter
	taskLimit    *BandwidthLimiter
	getSettings  func() storage.AppSettings
	cancel       context.CancelFunc
	bytesDelta   atomic.Int64
	onCheckpoint func()
	onComplete   func(item *models.DownloadItem)
}

func NewTask(
	item *models.DownloadItem,
	globalLimit *BandwidthLimiter,
	getSettings func() storage.AppSettings,
	onCheckpoint func(),
	onComplete func(item *models.DownloadItem),
) *Task {
	return &Task{
		Item:         item,
		globalLimit:  globalLimit,
		taskLimit:    NewBandwidthLimiter(item.SpeedLimitBps),
		getSettings:  getSettings,
		onCheckpoint: onCheckpoint,
		onComplete:   onComplete,
	}
}

func (t *Task) SetTaskSpeedLimit(bps int64) {
	t.mu.Lock()
	t.Item.SpeedLimitBps = bps
	t.mu.Unlock()
	t.taskLimit.SetLimit(bps)
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
	now := time.Now()
	t.Item.LastTryAt = &now
	t.Item.Status = models.StatusProbing
	t.Item.ErrorMessage = ""
	t.mu.Unlock()

	go t.run(ctx)
}

func (t *Task) run(ctx context.Context) {
	settings := t.getSettings()
	httpClient := protocols.NewHTTPClient(settings.Proxy.Mode, settings.Proxy.URL)

	// 1. Prepare headers (including Site Logins and Referer if configured)
	t.mu.Lock()
	if t.Item.OriginalURL == "" {
		t.Item.OriginalURL = t.Item.URL
	}
	rawURL := t.Item.OriginalURL
	if !protocols.IsYouTubeURL(rawURL) && t.Item.URL != "" {
		rawURL = t.Item.URL
	}
	hdrs := copyHeaders(t.Item.Headers)
	if t.Item.Referer != "" && hdrs["Referer"] == "" {
		hdrs["Referer"] = t.Item.Referer
	}
	if login, ok := settings.MatchLogin(rawURL); ok && hdrs["Authorization"] == "" {
		token := base64.StdEncoding.EncodeToString([]byte(login.Username + ":" + login.Password))
		hdrs["Authorization"] = "Basic " + token
	}
	needProbe := t.Item.TotalSize <= 0 || t.Item.FileName == "" || protocols.IsYouTubeURL(rawURL)
	t.mu.Unlock()

	if needProbe {
		probe, err := Probe(ctx, httpClient, rawURL, hdrs)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
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
		if t.Item.TotalSize > 0 && probe.TotalSize > 0 && t.Item.TotalSize != probe.TotalSize {
			t.Item.Chunks = nil // Size changed on server; restart cleanly
		}
		t.Item.TotalSize = probe.TotalSize
		t.Item.AcceptRanges = probe.AcceptRanges
		t.mu.Unlock()
	}

	// 2. Open temporary .rpdx part file
	t.mu.Lock()
	saveDir := t.Item.SavePath
	if saveDir == "" {
		saveDir = fileutil.DefaultDownloadDir()
		t.Item.SavePath = saveDir
	}
	fileName := t.Item.FileName
	totalSize := t.Item.TotalSize
	fresh := len(t.Item.Chunks) == 0
	t.mu.Unlock()

	if err := os.MkdirAll(saveDir, 0o755); err != nil {
		t.fail(err)
		return
	}

	finalPath := filepath.Join(saveDir, fileName)
	partPath := PartPath(finalPath)

	// If resuming, verify the .rpdx file still exists on disk; otherwise start fresh
	if !fresh {
		if _, statErr := os.Stat(partPath); statErr != nil {
			fresh = true
		}
	}

	file, err := OpenPartFile(partPath, totalSize, fresh)
	if err != nil {
		t.fail(err)
		return
	}
	defer file.Close()

	// 3. Initialize or restore chunks
	t.mu.Lock()
	if fresh {
		conns := t.Item.MaxConns
		if !t.Item.AcceptRanges || t.Item.TotalSize <= 0 {
			conns = 1
		}
		t.Item.Chunks = SplitInitial(t.Item.TotalSize, conns)
		t.Item.Downloaded = 0
	} else {
		t.recalcDownloadedLocked()
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

	// 5. Launch workers with per-chunk retry and IDM-style dynamic work stealing
	var wg sync.WaitGroup
	var firstErr error
	var errOnce sync.Once

	maxRetries := settings.MaxRetries
	retryDelay := time.Duration(max(1, settings.RetryDelaySec)) * time.Second

	spawnWorker := func(chunkIdx int) {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			for {
				t.mu.Lock()
				if idx < 0 || idx >= len(t.Item.Chunks) {
					t.mu.Unlock()
					return
				}
				if t.Item.Chunks[idx].Done() {
					// Already done; try to steal work from largest active part
					stolen := StealWork(t.Item.Chunks, len(t.Item.Chunks))
					if stolen == nil {
						t.mu.Unlock()
						return
					}
					t.Item.Chunks = append(t.Item.Chunks, *stolen)
					idx = len(t.Item.Chunks) - 1
				}
				t.Item.Chunks[idx].Active = true
				t.Item.Chunks[idx].Info = "Receiving data..."
				urlStr := t.Item.URL
				useRange := t.Item.AcceptRanges
				t.mu.Unlock()

				var runErr error
				for attempt := 0; attempt <= maxRetries; attempt++ {
					w := &Worker{
						URL:      urlStr,
						Headers:  hdrs,
						UseRange: useRange,
						Client:   httpClient,
						File:     file,
						Mu:       &t.mu,
						Chunk: func() *models.ChunkState {
							return &t.Item.Chunks[idx]
						},
						Limiters: []*BandwidthLimiter{t.globalLimit, t.taskLimit},
						OnBytes: func(n int64) {
							t.bytesDelta.Add(n)
							t.mu.Lock()
							t.recalcDownloadedLocked()
							t.mu.Unlock()
						},
					}

					runErr = w.Run(ctx)
					if runErr == nil || ctx.Err() != nil {
						break
					}

					// If server ignored Range on a secondary worker, stop this worker cleanly and let part 0 finish
					if errors.Is(runErr, errRangeIgnored) {
						t.mu.Lock()
						t.Item.AcceptRanges = false
						t.Item.Chunks[idx].Active = false
						t.Item.Chunks[idx].Info = "Server does not support multi-part"
						t.mu.Unlock()
						return
					}

					var statusErr *HTTPStatusError
					if errors.As(runErr, &statusErr) && !statusErr.Retryable() {
						break
					}

					t.mu.Lock()
					t.Item.Chunks[idx].Retries = attempt + 1
					t.Item.Chunks[idx].Info = fmt.Sprintf("Retrying (%d/%d)...", attempt+1, maxRetries)
					t.mu.Unlock()

					select {
					case <-ctx.Done():
						return
					case <-time.After(retryDelay):
					}
				}

				t.mu.Lock()
				t.Item.Chunks[idx].Active = false
				if runErr == nil {
					t.Item.Chunks[idx].Info = "Completed"
				}
				t.mu.Unlock()

				if runErr != nil {
					if ctx.Err() != nil {
						return
					}
					errOnce.Do(func() {
						firstErr = runErr
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

	// 6. Strict completion verification: ensure all parts reached their EndByte
	t.mu.Lock()
	t.recalcDownloadedLocked()
	downloadedNow := t.Item.Downloaded
	expectedSize := t.Item.TotalSize
	allDone := true
	for _, c := range t.Item.Chunks {
		if c.EndByte >= 0 && !c.Done() {
			allDone = false
			break
		}
	}
	t.mu.Unlock()

	if !allDone || (expectedSize > 0 && downloadedNow < expectedSize) || (expectedSize <= 0 && downloadedNow == 0) {
		t.fail(fmt.Errorf("download incomplete (%d of %d bytes received)", downloadedNow, expectedSize))
		return
	}

	_ = file.Sync()
	_ = file.Close()

	// 7. Rename temporary .rpdx file to final filename (with auto-rename if duplicate exists)
	finalSavedPath, err := FinalizeFile(partPath, finalPath, settings.DuplicateAction == "overwrite")
	if err != nil {
		t.fail(err)
		return
	}

	t.mu.Lock()
	now := time.Now()
	t.Item.FileName = filepath.Base(finalSavedPath)
	t.Item.SavePath = filepath.Dir(finalSavedPath)
	if t.Item.TotalSize <= 0 {
		t.Item.TotalSize = t.Item.Downloaded
	}
	t.Item.Status = models.StatusCompleted
	t.Item.SpeedBps = 0
	t.Item.CompletedAt = &now
	snap := *t.Item
	t.mu.Unlock()

	if t.onCheckpoint != nil {
		t.onCheckpoint()
	}
	if t.onComplete != nil {
		t.onComplete(&snap)
	}
}

func (t *Task) recalcDownloadedLocked() {
	var sum int64
	for _, c := range t.Item.Chunks {
		done := c.CurrentPos - c.StartByte
		if c.EndByte >= 0 && done > (c.EndByte-c.StartByte+1) {
			done = c.EndByte - c.StartByte + 1
		}
		if done > 0 {
			sum += done
		}
	}
	t.Item.Downloaded = sum
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
			t.Item.SpeedBps = int64(float64(delta) * 2.5)
			t.mu.Unlock()
		}
	}
}

func (t *Task) fail(err error) {
	t.mu.Lock()
	for i := range t.Item.Chunks {
		t.Item.Chunks[i].Active = false
	}
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
	for i := range t.Item.Chunks {
		t.Item.Chunks[i].Active = false
		if !t.Item.Chunks[i].Done() {
			t.Item.Chunks[i].Info = "Paused"
		}
	}
	if t.Item.Status == models.StatusDownloading || t.Item.Status == models.StatusProbing || t.Item.Status == models.StatusQueued {
		t.Item.Status = models.StatusPaused
		t.Item.SpeedBps = 0
	}
	t.mu.Unlock()
}

// RefreshURL updates the download address (IDM's "Refresh Download Address" for expired links) while keeping progress.
func (t *Task) RefreshURL(newURL string) {
	t.mu.Lock()
	t.Item.URL = newURL
	t.Item.OriginalURL = newURL
	t.Item.ErrorMessage = ""
	t.mu.Unlock()
}

func (t *Task) Cancel(deleteFile bool) {
	t.Pause()
	t.mu.Lock()
	fileName := t.Item.FileName
	saveDir := t.Item.SavePath
	t.mu.Unlock()

	if saveDir == "" {
		saveDir = fileutil.DefaultDownloadDir()
	}
	if fileName != "" {
		finalPath := filepath.Join(saveDir, fileName)
		_ = os.Remove(PartPath(finalPath))
		if deleteFile {
			_ = os.Remove(finalPath)
		}
	}
}
