package server

import (
	"context"
	"net/http"

	"rappidex/internal/engine"
)

// ExtensionServer listens on localhost for intercepted downloads from Chrome/Firefox extensions.
type ExtensionServer struct {
	engine *engine.Manager
	srv    *http.Server
}

func NewExtensionServer(eng *engine.Manager, addr string) *ExtensionServer {
	s := &ExtensionServer{engine: eng}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/sniffer", s.withAuth(s.handleSniffedDownload))
	mux.HandleFunc("/api/v1/ping", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok","app":"rappidex"}`))
	})
	s.srv = &http.Server{
		Addr:    addr,
		Handler: mux,
	}
	return s
}

func (s *ExtensionServer) Start(ctx context.Context) {
	go func() {
		_ = s.srv.ListenAndServe()
	}()
	<-ctx.Done()
}

func (s *ExtensionServer) Stop() error {
	return s.srv.Close()
}

