package models

import "time"

// QueueConfig represents an IDM-style download queue with scheduling and concurrency rules.
type QueueConfig struct {
	ID                string     `json:"id"`
	Name              string     `json:"name"`
	MaxConcurrent     int        `json:"maxConcurrent"`
	StartTime         *time.Time `json:"startTime,omitempty"`
	StopTime          *time.Time `json:"stopTime,omitempty"`
	RetryOnFail       int        `json:"retryOnFail"`
	ShutdownWhenDone  bool       `json:"shutdownWhenDone"`
}

