package engine

import (
	"context"
	"sync"
	"sync/atomic"
	"time"
)

// BandwidthLimiter is a token-bucket rate limiter shared by all connections it is given to.
type BandwidthLimiter struct {
	bytesPerSec atomic.Int64
	mu          sync.Mutex
	nextFree    time.Time
}

func NewBandwidthLimiter(bytesPerSec int64) *BandwidthLimiter {
	l := &BandwidthLimiter{nextFree: time.Now()}
	l.bytesPerSec.Store(bytesPerSec)
	return l
}

func (l *BandwidthLimiter) SetLimit(bytesPerSec int64) {
	if l == nil {
		return
	}
	if bytesPerSec < 0 {
		bytesPerSec = 0
	}
	l.bytesPerSec.Store(bytesPerSec)
}

func (l *BandwidthLimiter) GetLimit() int64 {
	if l == nil {
		return 0
	}
	return l.bytesPerSec.Load()
}

// Wait blocks long enough to keep the average rate under the limit.
func (l *BandwidthLimiter) Wait(ctx context.Context, n int64) {
	if l == nil {
		return
	}
	limit := l.bytesPerSec.Load()
	if limit <= 0 || n <= 0 {
		return
	}

	l.mu.Lock()
	now := time.Now()
	if l.nextFree.Before(now) {
		l.nextFree = now
	}
	duration := time.Duration(float64(n) / float64(limit) * float64(time.Second))
	waitDuration := l.nextFree.Sub(now)
	l.nextFree = l.nextFree.Add(duration)
	l.mu.Unlock()

	if waitDuration > 0 {
		timer := time.NewTimer(waitDuration)
		defer timer.Stop()
		select {
		case <-ctx.Done():
		case <-timer.C:
		}
	}
}
