package handlers

import "rappidex/internal/scheduler"

// QueueHandler exposes queue and schedule management to the Wails frontend.
type QueueHandler struct {
	scheduler *scheduler.Scheduler
}

func NewQueueHandler(sched *scheduler.Scheduler) *QueueHandler {
	return &QueueHandler{scheduler: sched}
}

func (h *QueueHandler) StartQueue(queueID string) error {
	return h.scheduler.StartQueue(queueID)
}

func (h *QueueHandler) StopQueue(queueID string) error {
	return h.scheduler.StopQueue(queueID)
}

