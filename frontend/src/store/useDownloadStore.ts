import { create } from 'zustand';
import { DownloadItem, QueueConfig } from '../types/download';
import {
  AddDownloadOptions,
  AppSettings,
  BatchOptions,
  backendAPI,
  defaultAppSettings,
} from '../utils/wailsBridge';

interface DownloadStore {
  downloads: DownloadItem[];
  queues: QueueConfig[];
  settings: AppSettings;
  selectedId: string | null;
  activeCategory: string;
  searchQuery: string;

  // Dialog states
  isAddModalOpen: boolean;
  prefillUrl: string;
  isBatchModalOpen: boolean;
  isSchedulerOpen: boolean;
  isOptionsOpen: boolean;
  inspectingDownloadId: string | null;
  completedDialogItem: DownloadItem | null;
  refreshUrlItemId: string | null;

  initBackend: () => Promise<() => void>;
  setSelectedId: (id: string | null) => void;
  setActiveCategory: (category: string) => void;
  setSearchQuery: (q: string) => void;
  setAddModalOpen: (open: boolean, url?: string) => void;
  setBatchModalOpen: (open: boolean) => void;
  setSchedulerOpen: (open: boolean) => void;
  setOptionsOpen: (open: boolean) => void;
  setInspectingDownloadId: (id: string | null) => void;
  setCompletedDialogItem: (item: DownloadItem | null) => void;
  setRefreshUrlItemId: (id: string | null) => void;

  addDownloadWithOptions: (opts: AddDownloadOptions) => Promise<void>;
  addBatchDownloads: (opts: BatchOptions) => Promise<void>;
  togglePauseResume: (id: string) => Promise<void>;
  pauseDownload: (id: string) => Promise<void>;
  resumeDownload: (id: string) => Promise<void>;
  pauseAll: () => Promise<void>;
  resumeAll: () => Promise<void>;
  deleteDownload: (id: string, deleteFile: boolean) => Promise<void>;
  deleteCompleted: () => Promise<void>;
  openFile: (id: string) => Promise<void>;
  openFolder: (id: string) => Promise<void>;
  refreshDownloadURL: (id: string, newUrl: string) => Promise<void>;
  setTaskSpeedLimit: (id: string, bps: number) => Promise<void>;
  saveSettings: (s: AppSettings) => Promise<void>;
  saveQueue: (q: QueueConfig) => Promise<void>;
  startQueue: (id: string) => Promise<void>;
  stopQueue: (id: string) => Promise<void>;
}

export const useDownloadStore = create<DownloadStore>((set, get) => ({
  downloads: [],
  queues: [],
  settings: defaultAppSettings,
  selectedId: null,
  activeCategory: 'all',
  searchQuery: '',

  isAddModalOpen: false,
  prefillUrl: '',
  isBatchModalOpen: false,
  isSchedulerOpen: false,
  isOptionsOpen: false,
  inspectingDownloadId: null,
  completedDialogItem: null,
  refreshUrlItemId: null,

  initBackend: async () => {
    const [initialDownloads, settings, queues] = await Promise.all([
      backendAPI.listDownloads(),
      backendAPI.getSettings(),
      backendAPI.listQueues(),
    ]);
    set({
      downloads: initialDownloads,
      settings,
      queues,
      selectedId: initialDownloads[0]?.id ?? null,
    });

    const unsubUpdate = backendAPI.onDownloadsUpdate((items) => {
      set((state) => ({
        downloads: items,
        selectedId:
          state.selectedId && items.some((i) => i.id === state.selectedId)
            ? state.selectedId
            : items[0]?.id ?? null,
      }));
    });

    const unsubComplete = backendAPI.onDownloadCompleted((item) => {
      if (get().settings.showCompleteDialog) {
        set({ completedDialogItem: item });
      }
    });

    const unsubClipboard = backendAPI.onClipboardURL((url) => {
      if (!get().isAddModalOpen) {
        set({ isAddModalOpen: true, prefillUrl: url });
      }
    });

    return () => {
      unsubUpdate();
      unsubComplete();
      unsubClipboard();
    };
  },

  setSelectedId: (id) => set({ selectedId: id }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setAddModalOpen: (open, url = '') => set({ isAddModalOpen: open, prefillUrl: url }),
  setBatchModalOpen: (open) => set({ isBatchModalOpen: open }),
  setSchedulerOpen: (open) => set({ isSchedulerOpen: open }),
  setOptionsOpen: (open) => set({ isOptionsOpen: open }),
  setInspectingDownloadId: (id) => set({ inspectingDownloadId: id }),
  setCompletedDialogItem: (item) => set({ completedDialogItem: item }),
  setRefreshUrlItemId: (id) => set({ refreshUrlItemId: id }),

  addDownloadWithOptions: async (opts) => {
    const created = await backendAPI.addDownloadWithOptions(opts);
    const updated = await backendAPI.listDownloads();
    const showProgress = get().settings.showProgressDialog && opts.startNow;
    set({
      downloads: updated,
      selectedId: created.id,
      isAddModalOpen: false,
      prefillUrl: '',
      inspectingDownloadId: showProgress ? created.id : null,
    });
  },

  addBatchDownloads: async (opts) => {
    await backendAPI.addBatchDownloads(opts);
    const updated = await backendAPI.listDownloads();
    set({ downloads: updated, isBatchModalOpen: false });
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

  pauseDownload: async (id) => {
    await backendAPI.pauseDownload(id);
    set({ downloads: await backendAPI.listDownloads() });
  },

  resumeDownload: async (id) => {
    await backendAPI.resumeDownload(id);
    set({ downloads: await backendAPI.listDownloads() });
  },

  pauseAll: async () => {
    await backendAPI.pauseAll();
    set({ downloads: await backendAPI.listDownloads() });
  },

  resumeAll: async () => {
    await backendAPI.resumeAll();
    set({ downloads: await backendAPI.listDownloads() });
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

  deleteCompleted: async () => {
    await backendAPI.deleteCompleted();
    set({ downloads: await backendAPI.listDownloads() });
  },

  openFile: async (id) => {
    await backendAPI.openFile(id);
  },

  openFolder: async (id) => {
    await backendAPI.openFileLocation(id);
  },

  refreshDownloadURL: async (id, newUrl) => {
    await backendAPI.refreshDownloadURL(id, newUrl);
    await backendAPI.resumeDownload(id);
    set({
      downloads: await backendAPI.listDownloads(),
      refreshUrlItemId: null,
    });
  },

  setTaskSpeedLimit: async (id, bps) => {
    await backendAPI.setTaskSpeedLimit(id, bps);
    set({ downloads: await backendAPI.listDownloads() });
  },

  saveSettings: async (s) => {
    await backendAPI.updateSettings(s);
    set({ settings: s, isOptionsOpen: false });
  },

  saveQueue: async (q) => {
    await backendAPI.saveQueue(q);
    set({ queues: await backendAPI.listQueues() });
  },

  startQueue: async (id) => {
    await backendAPI.startQueue(id);
    set({
      queues: await backendAPI.listQueues(),
      downloads: await backendAPI.listDownloads(),
    });
  },

  stopQueue: async (id) => {
    await backendAPI.stopQueue(id);
    set({
      queues: await backendAPI.listQueues(),
      downloads: await backendAPI.listDownloads(),
    });
  },
}));
