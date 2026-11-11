package engine

import (
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"rappidex/internal/engine/protocols"
	"rappidex/internal/pkg/netutil"
)

type ProbeResult struct {
	URL          string `json:"url"`
	FileName     string `json:"fileName"`
	ContentType  string `json:"contentType"`
	TotalSize    int64  `json:"totalSize"`
	AcceptRanges bool   `json:"acceptRanges"`
}

// Probe inspects a URL using a lightweight Range GET ("bytes=0-0") first,
// which reliably follows HTTP->HTTPS redirects, extracts total file size from Content-Range,
// and verifies whether the server supports multi-connection byte ranges.
func Probe(rawURL string, headers map[string]string) (*ProbeResult, error) {
	client := protocols.NewHTTPClient()

	getReq, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	getReq.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
	for k, v := range headers {
		getReq.Header.Set(k, v)
	}
	getReq.Header.Set("Range", "bytes=0-0")

	getResp, err := client.Do(getReq)
	if err != nil {
		return nil, err
	}
	defer func() {
		_, _ = io.Copy(io.Discard, io.LimitReader(getResp.Body, 4096))
		_ = getResp.Body.Close()
	}()

	if getResp.StatusCode >= 400 {
		return nil, fmt.Errorf("server returned HTTP %d (%s)", getResp.StatusCode, http.StatusText(getResp.StatusCode))
	}

	finalURL := getResp.Request.URL.String()
	totalSize := getResp.ContentLength
	acceptRanges := getResp.StatusCode == http.StatusPartialContent || strings.EqualFold(getResp.Header.Get("Accept-Ranges"), "bytes")

	if cr := getResp.Header.Get("Content-Range"); cr != "" {
		// e.g. "bytes 0-0/158008374"
		if slashIdx := strings.LastIndex(cr, "/"); slashIdx != -1 {
			if parsed, parseErr := strconv.ParseInt(strings.TrimSpace(cr[slashIdx+1:]), 10, 64); parseErr == nil && parsed > 0 {
				totalSize = parsed
				acceptRanges = true
			}
		}
	}

	// If server ignored Range and didn't send Content-Length on GET, try HEAD as fallback
	if totalSize <= 1 {
		headReq, headErr := http.NewRequest(http.MethodHead, finalURL, nil)
		if headErr == nil {
			headReq.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
			if headResp, doErr := client.Do(headReq); doErr == nil {
				if headResp.ContentLength > 0 {
					totalSize = headResp.ContentLength
				}
				if strings.EqualFold(headResp.Header.Get("Accept-Ranges"), "bytes") {
					acceptRanges = true
				}
				_ = headResp.Body.Close()
			}
		}
	}

	return &ProbeResult{
		URL:          finalURL,
		FileName:     netutil.ExtractFilename(finalURL, getResp.Header.Get("Content-Disposition")),
		ContentType:  getResp.Header.Get("Content-Type"),
		TotalSize:    totalSize,
		AcceptRanges: acceptRanges,
	}, nil
}
