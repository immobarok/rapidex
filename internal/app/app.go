package app

import (
	"context"

	"rappidex/internal/engine"
	"rappidex/internal/scheduler"
	"rappidex/internal/server"
)

type App struct {
	ctx       context.Context
	engine    *engine.Manager
	scheduler *scheduler.Scheduler
	extServer *server.ExtensionServer
}

func NewApp(eng *engine.Manager, sched *scheduler.Scheduler, ext *server.ExtensionServer) *App {
	return &App{
		engine:    eng,
		scheduler: sched,
		extServer: ext,
	}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	go a.extServer.Start(ctx)
	go a.startClipboardMonitor(ctx)
}

func (a *App) Shutdown(ctx context.Context) {
	a.engine.PauseAll()
	_ = a.extServer.Stop()
}

