package engine

import "os"

// AllocateFile creates or opens a target download file and pre-allocates its size if known.
func AllocateFile(path string, totalSize int64) (*os.File, error) {
	f, err := os.OpenFile(path, os.O_CREATE|os.O_RDWR, 0o644)
	if err != nil {
		return nil, err
	}
	if totalSize > 0 {
		if err := f.Truncate(totalSize); err != nil {
			_ = f.Close()
			return nil, err
		}
	}
	return f, nil
}

