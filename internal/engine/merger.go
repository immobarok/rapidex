package engine

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// PartSuffix marks an unfinished download on disk. The file only gets its real name when complete.
const PartSuffix = ".rpdx"

func PartPath(finalPath string) string {
	return finalPath + PartSuffix
}

// OpenPartFile opens the temporary download file. A fresh download truncates any leftovers
// and pre-allocates the full size so every connection can write at its own offset.
func OpenPartFile(path string, totalSize int64, fresh bool) (*os.File, error) {
	flags := os.O_CREATE | os.O_RDWR
	if fresh {
		flags |= os.O_TRUNC
	}
	f, err := os.OpenFile(path, flags, 0o644)
	if err != nil {
		return nil, err
	}
	if fresh && totalSize > 0 {
		if err := f.Truncate(totalSize); err != nil {
			_ = f.Close()
			return nil, err
		}
	}
	return f, nil
}

// UniquePath returns "name (1).ext", "name (2).ext", ... if path is already taken.
func UniquePath(path string, taken func(string) bool) string {
	if !taken(path) {
		return path
	}
	dir := filepath.Dir(path)
	base := filepath.Base(path)
	ext := filepath.Ext(base)
	stem := strings.TrimSuffix(base, ext)
	for i := 1; i < 10000; i++ {
		candidate := filepath.Join(dir, fmt.Sprintf("%s (%d)%s", stem, i, ext))
		if !taken(candidate) {
			return candidate
		}
	}
	return path
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// FinalizeFile renames the finished part file to its final name and returns the path used.
func FinalizeFile(partPath, finalPath string, overwrite bool) (string, error) {
	target := finalPath
	if overwrite {
		_ = os.Remove(finalPath)
	} else {
		target = UniquePath(finalPath, fileExists)
	}
	if err := os.Rename(partPath, target); err != nil {
		return "", err
	}
	return target, nil
}
