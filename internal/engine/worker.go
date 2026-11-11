package engine

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"

	"rappidex/internal/models"
)

// Worker downloads a specific byte range [StartByte..EndByte] using HTTP Range requests.
type Worker struct {
	ID            int
	URL           string
	Headers       map[string]string
	AcceptRanges  bool
	GetChunk      func() *models.ChunkState
	ChunkMu       *sync.Mutex
	File          *os.File
	Limiter       *BandwidthLimiter
	Client        *http.Client
	OnBytesLoaded func(n int64)
}

func (w *Worker) Run(ctx context.Context) error {
	w.ChunkMu.Lock()
	ch := w.GetChunk()
	startPos := ch.CurrentPos
	endPos := ch.EndByte
	ch.Active = true
	w.ChunkMu.Unlock()

	defer func() {
		w.ChunkMu.Lock()
		w.GetChunk().Active = false
		w.ChunkMu.Unlock()
	}()

	if endPos > 0 && startPos > endPos {
		return nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, w.URL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
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
		return fmt.Errorf("server returned HTTP %s", resp.Status)
	}

	// If we requested a byte range beyond 0, but the server ignored Range and returned 200 OK from byte 0,
	// stop this secondary worker immediately so it doesn't corrupt the file offset.
	if w.AcceptRanges && startPos > 0 && resp.StatusCode == http.StatusOK {
		return nil
	}

	buf := make([]byte, 64*1024)
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			w.ChunkMu.Lock()
			chunk := w.GetChunk()
			curr := chunk.CurrentPos
			dynamicEnd := chunk.EndByte
			if dynamicEnd > 0 && curr+int64(n)-1 > dynamicEnd {
				allowed := dynamicEnd - curr + 1
				if allowed <= 0 {
					w.ChunkMu.Unlock()
					return nil
				}
				n = int(allowed)
			}
			chunk.CurrentPos += int64(n)
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
