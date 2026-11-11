package server

import (
	"encoding/json"
	"net/http"
)

type SniffPayload struct {
	URL       string            `json:"url"`
	FileName  string            `json:"fileName"`
	Referer   string            `json:"referer"`
	Cookies   string            `json:"cookies"`
	UserAgent string            `json:"userAgent"`
	Headers   map[string]string `json:"headers"`
}

// handleSniffedDownload receives intercepted download links + session cookies from the browser.
func (s *ExtensionServer) handleSniffedDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload SniffPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if payload.Headers == nil {
		payload.Headers = make(map[string]string)
	}
	if payload.Cookies != "" {
		payload.Headers["Cookie"] = payload.Cookies
	}
	if payload.Referer != "" {
		payload.Headers["Referer"] = payload.Referer
	}
	if payload.UserAgent != "" {
		payload.Headers["User-Agent"] = payload.UserAgent
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	_, _ = w.Write([]byte(`{"accepted":true}`))
}

