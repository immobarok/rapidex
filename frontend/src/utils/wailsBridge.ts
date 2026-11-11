import { DownloadItem, QueueConfig } from '../types/download';

export interface ProbeResult {
  url: string;
  fileName: string;
  contentType: string;
  totalSize: number;
  acceptRanges: boolean;
  isWebPage?: boolean;
}

export interface SiteLogin {
  pattern: string;
  username: string;
  password: string;
}

export interface ProxySettings {
  mode: string;
  url: string;
}

export interface AppSettings {
  defaultDownloadDir: string;
  categoryDirs: Record<string, string>;
  defaultMaxConns: number;
  speedLimitBps: number;
  maxRetries: number;
  retryDelaySec: number;
  showFileInfoDialog: boolean;
  showProgressDialog: boolean;
  showCompleteDialog: boolean;
  monitorClipboard: boolean;
  browserIntegration: boolean;
  duplicateAction: string;
  proxy: ProxySettings;
  siteLogins: SiteLogin[];
  catchExtensions: string[];
}

export interface AddDownloadOptions {
  url: string;
  fileName: string;
  savePath: string;
  categoryId: string;
  queueId: string;
  description: string;
  referer: string;
  maxConns: number;
  startNow: boolean;
  headers: Record<string, string>;
}

export interface BatchOptions {
  pattern: string;
  from: number;
  to: number;
  wildcardLen: number;
  savePath: string;
  categoryId: string;
  queueId: string;
  startNow: boolean;
}

declare global {
  interface Window {
    go?: {
      app?: {
        App?: {
          SelectDirectory: (defaultDir: string) => Promise<string>;
        };
      };
      handlers?: {
        DownloadHandler?: {
          ProbeURL: (url: string, headers: Record<string, string>) => Promise<ProbeResult>;
          AddDownload: (
            url: string,
            savePath: string,
            fileName: string,
            maxConns: number,
            headers: Record<string, string>
          ) => Promise<DownloadItem>;
          AddDownloadWithOptions: (opts: AddDownloadOptions) => Promise<DownloadItem>;
          AddBatchDownloads: (opts: BatchOptions) => Promise<DownloadItem[]>;
          PauseDownload: (id: string) => Promise<void>;
          ResumeDownload: (id: string) => Promise<void>;
          RefreshDownloadURL: (id: string, newURL: string) => Promise<void>;
          SetTaskSpeedLimit: (id: string, bytesPerSec: number) => Promise<void>;
          PauseAll: () => Promise<void>;
          ResumeAll: () => Promise<void>;
          CancelDownload: (id: string, deleteFile: boolean) => Promise<void>;
          DeleteCompleted: () => Promise<number>;
          ListDownloads: () => Promise<DownloadItem[]>;
          OpenFile: (id: string) => Promise<void>;
          OpenFileLocation: (id: string) => Promise<void>;
        };
        QueueHandler?: {
          ListQueues: () => Promise<QueueConfig[]>;
          SaveQueue: (q: QueueConfig) => Promise<QueueConfig>;
          DeleteQueue: (id: string) => Promise<void>;
          StartQueue: (id: string) => Promise<void>;
          StopQueue: (id: string) => Promise<void>;
        };
        SettingsHandler?: {
          GetSettings: () => Promise<AppSettings>;
          UpdateSettings: (s: AppSettings) => Promise<void>;
          SetGlobalSpeedLimit: (bps: number) => Promise<void>;
        };
      };
    };
    runtime?: {
      EventsOnMultiple: (
        eventName: string,
        callback: (...data: any[]) => void,
        maxCallbacks: number
      ) => () => void;
      ClipboardSetText?: (text: string) => Promise<void>;
    };
  }
}

export const defaultAppSettings: AppSettings = {
  defaultDownloadDir: '~/Downloads/Rappidex',
  categoryDirs: {},
  defaultMaxConns: 8,
  speedLimitBps: 0,
  maxRetries: 5,
  retryDelaySec: 3,
  showFileInfoDialog: true,
  showProgressDialog: true,
  showCompleteDialog: true,
  monitorClipboard: true,
  browserIntegration: true,
  duplicateAction: 'rename',
  proxy: { mode: 'system', url: '' },
  siteLogins: [],
  catchExtensions: ['mp4', 'mkv', 'mp3', 'zip', 'rar', '7z', 'pdf', 'dmg', 'exe', 'iso'],
};

