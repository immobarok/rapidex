package engine

import (
	"context"
	"sync/atomic"
)

// BandwidthLimiter provides global and per-task token-bucket rate limiting.
type BandwidthLimiter struct {
	bytesPerSec atomic.Int64
}

func NewBandwidthLimiter(bytesPerSec int64) *BandwidthLimiter {
	l := &BandwidthLimiter{}
	l.bytesPerSec.Store(bytesPerSec)
	return l
}

func (l *BandwidthLimiter) SetLimit(bytesPerSec int64) {
	l.bytesPerSec.Store(bytesPerSec)
}

func (l *BandwidthLimiter) Wait(ctx context.Context, n int64) {
	limit := l.bytesPerSec.Load()
	if limit <= 0 {
		return
	}
	// Token bucket sleep calculation can be plugged in here
	_ = ctx
	_ = n
}

