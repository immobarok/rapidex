package engine

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"rappidex/internal/models"
	"rappidex/internal/storage"
)

func TestMultiConnectionDownloadAndWorkStealing(t *testing.T) {
	// Generate 2MB payload
	payload := bytes.Repeat([]byte("RAPPIDEX-IDM-CLONE-TEST-DATA-0123456789ABCDEF"), 46600)

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.ServeContent(w, r, "testfile.bin", time.Now(), bytes.NewReader(payload))
	}))
	defer srv.Close()

	db, err := storage.NewDatabaseAt(t.TempDir())
	if err != nil {
		t.Fatalf("failed to create db: %v", err)
	}
	mgr := NewManager(db)

	tmpDir := t.TempDir()
	item, err := mgr.AddDownload(srv.URL+"/testfile.bin", tmpDir, "testfile.bin", 8, nil)
	if err != nil {
		t.Fatalf("AddDownload failed: %v", err)
	}

	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		items := mgr.List()
		if len(items) == 1 && items[0].Status == models.StatusCompleted {
			break
		}
		if len(items) == 1 && items[0].Status == models.StatusFailed {
			t.Fatalf("download failed: %s", items[0].ErrorMessage)
		}
		time.Sleep(50 * time.Millisecond)
	}

	downloadedBytes, err := os.ReadFile(filepath.Join(tmpDir, item.FileName))
	if err != nil {
		t.Fatalf("failed to read downloaded file: %v", err)
	}

	if !bytes.Equal(downloadedBytes, payload) {
		t.Fatalf("downloaded file mismatch: got %d bytes, want %d bytes", len(downloadedBytes), len(payload))
	}
}
