package netutil

import (
	"mime"
	"net/url"
	"path"
	"path/filepath"
	"strings"
)

// SanitizeFilename removes characters that are invalid in macOS/Windows filenames.
func SanitizeFilename(name string) string {
	replacer := strings.NewReplacer(
		"/", "_",
		"\\", "_",
		":", " -",
		"*", "",
		"?", "",
		"\"", "'",
		"<", "",
		">", "",
		"|", "-",
	)
	cleaned := strings.TrimSpace(replacer.Replace(name))
	if cleaned == "" {
		return "download"
	}
	return cleaned
}

// ExtensionFromContentType maps an HTTP Content-Type header to a standard file extension.
func ExtensionFromContentType(contentType string) string {
	ct := strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
	switch ct {
	case "video/mp4", "application/mp4":
		return ".mp4"
	case "video/webm":
		return ".webm"
	case "video/x-matroska":
		return ".mkv"
	case "video/quicktime":
		return ".mov"
	case "audio/mpeg", "audio/mp3":
		return ".mp3"
	case "audio/mp4", "audio/x-m4a":
		return ".m4a"
	case "audio/wav", "audio/x-wav":
		return ".wav"
	case "application/pdf":
		return ".pdf"
	case "application/zip", "application/x-zip-compressed":
		return ".zip"
	case "application/x-rar-compressed", "application/vnd.rar":
		return ".rar"
	case "application/x-7z-compressed":
		return ".7z"
	case "application/gzip", "application/x-gzip":
		return ".gz"
	case "application/x-apple-diskimage":
		return ".dmg"
	case "application/vnd.microsoft.portable-executable", "application/x-msdownload":
		return ".exe"
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "text/html":
		return ".html"
	default:
		if exts, err := mime.ExtensionsByType(ct); err == nil && len(exts) > 0 {
			return exts[0]
		}
		return ""
	}
}

// EnsureExtension appends an extension inferred from Content-Type if the filename has none.
func EnsureExtension(fileName, contentType string) string {
	fileName = SanitizeFilename(fileName)
	if filepath.Ext(fileName) != "" {
		return fileName
	}
	if ext := ExtensionFromContentType(contentType); ext != "" {
		return fileName + ext
	}
	return fileName
}

// ExtractFilename resolves a clean filename with extension from Content-Disposition, URL path, and Content-Type.
func ExtractFilename(rawURL, contentDisposition, contentType string) string {
	if contentDisposition != "" {
		if _, params, err := mime.ParseMediaType(contentDisposition); err == nil {
			if fn, ok := params["filename"]; ok && fn != "" {
				return EnsureExtension(fn, contentType)
			}
		}
	}
	if u, err := url.Parse(rawURL); err == nil {
		base := path.Base(u.Path)
		if base != "" && base != "/" && base != "." {
			if decoded, err := url.QueryUnescape(base); err == nil {
				return EnsureExtension(decoded, contentType)
			}
			return EnsureExtension(base, contentType)
		}
	}
	return EnsureExtension("download", contentType)
}
