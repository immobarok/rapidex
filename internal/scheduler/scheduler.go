package scheduler

import (
	"rappidex/internal/engine"
	"rappidex/internal/storage"
)

type Scheduler struct {
	engine *engine.Manager
	db     *storage.Database
}

func NewScheduler(eng *engine.Manager, db *storage.Database) *Scheduler {
	return &Scheduler{engine: eng, db: db}
}

func (s *Scheduler) StartQueue(queueID string) error {
	_ = queueID
	return nil
}

func (s *Scheduler) StopQueue(queueID string) error {
	_ = queueID
	return nil
}
