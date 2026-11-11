# ⚡ Rappidex — High-Speed Multi-Connection Download Manager

**Rappidex** is a native, cross-platform desktop **Internet Download Manager (IDM) clone** engineered with **Go (Golang)**, **Wails v2**, **React 19**, **TypeScript**, and **Tailwind CSS v4**.

It accelerates downloads using concurrent HTTP `Range` connections, **Dynamic In-Flight File Segmentation (Work Stealing)**, pre-allocated zero-merge file I/O (`os.File.WriteAt`), smart file categorization, scheduled queues, and a companion browser extension sniffer.

---

## ✨ Key Features

- **🚀 Dynamic Multi-Connection Engine (`internal/engine`)**
  - Splits downloads into `1`, `4`, `8`, `16`, or `32` concurrent HTTP/HTTPS `Range` connections.
  - **Dynamic Work Stealing**: Whenever a worker finishes its byte segment early, it automatically splits the largest remaining active chunk in half—ensuring all connections stay saturated until the final byte.
  - **Zero-Merge Sparse Allocation**: Pre-allocates the target file and writes concurrently to exact byte offsets via `os.File.WriteAt`, eliminating slow end-of-download disk merging.
- **📊 IDM-Style Live Chunk Visualizer & Inspector**
  - Real-time segmented progress bar inside the main download table and a dedicated per-download **Worker Inspector Dialog** displaying live byte ranges for every connection.
- **🗂️ Automatic Categorization & Smart Routing**
  - Automatically routes files by extension into **Compressed**, **Documents**, **Music**, **Programs**, and **Video** directories.
- **⏱️ Queue & Scheduler Manager (`internal/scheduler`)**
  - Configure maximum simultaneous downloads, start/stop schedules, global bandwidth throttling (token-bucket rate limiter), and post-completion system actions.
- **🌐 Browser Integration & Sniffer (`internal/server` & `browser-extension`)**
  - Local IPC HTTP server (`127.0.0.1:41920`) and Chrome/Firefox Manifest V3 WebExtension that intercepts browser downloads and forwards session cookies, `Referer`, and `User-Agent` headers directly to Rappidex.

---

## 🏗️ Architecture & Folder Structure

```text
rappidex/
├── build/                          # Wails build assets & OS packaging (macOS, Windows, Linux)
├── cmd/
│   └── native-host/                # Chrome/Firefox Native Messaging host binary
├── internal/
│   ├── app/                        # Wails lifecycle hooks, system tray, clipboard URL monitor
│   ├── handlers/                   # Wails-bound API handlers (Download, Queue, Category, Settings)
│   ├── engine/                     # Core Multi-Threaded Download Engine
│   │   ├── manager.go              # Active download orchestrator & global bandwidth limiter
│   │   ├── task.go                 # Per-download state machine & dynamic work-stealing loop
│   │   ├── worker.go               # Concurrent HTTP Range worker goroutine
│   │   ├── splitter.go             # Initial range division & in-flight chunk splitting
│   │   ├── merger.go               # Pre-allocated file writer
│   │   ├── limiter.go              # Token-bucket bandwidth throttling
│   │   ├── prober.go               # URL metadata prober (Content-Length, Accept-Ranges, filename)
│   │   └── protocols/              # HTTP/HTTPS, HLS (.m3u8), and BitTorrent protocol handlers
│   ├── scheduler/                  # Queue concurrency & cron-like scheduling
│   ├── server/                     # Localhost IPC server (127.0.0.1:41920) for browser extensions
│   ├── storage/                    # Persistence layer for downloads, categories, and settings
│   ├── models/                     # Domain models, chunk states, and Wails event payloads
│   └── pkg/                        # Internal utilities (fileutil, netutil, notify, structured logger)
├── frontend/                       # React 19 + TypeScript + Vite 8 + Tailwind CSS v4 + Zustand
│   └── src/
│       ├── components/
│       │   ├── layout/             # Toolbar, Sidebar, StatusBar
│       │   ├── table/              # High-density DownloadTable
│       │   ├── dialogs/            # AddUrlModal, ProgressDialog, SchedulerModal, OptionsModal
│       │   └── widgets/            # ChunkVisualizer (segmented multi-connection progress bar)
│       ├── store/                  # Zustand state store (useDownloadStore)
│       ├── types/                  # TypeScript interfaces
│       └── utils/                  # Byte size & ETA formatters
├── browser-extension/              # Companion Chrome/Edge/Firefox Manifest V3 extension
├── scripts/                        # Build & packaging scripts
├── main.go                         # Application entrypoint & Wails configuration
└── wails.json                      # Wails project configuration
```

---

## 🛠️ Prerequisites

- **Go**: `1.23+` (tested with `go1.26`)
- **Node.js**: `20+` & `npm`
- **Wails CLI v2**:
  ```bash
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  ```
  Ensure `$(go env GOPATH)/bin` is in your shell `PATH`:
  ```bash
  export PATH="$HOME/go/bin:$PATH"
  ```

---

## 🚀 Getting Started

### 1. Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### 2. Run in Wails Live Development Mode
Starts the Vite dev server and launches the native desktop application with hot-reload:
```bash
wails dev
```

### 3. Run Frontend Only (Browser Preview)
```bash
cd frontend
npm run dev
```

### 4. Run Core Download Engine Tests
Runs the automated multi-connection HTTP `Range` + dynamic work-stealing integration suite:
```bash
go test -v ./internal/engine/...
```

---

## 📦 Building for Production

Compile a standalone, native desktop application binary (`.app` on macOS, `.exe` on Windows, binary on Linux):

```bash
wails build
```

Or build both the desktop app and the browser Native Messaging host binary using the helper script:

```bash
chmod +x scripts/build-all.sh
./scripts/build-all.sh
```

---

## 🧩 Loading the Browser Extension (Chrome / Edge / Brave)

1. Open `chrome://extensions/` in your browser.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the `browser-extension/` directory.
4. When Rappidex is running, browser downloads are automatically intercepted on `http://127.0.0.1:41920/api/v1/sniffer`.

---

## 📄 License

MIT License
