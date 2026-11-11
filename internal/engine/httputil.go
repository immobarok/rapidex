package engine

import (
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
)

// DefaultUserAgent is sent unless the browser extension provides its own.
const DefaultUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

var (
	errRangeIgnored = errors.New("server ignored the byte range request")
	errStalled      = errors.New("no data received for 30 seconds")
)

// HTTPStatusError is a server response that is not a success.
type HTTPStatusError struct {
	Code int
}

func (e *HTTPStatusError) Error() string {
	switch e.Code {
	case http.StatusUnauthorized:
		return "This site needs a username and password (HTTP 401). Add it in Options → Site Logins."
	case http.StatusForbidden:
		return "Access denied or the link has expired (HTTP 403). Use \"Refresh Download Address\" with a new link."
	case http.StatusNotFound:
		return "The file was not found on the server (HTTP 404)."
	case http.StatusGone:
		return "This link has expired (HTTP 410). Use \"Refresh Download Address\" with a new link."
	case http.StatusRequestedRangeNotSatisfiable:
		return "The server rejected the requested part of the file (HTTP 416)."
	case http.StatusTooManyRequests:
		return "The server is limiting connections (HTTP 429). Try fewer connections."
	}
	return fmt.Sprintf("Server error (HTTP %d %s)", e.Code, http.StatusText(e.Code))
}

// Retryable reports whether trying again later might succeed.
func (e *HTTPStatusError) Retryable() bool {
	return e.Code >= 500 || e.Code == http.StatusRequestTimeout || e.Code == http.StatusTooManyRequests
}

func applyHeaders(req *http.Request, headers map[string]string) {
	req.Header.Set("User-Agent", DefaultUserAgent)
	req.Header.Set("Accept", "*/*")
	for k, v := range headers {
		if strings.TrimSpace(v) != "" {
			req.Header.Set(k, v)
		}
	}
}

// parseContentRange parses "bytes 100-199/1000" into start and total (-1 when "*").
func parseContentRange(v string) (start, total int64, ok bool) {
	v = strings.TrimSpace(v)
	v = strings.TrimPrefix(v, "bytes")
	v = strings.TrimSpace(v)
	dash := strings.Index(v, "-")
	slash := strings.LastIndex(v, "/")
	if dash <= 0 || slash < dash {
		return 0, 0, false
	}
	s, err := strconv.ParseInt(strings.TrimSpace(v[:dash]), 10, 64)
	if err != nil {
		return 0, 0, false
	}
	totalStr := strings.TrimSpace(v[slash+1:])
	if totalStr == "*" {
		return s, -1, true
	}
	t, err := strconv.ParseInt(totalStr, 10, 64)
	if err != nil {
		return s, -1, true
	}
	return s, t, true
}

func copyHeaders(h map[string]string) map[string]string {
	out := make(map[string]string, len(h))
	for k, v := range h {
		out[k] = v
	}
	return out
}

