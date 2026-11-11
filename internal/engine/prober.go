package engine

import (
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

// Probe inspects a URL via HTTP HEAD (with Range GET fallback for servers blocking HEAD)
// to determine filename, exact byte size, and multi-connection Range capability.
func Probe(rawURL string, headers map[string]string) (*ProbeResult, error) {
	client := protocols.NewHTTPClient()

	req, err := http.NewRequest(http.MethodHead, rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Rappidex/1.0")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := client.Do(req)
	if err == nil {
		defer resp.Body.Close()
		if resp.StatusCode >= 200 && resp.StatusCode < 400 && resp.ContentLength > 0 {
			finalURL := resp.Request.URL.String()
			return &ProbeResult{
				URL:          finalURL,
				FileName:     netutil.ExtractFilename(finalURL, resp.Header.Get("Content-Disposition")),
				ContentType:  resp.Header.Get("Content-Type"),
				TotalSize:    resp.ContentLength,
				AcceptRanges: strings.EqualFold(resp.Header.Get("Accept-Ranges"), "bytes"),
			}, nil
		}
	}

	// Fallback: send GET with Range: bytes=0-0 (many CDNs/presigned URLs reject HEAD or omit Content-Length on HEAD)
	getReq, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	getReq.Header.Set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Rappidex/1.0")
	for k, v := range headers {
		getReq.Header.Set(k, v)
	}
	getReq.Header.Set("Range", "bytes=0-0")

	getResp, err := client.Do(getReq)
	if err != nil {
		return nil, err
	}
	defer getResp.Body.Close()

	finalURL := getResp.Request.URL.String()
	totalSize := getResp.ContentLength
	acceptRanges := getResp.StatusCode == http.StatusPartialContent || strings.EqualFold(getResp.Header.Get("Accept-Ranges"), "bytes")

	if cr := getResp.Header.Get("Content-Range"); cr != "" {
		// e.g. "bytes 0-0/104857600"
		if slashIdx := strings.LastIndex(cr, "/"); slashIdx != -1 {
			if parsed, parseErr := strconv.ParseInt(cr[slashIdx+1:], 10, 64); parseErr == nil && parsed > 0 {
				totalSize = parsed
				acceptRanges = true
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
