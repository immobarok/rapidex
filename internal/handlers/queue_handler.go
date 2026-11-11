package handlers

import (
	"rappidex/internal/models"
	"rappidex/internal/scheduler"
)

// QueueHandler exposes queue and schedule management to the Wails frontend.
type QueueHandler struct {
	scheduler *scheduler.Scheduler
}

func NewQueueHandler(sched *scheduler.Scheduler) *QueueHandler {
	return &QueueHandler{scheduler: sched}
}

func (h *QueueHandler) ListQueues() []models.QueueConfig {
	return h.scheduler.ListQueues()
}

func (h *QueueHandler) SaveQueue(q models.QueueConfig) (models.QueueConfig, error) {
	return h.scheduler.SaveQueue(q)
}

func (h *QueueHandler) DeleteQueue(id string) error {
	return h.scheduler.DeleteQueue(id)
}

func (h *QueueHandler) StartQueue(queueID string) error {
	return h.scheduler.StartQueue(queueID)
}

func (h *QueueHandler) StopQueue(queueID string) error {
	return h.scheduler.StopQueue(queueID)
}
