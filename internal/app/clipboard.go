package app

import "context"

// startClipboardMonitor watches the OS clipboard for downloadable URLs matching configured extensions.
func (a *App) startClipboardMonitor(ctx context.Context) {
	<-ctx.Done()
}

