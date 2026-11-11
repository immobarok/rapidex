package storage

import (
	"os"
	"path/filepath"
)

// Database wraps persistent state for downloads, categories, and settings.
type Database struct {
	downloads  *DownloadRepo
	categories *CategoryRepo
	settings   *SettingsRepo
}

func NewDatabase() (*Database, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		configDir = "."
	}
	dataDir := filepath.Join(configDir, "Rappidex")

	return &Database{
		downloads:  NewDownloadRepo(dataDir),
		categories: NewCategoryRepo(),
		settings:   NewSettingsRepo(dataDir),
	}, nil
}

func (db *Database) Downloads() *DownloadRepo  { return db.downloads }
func (db *Database) Categories() *CategoryRepo { return db.categories }
func (db *Database) Settings() *SettingsRepo   { return db.settings }
func (db *Database) Close() error              { return nil }
