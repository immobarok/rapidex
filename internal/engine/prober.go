package engine

import (
	"net/http"
	"rappidex/internal/pkg/netutil"
)

type ProbeResult struct {
	URL          string `json:"url"`
	FileName     string `json:"fileName"`
	ContentType  string `json:"contentType"`
	TotalSize    int64  `json:"totalSize"`
	AcceptRanges bool   `json:"acceptRanges"`
}

// Probe inspects a URL via HTTP HEAD/GET to determine filename, size, and multi-connection support.
func Probe(rawURL string, headers map[string]string) (*ProbeResult, error) {
	req, err := http.NewRequest(http.MethodHead, rawURL, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return &ProbeResult{
		URL:          rawURL,
		FileName:     netutil.ExtractFilename(rawURL, resp.Header.Get("Content-Disposition")),
		ContentType:  resp.Header.Get("Content-Type"),
		TotalSize:    resp.ContentLength,
		AcceptRanges: resp.Header.Get("Accept-Ranges") == "bytes",
	}, nil
}

