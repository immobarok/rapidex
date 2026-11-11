package handlers

import (
	"rappidex/internal/engine"
	"rappidex/internal/storage"
)

// SettingsHandler manages bandwidth limits, default connections, and save paths.
type SettingsHandler struct {
	db     *storage.Database
	engine *engine.Manager
}

func NewSettingsHandler(db *storage.Database, eng *engine.Manager) *SettingsHandler {
	return &SettingsHandler{db: db, engine: eng}
}

func (h *SettingsHandler) GetSettings() storage.AppSettings {
	return h.db.Settings().Get()
}

func (h *SettingsHandler) UpdateSettings(s storage.AppSettings) error {
	if err := h.db.Settings().Update(s); err != nil {
		return err
	}
	h.engine.SetSpeedLimit(s.SpeedLimitBps)
	return nil
}

func (h *SettingsHandler) SetGlobalSpeedLimit(bytesPerSecond int64) {
	h.engine.SetSpeedLimit(bytesPerSecond)
}
