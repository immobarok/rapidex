package models

// ProgressEvent is emitted to the Wails frontend on a batched ticker (e.g. every 200ms).
type ProgressEvent struct {
	DownloadID string         `json:"downloadId"`
	Downloaded int64          `json:"downloaded"`
	TotalSize  int64          `json:"totalSize"`
	SpeedBps   int64          `json:"speedBps"`
	ETASeconds int64          `json:"etaSeconds"`
	Status     DownloadStatus `json:"status"`
	Chunks     []ChunkState   `json:"chunks"`
}

// ProgressBatchEvent bundles all active download progress updates into a single Wails event.
type ProgressBatchEvent struct {
	Tasks       []ProgressEvent `json:"tasks"`
	GlobalSpeed int64           `json:"globalSpeed"`
}

