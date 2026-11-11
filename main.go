package main

import (
	"embed"
	"log"

	"rappidex/internal/app"
	"rappidex/internal/engine"
	"rappidex/internal/handlers"
	"rappidex/internal/scheduler"
	"rappidex/internal/server"
	"rappidex/internal/storage"
)

var assets embed.FS

func main() {
	// 1. Initialize Storage (SQLite)
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
	application := app.NewApp(eng, sched, extServer)
	downloadHandler := handlers.NewDownloadHandler(eng)
	queueHandler := handlers.NewQueueHandler(sched)
	categoryHandler := handlers.NewCategoryHandler(db)
	settingsHandler := handlers.NewSettingsHandler(db, eng)

	_ = application
	_ = downloadHandler
	_ = queueHandler
	_ = categoryHandler
	_ = settingsHandler
	_ = assets

	log.Println("Rappidex core services initialized.")
}
