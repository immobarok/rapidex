package storage

import (
	"encoding/json"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"rappidex/internal/pkg/fileutil"
)

// SiteLogin stores credentials that are sent automatically to matching sites.
type SiteLogin struct {
	Pattern  string `json:"pattern"` // e.g. "example.com" or "files.example.com/private"
	Username string `json:"username"`
	Password string `json:"password"`
}

// ProxySettings controls how Rappidex connects to the internet.
type ProxySettings struct {
	Mode string `json:"mode"` // "system", "none", "manual"
	URL  string `json:"url"`  // e.g. "http://127.0.0.1:8080" or "socks5://127.0.0.1:1080"
}

// AppSettings holds every user preference shown in the Options dialog.
type AppSettings struct {
	DefaultDownloadDir string            `json:"defaultDownloadDir"`
	CategoryDirs       map[string]string `json:"categoryDirs"`
	DefaultMaxConns    int               `json:"defaultMaxConns"`
	SpeedLimitBps      int64             `json:"speedLimitBps"` // global limit, 0 = unlimited
	MaxRetries         int               `json:"maxRetries"`
	RetryDelaySec      int               `json:"retryDelaySec"`
	ShowFileInfoDialog bool              `json:"showFileInfoDialog"`
	ShowProgressDialog bool              `json:"showProgressDialog"`
	ShowCompleteDialog bool              `json:"showCompleteDialog"`
	MonitorClipboard   bool              `json:"monitorClipboard"`
	BrowserIntegration bool              `json:"browserIntegration"`
	DuplicateAction    string            `json:"duplicateAction"` // "rename" or "overwrite"
	Proxy              ProxySettings     `json:"proxy"`
	SiteLogins         []SiteLogin       `json:"siteLogins"`
	CatchExtensions    []string          `json:"catchExtensions"`
}

var defaultCatchExtensions = []string{
	"3gp", "7z", "aac", "apk", "avi", "bin", "bz2", "deb", "dmg", "doc", "docx", "epub", "exe",
	"flac", "flv", "gz", "iso", "m4a", "m4v", "mkv", "mov", "mp3", "mp4", "mpeg", "mpg", "msi",
	"ogg", "opus", "pdf", "pkg", "ppt", "pptx", "rar", "rpm", "tar", "tgz", "wav", "webm", "wma",
	"wmv", "xls", "xlsx", "xz", "zip",
}

// DefaultSettings returns first-run settings (IDM-like: one sub-folder per category).
func DefaultSettings() AppSettings {
	base := fileutil.DefaultDownloadDir()
	dirs := map[string]string{}
	for _, c := range NewCategoryRepo().List() {
		dirs[c.ID] = filepath.Join(base, c.Name)
	}
	return AppSettings{
		DefaultDownloadDir: base,
		CategoryDirs:       dirs,
		DefaultMaxConns:    8,
		SpeedLimitBps:      0,
		MaxRetries:         5,
		RetryDelaySec:      3,
		ShowFileInfoDialog: true,
		ShowProgressDialog: true,
		ShowCompleteDialog: true,
		MonitorClipboard:   true,
		BrowserIntegration: true,
		DuplicateAction:    "rename",
		Proxy:              ProxySettings{Mode: "system"},
		SiteLogins:         []SiteLogin{},
		CatchExtensions:    append([]string{}, defaultCatchExtensions...),
	}
}

func normalizeSettings(s *AppSettings) {
	def := DefaultSettings()
	if strings.TrimSpace(s.DefaultDownloadDir) == "" {
		s.DefaultDownloadDir = def.DefaultDownloadDir
	}
	if s.CategoryDirs == nil {
		s.CategoryDirs = map[string]string{}
	}
	if s.DefaultMaxConns < 1 {
		s.DefaultMaxConns = 8
	}
	if s.DefaultMaxConns > 32 {
		s.DefaultMaxConns = 32
	}
	if s.SpeedLimitBps < 0 {
		s.SpeedLimitBps = 0
	}
	if s.MaxRetries < 0 {
		s.MaxRetries = 0
	}
	if s.MaxRetries > 100 {
		s.MaxRetries = 100
	}
	if s.RetryDelaySec < 1 {
		s.RetryDelaySec = 1
	}
	if s.DuplicateAction != "overwrite" {
		s.DuplicateAction = "rename"
	}
	switch s.Proxy.Mode {
	case "none", "manual", "system":
	default:
		s.Proxy.Mode = "system"
	}
	if s.SiteLogins == nil {
		s.SiteLogins = []SiteLogin{}
	}
	cleaned := make([]string, 0, len(s.CatchExtensions))
	seen := map[string]bool{}
	for _, e := range s.CatchExtensions {
		e = strings.TrimPrefix(strings.ToLower(strings.TrimSpace(e)), ".")
		if e != "" && !seen[e] {
			seen[e] = true
			cleaned = append(cleaned, e)
		}
	}
	s.CatchExtensions = cleaned
}

// SaveDirFor returns the folder used for a given category.
func (s AppSettings) SaveDirFor(categoryID string) string {
	if dir := strings.TrimSpace(s.CategoryDirs[categoryID]); dir != "" {
		return dir
	}
	return s.DefaultDownloadDir
}

// MatchLogin finds saved credentials for a download address.
func (s AppSettings) MatchLogin(rawURL string) (SiteLogin, bool) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return SiteLogin{}, false
	}
	target := strings.ToLower(u.Host + u.Path)
	for _, l := range s.SiteLogins {
		p := strings.ToLower(strings.TrimSpace(l.Pattern))
		p = strings.TrimPrefix(strings.TrimPrefix(p, "https://"), "http://")
		if p != "" && strings.Contains(target, p) {
			return l, true
		}
	}
	return SiteLogin{}, false
}

// IsCatchable reports whether a file extension should be captured from browser/clipboard.
func (s AppSettings) IsCatchable(ext string) bool {
	ext = strings.TrimPrefix(strings.ToLower(ext), ".")
	for _, e := range s.CatchExtensions {
		if e == ext {
			return true
		}
	}
	return false
}

// SettingsRepo stores user preferences on disk.
type SettingsRepo struct {
	mu       sync.Mutex
	filePath string
	current  AppSettings
}

func NewSettingsRepo(dataDir string) *SettingsRepo {
	_ = os.MkdirAll(dataDir, 0o755)
	repo := &SettingsRepo{
		filePath: filepath.Join(dataDir, "settings.json"),
		current:  DefaultSettings(),
	}
	if data, err := os.ReadFile(repo.filePath); err == nil {
		_ = json.Unmarshal(data, &repo.current)
	}
	normalizeSettings(&repo.current)
	return repo
}

func (r *SettingsRepo) Get() AppSettings {
	r.mu.Lock()
	defer r.mu.Unlock()
	cp := r.current
	cp.CategoryDirs = map[string]string{}
	for k, v := range r.current.CategoryDirs {
		cp.CategoryDirs[k] = v
	}
	cp.SiteLogins = append([]SiteLogin{}, r.current.SiteLogins...)
	cp.CatchExtensions = append([]string{}, r.current.CatchExtensions...)
	return cp
}

func (r *SettingsRepo) Update(s AppSettings) error {
	normalizeSettings(&s)
	r.mu.Lock()
	defer r.mu.Unlock()
	r.current = s
	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return err
	}
	return writeFileAtomic(r.filePath, data, 0o600)
}
