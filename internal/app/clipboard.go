package app

import (
	"context"
	"net/url"
	"path/filepath"
	"strings"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// startClipboardMonitor watches the OS clipboard for downloadable URLs matching configured extensions,
// and emits "clipboard:url" so the frontend can pop up the "Download File Info" dialog like IDM.
func (a *App) startClipboardMonitor(ctx context.Context) {
	ticker := time.NewTicker(1200 * time.Millisecond)
	defer ticker.Stop()

	var lastSeen string
	// Prime with initial clipboard so we don't pop up on app startup
	if initial, err := runtime.ClipboardGetText(ctx); err == nil {
		lastSeen = strings.TrimSpace(initial)
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			settings := a.engineSettings()
			if !settings.MonitorClipboard {
				continue
			}
			text, err := runtime.ClipboardGetText(ctx)
			if err != nil {
				continue
			}
			trimmed := strings.TrimSpace(text)
			if trimmed == "" || trimmed == lastSeen {
				continue
			}
			lastSeen = trimmed

			if isCatchableURL(trimmed, settings.IsCatchable) {
				runtime.EventsEmit(ctx, "clipboard:url", trimmed)
			}
		}
	}
}

func isCatchableURL(raw string, matchExt func(string) bool) bool {
	if !strings.HasPrefix(raw, "http://") && !strings.HasPrefix(raw, "https://") {
		return false
	}
	if strings.ContainsAny(raw, " \n\r\t") {
		return false
	}
	u, err := url.Parse(raw)
	if err != nil || u.Host == "" {
		return false
	}
	ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(u.Path)), ".")
	return ext != "" && matchExt(ext)
}