export const backendAPI = {
  isWails: () => Boolean(window.go?.handlers?.DownloadHandler),

  listDownloads: async (): Promise<DownloadItem[]> => {
    if (window.go?.handlers?.DownloadHandler) {
      const list = await window.go.handlers.DownloadHandler.ListDownloads();
      return list || [];
    }
    return [];
  },

  probeURL: async (url: string): Promise<ProbeResult> => {
    if (window.go?.handlers?.DownloadHandler) {
      return await window.go.handlers.DownloadHandler.ProbeURL(url, {});
    }
    throw new Error('Wails backend not connected. Run with `wails dev`.');
  },

  addDownloadWithOptions: async (opts: AddDownloadOptions): Promise<DownloadItem> => {
    if (window.go?.handlers?.DownloadHandler) {
      return await window.go.handlers.DownloadHandler.AddDownloadWithOptions(opts);
    }
    throw new Error('Wails backend not connected. Run with `wails dev`.');
  },

  addBatchDownloads: async (opts: BatchOptions): Promise<DownloadItem[]> => {
    if (window.go?.handlers?.DownloadHandler) {
      return await window.go.handlers.DownloadHandler.AddBatchDownloads(opts);
    }
    throw new Error('Wails backend not connected. Run with `wails dev`.');
  },

  pauseDownload: async (id: string): Promise<void> => {
    await window.go?.handlers?.DownloadHandler?.PauseDownload(id);
  },

  resumeDownload: async (id: string): Promise<void> => {
    await window.go?.handlers?.DownloadHandler?.ResumeDownload(id);
  },

  refreshDownloadURL: async (id: string, newURL: string): Promise<void> => {
    await window.go?.handlers?.DownloadHandler?.RefreshDownloadURL(id, newURL);
  },

  setTaskSpeedLimit: async (id: string, bps: number): Promise<void> => {
    await window.go?.handlers?.DownloadHandler?.SetTaskSpeedLimit(id, bps);
  },

  pauseAll: async (): Promise<void> => {
    await window.go?.handlers?.DownloadHandler?.PauseAll();
  },

  resumeAll: async (): Promise<void> => {
    await window.go?.handlers?.DownloadHandler?.ResumeAll();
  },

  cancelDownload: async (id: string, deleteFile: boolean): Promise<void> => {
    await window.go?.handlers?.DownloadHandler?.CancelDownload(id, deleteFile);
  },

  deleteCompleted: async (): Promise<number> => {
    return (await window.go?.handlers?.DownloadHandler?.DeleteCompleted()) ?? 0;
  },

  openFile: async (id: string): Promise<void> => {
    await window.go?.handlers?.DownloadHandler?.OpenFile(id);
  },

  openFileLocation: async (id: string): Promise<void> => {
    await window.go?.handlers?.DownloadHandler?.OpenFileLocation(id);
  },

  listQueues: async (): Promise<QueueConfig[]> => {
    if (window.go?.handlers?.QueueHandler) {
      return (await window.go.handlers.QueueHandler.ListQueues()) || [];
    }
    return [
      {
        id: 'main',
        name: 'Main Download Queue',
        maxConcurrent: 2,
        afterDone: 'nothing',
        schedule: { startEnabled: false, startTime: '02:00', stopEnabled: false, stopTime: '08:00', days: [] },
        running: false,
        builtin: true,
      },
    ];
  },

  saveQueue: async (q: QueueConfig): Promise<QueueConfig> => {
    if (window.go?.handlers?.QueueHandler) {
      return await window.go.handlers.QueueHandler.SaveQueue(q);
    }
    return q;
  },

  deleteQueue: async (id: string): Promise<void> => {
    await window.go?.handlers?.QueueHandler?.DeleteQueue(id);
  },

  startQueue: async (id: string): Promise<void> => {
    await window.go?.handlers?.QueueHandler?.StartQueue(id);
  },

  stopQueue: async (id: string): Promise<void> => {
    await window.go?.handlers?.QueueHandler?.StopQueue(id);
  },

  getSettings: async (): Promise<AppSettings> => {
    if (window.go?.handlers?.SettingsHandler) {
      return await window.go.handlers.SettingsHandler.GetSettings();
    }
    return defaultAppSettings;
  },

  updateSettings: async (s: AppSettings): Promise<void> => {
    await window.go?.handlers?.SettingsHandler?.UpdateSettings(s);
  },

  selectDirectory: async (defaultDir: string): Promise<string> => {
    if (window.go?.app?.App?.SelectDirectory) {
      return await window.go.app.App.SelectDirectory(defaultDir);
    }
    return defaultDir;
  },

  onDownloadsUpdate: (cb: (items: DownloadItem[]) => void): (() => void) => {
    if (window.runtime?.EventsOnMultiple) {
      return window.runtime.EventsOnMultiple(
        'downloads:update',
        (items: DownloadItem[]) => {
          cb(items || []);
        },
        -1
      );
    }
    return () => {};
  },

  onDownloadCompleted: (cb: (item: DownloadItem) => void): (() => void) => {
    if (window.runtime?.EventsOnMultiple) {
      return window.runtime.EventsOnMultiple('download:completed', cb, -1);
    }
    return () => {};
  },

  onClipboardURL: (cb: (url: string) => void): (() => void) => {
    if (window.runtime?.EventsOnMultiple) {
      return window.runtime.EventsOnMultiple('clipboard:url', cb, -1);
    }
    return () => {};
  },
};
