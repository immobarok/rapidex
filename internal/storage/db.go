package storage

// Database wraps persistent state (SQLite / BadgerDB) for downloads, categories, and settings.
type Database struct {
	downloads  *DownloadRepo
	categories *CategoryRepo
	settings   *SettingsRepo
}

func NewDatabase() (*Database, error) {
	return &Database{
		downloads:  &DownloadRepo{},
		categories: NewCategoryRepo(),
		settings:   &SettingsRepo{},
	}, nil
}

func (db *Database) Downloads() *DownloadRepo   { return db.downloads }
func (db *Database) Categories() *CategoryRepo  { return db.categories }
func (db *Database) Settings() *SettingsRepo    { return db.settings }
func (db *Database) Close() error               { return nil }

