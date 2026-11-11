package models

// QueueSchedule describes when a queue starts and stops automatically.
type QueueSchedule struct {
	StartEnabled bool   `json:"startEnabled"`
	StartTime    string `json:"startTime"` // "HH:MM" (24h)
	StopEnabled  bool   `json:"stopEnabled"`
	StopTime     string `json:"stopTime"` // "HH:MM" (24h)
	Days         []int  `json:"days"`     // 0 = Sunday ... 6 = Saturday; empty = every day
}

// Queue "after done" actions.
const (
	AfterDoneNothing  = "nothing"
	AfterDoneExit     = "exit"
	AfterDoneSleep    = "sleep"
	AfterDoneShutdown = "shutdown"
)

// QueueConfig is a download queue (like IDM's "Main download queue").
type QueueConfig struct {
	ID            string        `json:"id"`
	Name          string        `json:"name"`
	MaxConcurrent int           `json:"maxConcurrent"` // files downloaded at the same time
	AfterDone     string        `json:"afterDone"`
	Schedule      QueueSchedule `json:"schedule"`
	Running       bool          `json:"running"`
	Builtin       bool          `json:"builtin"`
}
