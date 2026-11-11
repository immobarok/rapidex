package engine

import (
	"context"
	"io"
	"net/http"
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
	IsWebPage    bool   `json:"isWebPage"`
}

// Probe reads file information (final address after redirects, name, size, resume support)
// using a tiny "Range: bytes=0-0" request, exactly like IDM's "Download File Info" step.
func Probe(ctx context.Context, client *http.Client, rawURL string, headers map[string]string) (*ProbeResult, error) {
	var presetFileName string
	var presetSize int64

	if protocols.IsYouTubeURL(rawURL) {
		ytInfo, err := protocols.ExtractYouTubeStream(rawURL)
		if err != nil {
			return nil, err
		}
		rawURL = ytInfo.StreamURL
		presetFileName = ytInfo.FileName
		presetSize = ytInfo.TotalSize
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, err
	}
	applyHeaders(req, headers)
	req.Header.Set("Range", "bytes=0-0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer func() {
		_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
		_ = resp.Body.Close()
	}()

	if resp.StatusCode >= 400 {
		return nil, &HTTPStatusError{Code: resp.StatusCode}
	}

	finalURL := resp.Request.URL.String()
	contentType := resp.Header.Get("Content-Type")
	totalSize := int64(-1)
	acceptRanges := false

	if resp.StatusCode == http.StatusPartialContent {
		if _, total, ok := parseContentRange(resp.Header.Get("Content-Range")); ok && total > 0 {
			totalSize = total
			acceptRanges = true
		}
	} else if resp.ContentLength > 0 {
		totalSize = resp.ContentLength
		acceptRanges = strings.EqualFold(resp.Header.Get("Accept-Ranges"), "bytes")
	}

	if totalSize <= 0 && presetSize > 0 {
		totalSize = presetSize
	}

	// Some servers only expose the size on HEAD.
	if totalSize <= 0 {
		if headReq, herr := http.NewRequestWithContext(ctx, http.MethodHead, finalURL, nil); herr == nil {
			applyHeaders(headReq, headers)
			if headResp, derr := client.Do(headReq); derr == nil {
				if headResp.StatusCode < 400 && headResp.ContentLength > 0 {
					totalSize = headResp.ContentLength
					if strings.EqualFold(headResp.Header.Get("Accept-Ranges"), "bytes") {
						acceptRanges = true
					}
				}
				_ = headResp.Body.Close()
			}
		}
	}

	fileName := presetFileName
	if fileName == "" {
		fileName = netutil.ExtractFilename(finalURL, resp.Header.Get("Content-Disposition"), contentType)
	} else {
		fileName = netutil.EnsureExtension(fileName, contentType)
	}

	ct := strings.ToLower(contentType)
	isWebPage := strings.HasPrefix(ct, "text/html") || strings.HasPrefix(ct, "application/xhtml")

	return &ProbeResult{
		URL:          finalURL,
		FileName:     fileName,
		ContentType:  contentType,
		TotalSize:    totalSize,
		AcceptRanges: acceptRanges && totalSize > 0,
		IsWebPage:    isWebPage,
	}, nil
}
