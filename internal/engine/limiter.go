package engine

import (
	"context"
	"sync"
	"sync/atomic"
	"time"
)

// BandwidthLimiter provides global token-bucket rate limiting across all active workers.
type BandwidthLimiter struct {
	bytesPerSec atomic.Int64
	mu          sync.Mutex
	nextFree    time.Time
}

func NewBandwidthLimiter(bytesPerSec int64) *BandwidthLimiter {
	l := &BandwidthLimiter{
		nextFree: time.Now(),
	}
	l.bytesPerSec.Store(bytesPerSec)
	return l
}

func (l *BandwidthLimiter) SetLimit(bytesPerSec int64) {
	l.bytesPerSec.Store(bytesPerSec)
}

func (l *BandwidthLimiter) GetLimit() int64 {
	return l.bytesPerSec.Load()
}

func (l *BandwidthLimiter) Wait(ctx context.Context, n int64) {
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
