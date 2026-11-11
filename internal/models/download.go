package models

import "time"

type DownloadStatus string

const (
	StatusQueued      DownloadStatus = "queued"      // waiting (not started, or waiting in a queue)
	StatusProbing     DownloadStatus = "probing"     // connecting / reading file information
	StatusDownloading DownloadStatus = "downloading" // receiving data
	StatusPaused      DownloadStatus = "paused"      // stopped by the user, can be resumed
	StatusCompleted   DownloadStatus = "completed"   // finished and moved to its final name
	StatusFailed      DownloadStatus = "failed"      // stopped because of an error
)

// ChunkState tracks one part of the file that is downloaded by its own connection.
type ChunkState struct {
	ID         int    `json:"id"`
	StartByte  int64  `json:"startByte"`
	CurrentPos int64  `json:"currentPos"` // next byte to write (everything before it is on disk)
	EndByte    int64  `json:"endByte"`    // inclusive; -1 when the total size is unknown
	Active     bool   `json:"active"`     // a connection is currently working on this part
	Retries    int    `json:"retries"`
	Info       string `json:"info"`
}

// Done reports whether every byte of this part has been written.
func (c ChunkState) Done() bool {
	return c.EndByte >= 0 && c.CurrentPos > c.EndByte
}

// DownloadItem represents a single download in the list.
type DownloadItem struct {
	ID            string            `json:"id"`
	URL           string            `json:"url"`         // resolved (final) address used for data transfer
	OriginalURL   string            `json:"originalUrl"` // address the user entered; re-resolved on every start
	FileName      string            `json:"fileName"`
	SavePath      string            `json:"savePath"`
	CategoryID    string            `json:"categoryId"`
	QueueID       string            `json:"queueId"`
	QueuePosition int               `json:"queuePosition"`
	Description   string            `json:"description"`
	Referer       string            `json:"referer"`
	TotalSize     int64             `json:"totalSize"` // -1 or 0 when unknown
	Downloaded    int64             `json:"downloaded"`
	SpeedBps      int64             `json:"speedBps"`
	SpeedLimitBps int64             `json:"speedLimitBps"` // per-download limit, 0 = unlimited
	AcceptRanges  bool              `json:"acceptRanges"`  // server supports resume / multi-part
	Status        DownloadStatus    `json:"status"`
	MaxConns      int               `json:"maxConns"`
	Chunks        []ChunkState      `json:"chunks"`
	Headers       map[string]string `json:"headers,omitempty"`
	ErrorMessage  string            `json:"errorMessage,omitempty"`
	CreatedAt     time.Time         `json:"createdAt"`
	LastTryAt     *time.Time        `json:"lastTryAt,omitempty"`
	CompletedAt   *time.Time        `json:"completedAt,omitempty"`
}
