package fileutil

import (
	"os"
	"path/filepath"
)

// DefaultDownloadDir returns ~/Downloads/Rappidex.
func DefaultDownloadDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return "./downloads"
	}
	return filepath.Join(home, "Downloads", "Rappidex")
}

