package models

// Category defines automatic file routing rules (e.g., Video, Music, Compressed, Programs).
type Category struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Extensions  []string `json:"extensions"`
	DefaultPath string   `json:"defaultPath"`
	Icon        string   `json:"icon"`
}

