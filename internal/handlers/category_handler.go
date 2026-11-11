package handlers

import (
	"rappidex/internal/models"
	"rappidex/internal/storage"
)

// CategoryHandler manages IDM file categories (Video, Music, Compressed, Documents, Programs).
type CategoryHandler struct {
	db *storage.Database
}

func NewCategoryHandler(db *storage.Database) *CategoryHandler {
	return &CategoryHandler{db: db}
}

func (h *CategoryHandler) GetCategories() []models.Category {
	return h.db.Categories().List()
}

