package storage

import (
	"path/filepath"
	"strings"

	"rappidex/internal/models"
)

// CategoryRepo provides IDM's default categories and extension matching rules.
type CategoryRepo struct {
	items []models.Category
}

func NewCategoryRepo() *CategoryRepo {
	return &CategoryRepo{
		items: []models.Category{
			{ID: "compressed", Name: "Compressed", Extensions: []string{"zip", "rar", "7z", "tar", "gz", "bz2", "xz", "tgz"}, Icon: "archive"},
			{ID: "documents", Name: "Documents", Extensions: []string{"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "epub"}, Icon: "file-text"},
			{ID: "music", Name: "Music", Extensions: []string{"mp3", "flac", "wav", "aac", "ogg", "m4a", "opus"}, Icon: "music"},
			{ID: "programs", Name: "Programs", Extensions: []string{"exe", "msi", "dmg", "pkg", "deb", "rpm", "appimage", "iso", "apk"}, Icon: "box"},
			{ID: "video", Name: "Video", Extensions: []string{"mp4", "mkv", "webm", "avi", "mov", "flv", "ts", "m4v"}, Icon: "film"},
		},
	}
}

func (r *CategoryRepo) List() []models.Category {
	return r.items
}

func (r *CategoryRepo) ResolveCategory(fileName string) string {
	ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(fileName)), ".")
	if ext == "" {
		return "documents"
	}
	for _, cat := range r.items {
		for _, candidate := range cat.Extensions {
			if candidate == ext {
				return cat.ID
			}
		}
	}
	return "documents"
}
