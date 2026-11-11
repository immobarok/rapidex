package engine

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"sync/atomic"

	"rappidex/internal/models"
)

// Worker downloads a specific byte range [StartByte..EndByte] using HTTP Range requests.
type Worker struct {
	ID            int
	URL           string
	Headers       map[string]string
	AcceptRanges  bool
	Chunk         *models.ChunkState
	ChunkMu       *sync.Mutex
	File          *os.File
	Limiter       *BandwidthLimiter
	Client        *http.Client
	OnBytesLoaded func(n int64)
}

func (w *Worker) Run(ctx context.Context) error {
	w.ChunkMu.Lock()
	startPos := w.Chunk.CurrentPos
	endPos := w.Chunk.EndByte
	w.Chunk.Active = true
	w.ChunkMu.Unlock()

	defer func() {
		w.ChunkMu.Lock()
		w.Chunk.Active = false
		w.ChunkMu.Unlock()
	}()

	if endPos > 0 && startPos > endPos {
		return nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, w.URL, nil)
	if err != nil {
		return err
	}
	for k, v := range w.Headers {
		req.Header.Set(k, v)
	}

	if w.AcceptRanges && endPos > 0 {
		req.Header.Set("Range", fmt.Sprintf("bytes=%d-%d", startPos, endPos))
	}

	client := w.Client
	if client == nil {
		client = http.DefaultClient
	}

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusPartialContent {
		return fmt.Errorf("unexpected HTTP status: %s", resp.Status)
	}

	buf := make([]byte, 32*1024)
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			w.ChunkMu.Lock()
			curr := w.Chunk.CurrentPos
			dynamicEnd := w.Chunk.EndByte
			if dynamicEnd > 0 && curr+int64(n)-1 > dynamicEnd {
				allowed := dynamicEnd - curr + 1
				if allowed <= 0 {
					w.ChunkMu.Unlock()
					return nil
				}
				n = int(allowed)
			}
			w.Chunk.CurrentPos += int64(n)
			w.ChunkMu.Unlock()

			if w.Limiter != nil {
				w.Limiter.Wait(ctx, int64(n))
			}

			if _, writeErr := w.File.WriteAt(buf[:n], curr); writeErr != nil {
				return writeErr
			}

			if w.OnBytesLoaded != nil {
				w.OnBytesLoaded(int64(n))
			}

			if dynamicEnd > 0 && curr+int64(n)-1 >= dynamicEnd {
				return nil
			}
		}

		if readErr == io.EOF {
			return nil
		}
		if readErr != nil {
			return readErr
		}
	}
}

// AtomicCounter helps track real-time speed across workers.
type AtomicCounter struct {
	val atomic.Int64
}
