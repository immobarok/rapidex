package storage

import "rappidex/internal/models"

// CategoryRepo provides IDM's default categories and extension matching rules.
type CategoryRepo struct {
	items []models.Category
}

func NewCategoryRepo() *CategoryRepo {
	return &CategoryRepo{
		items: []models.Category{
			{ID: "compressed", Name: "Compressed", Extensions: []string{"zip", "rar", "7z", "tar", "gz", "bz2"}, Icon: "archive"},
			{ID: "documents", Name: "Documents", Extensions: []string{"pdf", "doc", "docx", "xls", "xlsx", "ppt", "txt"}, Icon: "file-text"},
			{ID: "music", Name: "Music", Extensions: []string{"mp3", "flac", "wav", "aac", "ogg", "m4a"}, Icon: "music"},
			{ID: "programs", Name: "Programs", Extensions: []string{"exe", "msi", "dmg", "pkg", "deb", "rpm", "appimage"}, Icon: "box"},
			{ID: "video", Name: "Video", Extensions: []string{"mp4", "mkv", "webm", "avi", "mov", "flv"}, Icon: "film"},
		},
	}
}

func (r *CategoryRepo) List() []models.Category {
	return r.items
}

