package handlers

import (
	"rappidex/internal/engine"
	"rappidex/internal/models"
)

// DownloadHandler exposes download operations to the Wails frontend.
type DownloadHandler struct {
	engine *engine.Manager
}

func NewDownloadHandler(eng *engine.Manager) *DownloadHandler {
	return &DownloadHandler{engine: eng}
}

func (h *DownloadHandler) ProbeURL(url string, headers map[string]string) (*engine.ProbeResult, error) {
	return engine.Probe(url, headers)
}

func (h *DownloadHandler) AddDownload(url, savePath, fileName string, maxConns int, headers map[string]string) (*models.DownloadItem, error) {
	return h.engine.AddDownload(url, savePath, fileName, maxConns, headers)
}

func (h *DownloadHandler) PauseDownload(id string) error {
	return h.engine.Pause(id)
}

func (h *DownloadHandler) ResumeDownload(id string) error {
	return h.engine.Resume(id)
}

func (h *DownloadHandler) CancelDownload(id string, deleteFile bool) error {
	return h.engine.Cancel(id, deleteFile)
}

func (h *DownloadHandler) ListDownloads() []*models.DownloadItem {
	return h.engine.List()
}

