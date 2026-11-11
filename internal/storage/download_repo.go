package storage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"rappidex/internal/models"
)

// DownloadRepo persists download metadata and chunk byte-offset checkpoints to disk.
type DownloadRepo struct {
	mu       sync.Mutex
	filePath string
}

func NewDownloadRepo(dataDir string) *DownloadRepo {
	_ = os.MkdirAll(dataDir, 0o755)
	return &DownloadRepo{
		filePath: filepath.Join(dataDir, "downloads.json"),
	}
}

func (r *DownloadRepo) LoadAll() ([]*models.DownloadItem, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	data, err := os.ReadFile(r.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			return []*models.DownloadItem{}, nil
		}
		return nil, err
	}

	var items []*models.DownloadItem
	if err := json.Unmarshal(data, &items); err != nil {
		return []*models.DownloadItem{}, nil
	}
	return items, nil
}

func (r *DownloadRepo) SaveAll(items []*models.DownloadItem) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	data, err := json.MarshalIndent(items, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(r.filePath, data, 0o644)
}
