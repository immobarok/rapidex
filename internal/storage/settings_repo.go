package storage

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"

	"rappidex/internal/pkg/fileutil"
)

type AppSettings struct {
	DefaultDownloadDir string `json:"defaultDownloadDir"`
	DefaultMaxConns    int    `json:"defaultMaxConns"`
	SpeedLimitBps      int64  `json:"speedLimitBps"`
	MaxConcurrentTasks int    `json:"maxConcurrentTasks"`
	ShutdownWhenDone   bool   `json:"shutdownWhenDone"`
}

// SettingsRepo stores user preferences on disk.
type SettingsRepo struct {
	mu       sync.Mutex
	filePath string
	current  AppSettings
}

func NewSettingsRepo(dataDir string) *SettingsRepo {
	_ = os.MkdirAll(dataDir, 0o755)
	repo := &SettingsRepo{
		filePath: filepath.Join(dataDir, "settings.json"),
		current: AppSettings{
			DefaultDownloadDir: fileutil.DefaultDownloadDir(),
			DefaultMaxConns:    8,
			SpeedLimitBps:      0,
			MaxConcurrentTasks: 4,
			ShutdownWhenDone:   false,
		},
	}
	if data, err := os.ReadFile(repo.filePath); err == nil {
		_ = json.Unmarshal(data, &repo.current)
	}
	return repo
}

func (r *SettingsRepo) Get() AppSettings {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.current
}

func (r *SettingsRepo) Update(s AppSettings) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if s.DefaultDownloadDir == "" {
		s.DefaultDownloadDir = fileutil.DefaultDownloadDir()
	}
	if s.DefaultMaxConns <= 0 {
		s.DefaultMaxConns = 8
	}
	if s.MaxConcurrentTasks <= 0 {
		s.MaxConcurrentTasks = 4
	}
	r.current = s
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(r.filePath, data, 0o644)
}
