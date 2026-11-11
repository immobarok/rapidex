package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"

	"rappidex/internal/app"
	"rappidex/internal/engine"
	"rappidex/internal/handlers"
	"rappidex/internal/scheduler"
	"rappidex/internal/server"
	"rappidex/internal/storage"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// 1. Initialize Storage
	db, err := storage.NewDatabase()
	if err != nil {
		log.Fatalf("failed to init storage: %v", err)
	}
	defer db.Close()

	// 2. Initialize Core Multi-Connection Download Engine
	eng := engine.NewManager(db)

	// 3. Initialize Queue & Scheduler
	sched := scheduler.NewScheduler(eng, db)

	// 4. Initialize Local IPC Server for Browser Extension integration
	extServer := server.NewExtensionServer(eng, "127.0.0.1:41920")

	// 5. Initialize Wails Application & Handlers
	application := app.NewApp(db, eng, sched, extServer)
	downloadHandler := handlers.NewDownloadHandler(eng)
	queueHandler := handlers.NewQueueHandler(sched)
	categoryHandler := handlers.NewCategoryHandler(db)
	settingsHandler := handlers.NewSettingsHandler(db, eng)

	// 6. Launch Native Wails Desktop Window
	err = wails.Run(&options.App{
		Title:     "Rappidex Download Manager",
		Width:     1160,
		Height:    720,
		MinWidth:  900,
		MinHeight: 560,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 1},
		OnStartup:        application.Startup,
		OnShutdown:       application.Shutdown,
		Bind: []interface{}{
			application,
			downloadHandler,
			queueHandler,
			categoryHandler,
			settingsHandler,
		},
		Mac: &mac.Options{
			TitleBar:   mac.TitleBarDefault(),
			Appearance: mac.NSAppearanceNameAqua,
			About: &mac.AboutInfo{
				Title:   "Rappidex Download Manager",
				Message: "High-speed multi-connection download manager built with Go & Wails.",
			},
		},
	})
	if err != nil {
		log.Fatal(err)
	}
}
