package engine

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"

	"rappidex/internal/models"
)

// Worker downloads a specific byte range [StartByte..EndByte] using HTTP Range requests.
type Worker struct {
	ID      int
	URL     string
	Headers map[string]string
	Chunk   *models.ChunkState
	File    *os.File
	Limiter *BandwidthLimiter
}

func (w *Worker) Run(ctx context.Context) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, w.URL, nil)
	if err != nil {
		return err
	}
	for k, v := range w.Headers {
		req.Header.Set(k, v)
	}
	req.Header.Set("Range", fmt.Sprintf("bytes=%d-%d", w.Chunk.CurrentPos, w.Chunk.EndByte))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	buf := make([]byte, 32*1024)
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			w.Limiter.Wait(ctx, int64(n))
			if _, writeErr := w.File.WriteAt(buf[:n], w.Chunk.CurrentPos); writeErr != nil {
				return writeErr
			}
			w.Chunk.CurrentPos += int64(n)
		}
		if readErr == io.EOF {
			return nil
		}
		if readErr != nil {
			return readErr
		}
	}
}

