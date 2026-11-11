package protocols

import (
	"crypto/tls"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// NewHTTPClient creates an HTTP client tuned for many parallel byte-range connections.
// proxyMode: "system" (environment), "none", or "manual" (proxyURL, e.g. http://host:port or socks5://host:port).
func NewHTTPClient(proxyMode, proxyURL string) *http.Client {
	var proxy func(*http.Request) (*url.URL, error) = http.ProxyFromEnvironment
	switch proxyMode {
	case "none":
		proxy = nil
	case "manual":
		if u, err := url.Parse(strings.TrimSpace(proxyURL)); err == nil && u.Host != "" {
			proxy = http.ProxyURL(u)
		}
	}

	transport := &http.Transport{
		Proxy: proxy,
		DialContext: (&net.Dialer{
			Timeout:   15 * time.Second,
			KeepAlive: 30 * time.Second,
		}).DialContext,
		TLSClientConfig:       &tls.Config{MinVersion: tls.VersionTLS12},
		ForceAttemptHTTP2:     false, // HTTP/1.1 => one real TCP connection per part (like IDM)
		MaxIdleConns:          128,
		MaxIdleConnsPerHost:   32,
		MaxConnsPerHost:       0,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   15 * time.Second,
		ResponseHeaderTimeout: 30 * time.Second,
		DisableCompression:    true, // gzip would break byte offsets
	}
	return &http.Client{Transport: transport}
}
