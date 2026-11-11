package netutil

import (
	"mime"
	"net/url"
	"path"
	"strings"
)

// ExtractFilename resolves a clean filename from Content-Disposition header or URL path.
func ExtractFilename(rawURL, contentDisposition string) string {
	if contentDisposition != "" {
		if _, params, err := mime.ParseMediaType(contentDisposition); err == nil {
			if fn, ok := params["filename"]; ok && fn != "" {
				return fn
			}
		}
	}
	if u, err := url.Parse(rawURL); err == nil {
		base := path.Base(u.Path)
		if base != "" && base != "/" && base != "." {
			if decoded, err := url.QueryUnescape(base); err == nil {
				return strings.TrimSpace(decoded)
			}
			return base
		}
	}
	return "download.bin"
}

