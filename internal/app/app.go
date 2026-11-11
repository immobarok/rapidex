package app

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"rappidex/internal/engine"
	"rappidex/internal/models"
	"rappidex/internal/scheduler"
	"rappidex/internal/server"
	"rappidex/internal/storage"
)

type App struct {
	ctx       context.Context
	db        *storage.Database
	engine    *engine.Manager
	scheduler *scheduler.Scheduler
	extServer *server.ExtensionServer
}

func NewApp(db *storage.Database, eng *engine.Manager, sched *scheduler.Scheduler, ext *server.ExtensionServer) *App {
	return &App{
		db:        db,
		engine:    eng,
		scheduler: sched,
		extServer: ext,
	}
}

func (a *App) engineSettings() storage.AppSettings {
	return a.db.Settings().Get()
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	// Emit real-time download list updates to the React frontend via Wails Events
	a.engine.SetUpdateCallback(func(items []*models.DownloadItem) {
		runtime.EventsEmit(ctx, "downloads:update", items)
	})

	// Emit download completion event (for IDM's "Download Complete" dialog)
	a.engine.SetCompletedCallback(func(item *models.DownloadItem) {
		runtime.EventsEmit(ctx, "download:completed", item)
	})

	go a.engine.StartProgressEmitter(ctx)
	go a.scheduler.Start(ctx)
	go a.extServer.Start(ctx)
	go a.startClipboardMonitor(ctx)
}

func (a *App) Shutdown(ctx context.Context) {
	a.engine.PauseAll()
	_ = a.extServer.Stop()
}

// SelectDirectory opens a native OS folder picker dialog for choosing a download directory.
func (a *App) SelectDirectory(defaultDir string) (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title:            "Select Download Directory",
		DefaultDirectory: defaultDir,
	})
}
