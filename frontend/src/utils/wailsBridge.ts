import { DownloadItem } from '../types/download';

export interface ProbeResult {
  url: string;
  fileName: string;
  contentType: string;
  totalSize: number;
  acceptRanges: boolean;
}

export interface AppSettings {
  defaultDownloadDir: string;
  defaultMaxConns: number;
  speedLimitBps: number;
  maxConcurrentTasks: number;
  shutdownWhenDone: boolean;
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
          PauseDownload: (id: string) => Promise<void>;
          ResumeDownload: (id: string) => Promise<void>;
          PauseAll: () => Promise<void>;
          ResumeAll: () => Promise<void>;
          CancelDownload: (id: string, deleteFile: boolean) => Promise<void>;
          ListDownloads: () => Promise<DownloadItem[]>;
          OpenFileLocation: (id: string) => Promise<void>;
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
    };
  }
}

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

  addDownload: async (
    url: string,
    savePath: string,
    fileName: string,
    maxConns: number
  ): Promise<DownloadItem> => {
    if (window.go?.handlers?.DownloadHandler) {
      return await window.go.handlers.DownloadHandler.AddDownload(
        url,
        savePath,
        fileName,
        maxConns,
        {}
      );
    }
    throw new Error('Wails backend not connected. Run with `wails dev`.');
  },

  pauseDownload: async (id: string): Promise<void> => {
    await window.go?.handlers?.DownloadHandler?.PauseDownload(id);
  },

  resumeDownload: async (id: string): Promise<void> => {
    await window.go?.handlers?.DownloadHandler?.ResumeDownload(id);
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

  openFileLocation: async (id: string): Promise<void> => {
    await window.go?.handlers?.DownloadHandler?.OpenFileLocation(id);
  },

  getSettings: async (): Promise<AppSettings> => {
    if (window.go?.handlers?.SettingsHandler) {
      return await window.go.handlers.SettingsHandler.GetSettings();
    }
    return {
      defaultDownloadDir: '~/Downloads/Rappidex',
      defaultMaxConns: 8,
      speedLimitBps: 0,
      maxConcurrentTasks: 4,
      shutdownWhenDone: false,
    };
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
};

