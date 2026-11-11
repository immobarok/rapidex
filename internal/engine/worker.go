package engine

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"os"
	"sync"
	"sync/atomic"
	"time"

	"rappidex/internal/models"
)

// Worker downloads one part of the file over its own HTTP connection.
// Bytes are written to disk first; the part's CurrentPos is only advanced afterwards,
// so the saved progress never claims bytes that are not on disk (safe resume after a crash).
type Worker struct {
	URL          string
	Headers      map[string]string
	UseRange     bool
	Client       *http.Client
	File         *os.File
	Mu           *sync.Mutex
	Chunk        func() *models.ChunkState // must be called with Mu held
	Limiters     []*BandwidthLimiter
	OnBytes      func(n int64)
	StallTimeout time.Duration
}

func (w *Worker) Run(parent context.Context) error {
	w.Mu.Lock()
	ch := w.Chunk()
	start := ch.CurrentPos
	end := ch.EndByte
	w.Mu.Unlock()

	if end >= 0 && start > end {
		return nil
	}

	ctx, cancel := context.WithCancel(parent)
	defer cancel()

	stallTimeout := w.StallTimeout
	if stallTimeout <= 0 {
		stallTimeout = 30 * time.Second
	}
	var stalled atomic.Bool
	watchdog := time.AfterFunc(stallTimeout, func() {
		stalled.Store(true)
		cancel()
	})
	defer watchdog.Stop()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, w.URL, nil)
	if err != nil {
		return err
	}
	applyHeaders(req, w.Headers)
	if w.UseRange {
		if end >= 0 {
			req.Header.Set("Range", fmt.Sprintf("bytes=%d-%d", start, end))
		} else if start > 0 {
			req.Header.Set("Range", fmt.Sprintf("bytes=%d-", start))
		}
	}

	resp, err := w.Client.Do(req)
	if err != nil {
		if stalled.Load() {
			return errStalled
		}
		return err
	}
	defer resp.Body.Close()

	switch resp.StatusCode {
	case http.StatusPartialContent:
		if s, _, ok := parseContentRange(resp.Header.Get("Content-Range")); ok && s != start {
			return fmt.Errorf("server returned the wrong part of the file (asked for byte %d, got %d)", start, s)
		}
	case http.StatusOK:
		if start > 0 {
			// The server is sending the whole file from byte 0: we must not write it at our offset.
			return errRangeIgnored
		}
	case http.StatusRequestedRangeNotSatisfiable:
		if end >= 0 {
			return nil // nothing left for this part
		}
		return &HTTPStatusError{Code: resp.StatusCode}
	default:
		return &HTTPStatusError{Code: resp.StatusCode}
	}

	buf := make([]byte, 64*1024)
	pos := start
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			watchdog.Reset(stallTimeout)

			// The part may have been shortened by work stealing; never write past its end.
			w.Mu.Lock()
			curEnd := w.Chunk().EndByte
			w.Mu.Unlock()
			if curEnd >= 0 && pos+int64(n)-1 > curEnd {
				n = int(curEnd - pos + 1)
				if n <= 0 {
					return nil
				}
			}

			for _, l := range w.Limiters {
				l.Wait(ctx, int64(n))
			}
			if ctx.Err() != nil {
				if stalled.Load() {
					return errStalled
				}
				return ctx.Err()
			}

			if _, err := w.File.WriteAt(buf[:n], pos); err != nil {
				return fmt.Errorf("could not write to disk: %w", err)
			}
			pos += int64(n)

			w.Mu.Lock()
			c := w.Chunk()
			newPos := pos
			if c.EndByte >= 0 && newPos > c.EndByte+1 {
				newPos = c.EndByte + 1
			}
			if newPos > c.CurrentPos {
				c.CurrentPos = newPos
			}
			done := c.Done()
			w.Mu.Unlock()

			if w.OnBytes != nil {
				w.OnBytes(int64(n))
			}
			if done {
				return nil
			}
		}

		if readErr == io.EOF {
			w.Mu.Lock()
			c := w.Chunk()
			incomplete := c.EndByte >= 0 && !c.Done()
			w.Mu.Unlock()
			if incomplete {
				return io.ErrUnexpectedEOF
			}
			return nil
		}
		if readErr != nil {
			if stalled.Load() {
				return errStalled
			}
			return readErr
		}
	}
}
