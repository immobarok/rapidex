import { create } from 'zustand';
import { DownloadItem } from '../types/download';
import { AppSettings, backendAPI } from '../utils/wailsBridge';

interface DownloadStore {
  downloads: DownloadItem[];
  settings: AppSettings;
  selectedId: string | null;
  activeCategory: string;
  searchQuery: string;
  isAddModalOpen: boolean;
  isSchedulerOpen: boolean;
  isOptionsOpen: boolean;
  inspectingDownloadId: string | null;

  initBackend: () => Promise<() => void>;
  setSelectedId: (id: string | null) => void;
  setActiveCategory: (category: string) => void;
  setSearchQuery: (q: string) => void;
  setAddModalOpen: (open: boolean) => void;
  setSchedulerOpen: (open: boolean) => void;
  setOptionsOpen: (open: boolean) => void;
  setInspectingDownloadId: (id: string | null) => void;

  startRealDownload: (
    url: string,
    savePath: string,
    fileName: string,
    maxConns: number
  ) => Promise<void>;
  togglePauseResume: (id: string) => Promise<void>;
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  deleteDownload: (id: string, deleteFile: boolean) => Promise<void>;
  openFolder: (id: string) => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  downloads: [],
  settings: {
    defaultDownloadDir: '',
    defaultMaxConns: 8,
    speedLimitBps: 0,
    maxConcurrentTasks: 4,
    shutdownWhenDone: false,
  },
  selectedId: null,
  activeCategory: 'all',
  searchQuery: '',
  isAddModalOpen: false,
  isSchedulerOpen: false,
  isOptionsOpen: false,
  inspectingDownloadId: null,

  initBackend: async () => {
    const [initialDownloads, settings] = await Promise.all([
      backendAPI.listDownloads(),
      backendAPI.getSettings(),
    ]);
    set({
      downloads: initialDownloads,
      settings,
      selectedId: initialDownloads[0]?.id ?? null,
    });

    const unsubscribe = backendAPI.onDownloadsUpdate((items) => {
      set((state) => ({
        downloads: items,
        selectedId:
          state.selectedId && items.some((i) => i.id === state.selectedId)
            ? state.selectedId
            : items[0]?.id ?? null,
      }));
    });

    // Fallback polling when Wails event listener isn't yet initialized
    const poll = setInterval(async () => {
      if (backendAPI.isWails()) {
        const list = await backendAPI.listDownloads();
        set({ downloads: list });
      }
    }, 500);

    return () => {
      unsubscribe();
      clearInterval(poll);
    };
  },

  setSelectedId: (id) => set({ selectedId: id }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setAddModalOpen: (open) => set({ isAddModalOpen: open }),
  setSchedulerOpen: (open) => set({ isSchedulerOpen: open }),
  setOptionsOpen: (open) => set({ isOptionsOpen: open }),
  setInspectingDownloadId: (id) => set({ inspectingDownloadId: id }),

  startRealDownload: async (url, savePath, fileName, maxConns) => {
    const created = await backendAPI.addDownload(url, savePath, fileName, maxConns);
    const updated = await backendAPI.listDownloads();
    set({
      downloads: updated,
      selectedId: created.id,
      isAddModalOpen: false,
      inspectingDownloadId: created.id,
    });
  },

  togglePauseResume: async (id) => {
    const item = get().downloads.find((d) => d.id === id);
    if (!item) return;
    if (item.status === 'downloading' || item.status === 'probing') {
      await backendAPI.pauseDownload(id);
    } else if (item.status === 'paused' || item.status === 'failed' || item.status === 'queued') {
      await backendAPI.resumeDownload(id);
    }
    const updated = await backendAPI.listDownloads();
    set({ downloads: updated });
  },

  pauseAll: async () => {
    await backendAPI.pauseAll();
    const updated = await backendAPI.listDownloads();
    set({ downloads: updated });
  },

  resumeAll: async () => {
    await backendAPI.resumeAll();
    const updated = await backendAPI.listDownloads();
    set({ downloads: updated });
  },

  deleteDownload: async (id, deleteFile) => {
    await backendAPI.cancelDownload(id, deleteFile);
    const updated = await backendAPI.listDownloads();
    set((state) => ({
      downloads: updated,
      selectedId: state.selectedId === id ? updated[0]?.id ?? null : state.selectedId,
      inspectingDownloadId:
        state.inspectingDownloadId === id ? null : state.inspectingDownloadId,
    }));
  },

  openFolder: async (id) => {
    await backendAPI.openFileLocation(id);
  },

  saveSettings: async (s) => {
    await backendAPI.updateSettings(s);
    set({ settings: s, isOptionsOpen: false, isSchedulerOpen: false });
  },
}));
