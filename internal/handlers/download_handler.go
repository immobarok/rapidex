package handlers

import (
	"rappidex/internal/engine"
	"rappidex/internal/models"
)

// DownloadHandler exposes all IDM download operations to the Wails frontend.
type DownloadHandler struct {
	engine *engine.Manager
}

func NewDownloadHandler(eng *engine.Manager) *DownloadHandler {
	return &DownloadHandler{engine: eng}
}

func (h *DownloadHandler) ProbeURL(url string, headers map[string]string) (*engine.ProbeResult, error) {
	return h.engine.ProbeURL(url, headers)
}

func (h *DownloadHandler) AddDownload(url, savePath, fileName string, maxConns int, headers map[string]string) (*models.DownloadItem, error) {
	return h.engine.AddDownload(url, savePath, fileName, maxConns, headers)
}

func (h *DownloadHandler) AddDownloadWithOptions(opts engine.AddDownloadOptions) (*models.DownloadItem, error) {
	return h.engine.AddDownloadWithOptions(opts)
}

func (h *DownloadHandler) AddBatchDownloads(opts engine.BatchOptions) ([]*models.DownloadItem, error) {
	return h.engine.AddBatchDownloads(opts)
}

func (h *DownloadHandler) PauseDownload(id string) error {
	return h.engine.Pause(id)
}

func (h *DownloadHandler) ResumeDownload(id string) error {
	return h.engine.Resume(id)
}

func (h *DownloadHandler) RefreshDownloadURL(id, newURL string) error {
	return h.engine.RefreshDownloadURL(id, newURL)
}

func (h *DownloadHandler) SetTaskSpeedLimit(id string, bytesPerSec int64) error {
	return h.engine.SetTaskSpeedLimit(id, bytesPerSec)
}

func (h *DownloadHandler) PauseAll() {
	h.engine.PauseAll()
}

func (h *DownloadHandler) ResumeAll() {
	h.engine.ResumeAll()
}

func (h *DownloadHandler) CancelDownload(id string, deleteFile bool) error {
	return h.engine.Cancel(id, deleteFile)
}

func (h *DownloadHandler) DeleteCompleted() int {
	return h.engine.DeleteCompleted()
}

func (h *DownloadHandler) ListDownloads() []*models.DownloadItem {
	return h.engine.List()
}

func (h *DownloadHandler) OpenFile(id string) error {
	return h.engine.OpenFile(id)
}

func (h *DownloadHandler) OpenFileLocation(id string) error {
	return h.engine.OpenFileLocation(id)
}
