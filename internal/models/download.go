package models

import "time"

type DownloadStatus string

const (
	StatusQueued      DownloadStatus = "queued"
	StatusProbing     DownloadStatus = "probing"
	StatusDownloading DownloadStatus = "downloading"
	StatusPaused      DownloadStatus = "paused"
	StatusMerging     DownloadStatus = "merging"
	StatusCompleted   DownloadStatus = "completed"
	StatusFailed      DownloadStatus = "failed"
)

// ChunkState tracks an individual byte range assigned to a worker goroutine.
type ChunkState struct {
	ID         int   `json:"id"`
	StartByte  int64 `json:"startByte"`
	CurrentPos int64 `json:"currentPos"`
	EndByte    int64 `json:"endByte"`
	Active     bool  `json:"active"`
}

// DownloadItem represents a single download task in Rappidex.
type DownloadItem struct {
	ID            string            `json:"id"`
	URL           string            `json:"url"`
	FileName      string            `json:"fileName"`
	SavePath      string            `json:"savePath"`
	CategoryID    string            `json:"categoryId"`
	QueueID       string            `json:"queueId"`
	TotalSize     int64             `json:"totalSize"`
	Downloaded    int64             `json:"downloaded"`
	SpeedBps      int64             `json:"speedBps"`
	AcceptRanges  bool              `json:"acceptRanges"`
	Status        DownloadStatus    `json:"status"`
	MaxConns      int               `json:"maxConns"`
	Chunks        []ChunkState      `json:"chunks"`
	Headers       map[string]string `json:"headers,omitempty"`
	ErrorMessage  string            `json:"errorMessage,omitempty"`
	CreatedAt     time.Time         `json:"createdAt"`
	CompletedAt   *time.Time        `json:"completedAt,omitempty"`
}

