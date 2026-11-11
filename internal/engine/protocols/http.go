package protocols

import (
	"net/http"
	"time"
)

// NewHTTPClient creates an HTTP client tuned for high-throughput multi-connection downloads.
func NewHTTPClient() *http.Client {
	transport := &http.Transport{
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 32,
		IdleConnTimeout:     90 * time.Second,
		DisableCompression:  true, // Prevent transparent gzip from altering byte ranges
	}
	return &http.Client{
		Transport: transport,
	}
}

