package app

import "context"

func (a *App) startClipboardMonitor(ctx context.Context) {
	<-ctx.Done()
}

