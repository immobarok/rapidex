package storage

import (
	"os"
	"path/filepath"
)

// Database wraps persistent state for downloads, queues, categories, and settings.
type Database struct {
	downloads  *DownloadRepo
	categories *CategoryRepo
	settings   *SettingsRepo
	queues     *QueueRepo
}

// NewDatabase stores data in ~/.rappidex.
func NewDatabase() (*Database, error) {
	dataDir := filepath.Join(".", ".rappidex-data")
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		dataDir = filepath.Join(home, ".rappidex")
	}
	return NewDatabaseAt(dataDir)
}

// NewDatabaseAt stores data in a specific folder (used by tests).
func NewDatabaseAt(dataDir string) (*Database, error) {
	if err := os.MkdirAll(dataDir, 0o755); err != nil {
		return nil, err
	}
	return &Database{
		downloads:  NewDownloadRepo(dataDir),
		categories: NewCategoryRepo(),
		settings:   NewSettingsRepo(dataDir),
		queues:     NewQueueRepo(dataDir),
	}, nil
}

func (db *Database) Downloads() *DownloadRepo  { return db.downloads }
func (db *Database) Categories() *CategoryRepo { return db.categories }
func (db *Database) Settings() *SettingsRepo   { return db.settings }
func (db *Database) Queues() *QueueRepo        { return db.queues }
func (db *Database) Close() error              { return nil }
