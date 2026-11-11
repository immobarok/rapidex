package protocols

import (
	"fmt"
	"net/url"
	"os/exec"
	"strings"

	"github.com/kkdai/youtube/v2"
	"rappidex/internal/pkg/netutil"
)

type YouTubeStreamInfo struct {
	StreamURL   string
	FileName    string
	ContentType string
	TotalSize   int64
}

// IsYouTubeURL checks if a URL points to YouTube or youtu.be.
func IsYouTubeURL(rawURL string) bool {
	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	host := strings.ToLower(u.Hostname())
	return strings.Contains(host, "youtube.com") || strings.Contains(host, "youtu.be")
}

// ExtractYouTubeStream resolves a YouTube watch/short link to a direct playable MP4 video stream URL.
func ExtractYouTubeStream(rawURL string) (*YouTubeStreamInfo, error) {
	// 1. Try native Go YouTube extractor first
	client := youtube.Client{}
	video, err := client.GetVideo(rawURL)
	if err == nil && video != nil {
		// Find best progressive MP4 format containing both video and audio
		formats := video.Formats.WithAudioChannels().Type("video/mp4")
		if len(formats) == 0 {
			formats = video.Formats.WithAudioChannels()
		}
		if len(formats) > 0 {
			best := &formats[0]
			streamURL, urlErr := client.GetStreamURL(video, best)
			if urlErr == nil && streamURL != "" {
				title := netutil.SanitizeFilename(video.Title)
				if title == "" {
					title = "youtube_video"
				}
				return &YouTubeStreamInfo{
					StreamURL:   streamURL,
					FileName:    title + ".mp4",
					ContentType: "video/mp4",
					TotalSize:   best.ContentLength,
				}, nil
			}
		}
	}

	// 2. Fallback to yt-dlp if installed on the system
	for _, bin := range []string{"yt-dlp", "/opt/homebrew/bin/yt-dlp", "/usr/local/bin/yt-dlp"} {
		if path, lookErr := exec.LookPath(bin); lookErr == nil {
			out, cmdErr := exec.Command(path, "-f", "best[ext=mp4]/best", "--get-title", "--get-url", rawURL).Output()
			if cmdErr == nil {
				lines := strings.Split(strings.TrimSpace(string(out)), "\n")
				if len(lines) >= 2 {
					title := netutil.SanitizeFilename(lines[0])
					streamURL := strings.TrimSpace(lines[len(lines)-1])
					return &YouTubeStreamInfo{
						StreamURL:   streamURL,
						FileName:    title + ".mp4",
						ContentType: "video/mp4",
						TotalSize:   0,
					}, nil
				}
			}
		}
	}

	if err != nil {
		return nil, fmt.Errorf("could not extract direct MP4 stream from YouTube link: %w", err)
	}
	return nil, fmt.Errorf("no downloadable MP4 stream found for this YouTube video")
}

