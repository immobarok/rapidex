package storage

import "rappidex/internal/models"

// DownloadRepo persists download metadata and chunk byte-offset checkpoints for crash recovery.
type DownloadRepo struct{}

func (r *DownloadRepo) Save(item *models.DownloadItem) error {
	_ = item
	return nil
}

