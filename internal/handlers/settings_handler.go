package handlers

import (
	"rappidex/internal/engine"
	"rappidex/internal/storage"
)

// SettingsHandler manages bandwidth limits, proxy settings, default connections, and paths.
type SettingsHandler struct {
	db     *storage.Database
	engine *engine.Manager
}

func NewSettingsHandler(db *storage.Database, eng *engine.Manager) *SettingsHandler {
	return &SettingsHandler{db: db, engine: eng}
}

func (h *SettingsHandler) SetGlobalSpeedLimit(bytesPerSecond int64) {
	h.engine.SetSpeedLimit(bytesPerSecond)
}

