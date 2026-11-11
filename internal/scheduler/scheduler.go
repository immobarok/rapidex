package scheduler

import (
	"context"
	"sync"
	"time"

	"rappidex/internal/engine"
	"rappidex/internal/models"
	"rappidex/internal/storage"
)

// Scheduler manages IDM-style download queues, concurrency caps, and timed start/stop rules.
type Scheduler struct {
	mu     sync.Mutex
	engine *engine.Manager
	db     *storage.Database
}

func NewScheduler(eng *engine.Manager, db *storage.Database) *Scheduler {
	return &Scheduler{engine: eng, db: db}
}

func (s *Scheduler) Start(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			s.tick(now)
		}
	}
}

func (s *Scheduler) tick(now time.Time) {
	queues := s.db.Queues().List()
	currentHM := now.Format("15:04")

	for _, q := range queues {
		if q.Schedule.StartEnabled && q.Schedule.StartTime == currentHM && !q.Running {
			_ = s.StartQueue(q.ID)
		}
		if q.Schedule.StopEnabled && q.Schedule.StopTime == currentHM && q.Running {
			_ = s.StopQueue(q.ID)
		}
		if q.Running {
			s.pumpQueue(q)
		}
	}
}

func (s *Scheduler) pumpQueue(q models.QueueConfig) {
	items := s.engine.List()
	activeInQueue := 0
	var waiting []*models.DownloadItem

	for _, item := range items {
		if item.QueueID != q.ID {
			continue
		}
		if item.Status == models.StatusDownloading || item.Status == models.StatusProbing {
			activeInQueue++
		} else if item.Status == models.StatusQueued {
			waiting = append(waiting, item)
		}
	}

	// Start queued downloads up to MaxConcurrent
	for activeInQueue < q.MaxConcurrent && len(waiting) > 0 {
		next := waiting[len(waiting)-1]
		waiting = waiting[:len(waiting)-1]
		_ = s.engine.Resume(next.ID)
		activeInQueue++
	}

	// If no active and no waiting items remain, stop the queue
	if activeInQueue == 0 && len(waiting) == 0 {
		_ = s.db.Queues().SetRunning(q.ID, false)
	}
}

func (s *Scheduler) ListQueues() []models.QueueConfig {
	return s.db.Queues().List()
}

func (s *Scheduler) SaveQueue(q models.QueueConfig) (models.QueueConfig, error) {
	return s.db.Queues().Save(q)
}

func (s *Scheduler) DeleteQueue(id string) error {
	return s.db.Queues().Delete(id)
}

func (s *Scheduler) StartQueue(queueID string) error {
	if err := s.db.Queues().SetRunning(queueID, true); err != nil {
		return err
	}
	if q, ok := s.db.Queues().Get(queueID); ok {
		s.pumpQueue(q)
	}
	return nil
}

func (s *Scheduler) StopQueue(queueID string) error {
	if err := s.db.Queues().SetRunning(queueID, false); err != nil {
		return err
	}
	for _, item := range s.engine.List() {
		if item.QueueID == queueID && (item.Status == models.StatusDownloading || item.Status == models.StatusProbing) {
			_ = s.engine.Pause(item.ID)
		}
	}
	return nil
}
