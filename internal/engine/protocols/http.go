package protocols

import (
	"crypto/tls"
	"net"
	"net/http"
	"time"
)

type HTTPClientWrapper struct {
	Client *http.Client
}

// NewHTTPClient creates an HTTP client tuned for high-throughput multi-connection downloads.
func NewHTTPClient() *http.Client {
	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   15 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		TLSClientConfig:       &tls.Config{MinVersion: tls.VersionTLS12},
		ForceAttemptHTTP2:     false, // HTTP/1.1 gives true independent TCP sockets per parallel Range worker
		MaxIdleConns:          100,
		MaxIdleConnsPerHost:   32,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 20 * time.Second,
		DisableCompression:    true, // Prevent transparent gzip from altering byte ranges
	}
	return &http.Client{
		Transport: transport,
	}
}
