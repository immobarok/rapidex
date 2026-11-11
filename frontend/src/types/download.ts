export type DownloadStatus =
  | 'queued'
  | 'probing'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed';

export interface ChunkState {
  id: number;
  startByte: number;
  currentPos: number;
  endByte: number;
  active: boolean;
  retries?: number;
  info?: string;
}

export interface DownloadItem {
  id: string;
  url: string;
  originalUrl?: string;
  fileName: string;
  savePath: string;
  categoryId: string;
  queueId: string;
  queuePosition?: number;
  description?: string;
  referer?: string;
  totalSize: number;
  downloaded: number;
  speedBps: number;
  speedLimitBps?: number;
  acceptRanges: boolean;
  status: DownloadStatus;
  maxConns: number;
  chunks: ChunkState[];
  errorMessage?: string;
  createdAt?: string;
  lastTryAt?: string;
  completedAt?: string;
}

export interface QueueSchedule {
  startEnabled: boolean;
  startTime: string;
  stopEnabled: boolean;
  stopTime: string;
  days: number[];
}

export interface QueueConfig {
  id: string;
  name: string;
  maxConcurrent: number;
  afterDone: string;
  schedule: QueueSchedule;
  running: boolean;
  builtin: boolean;
}
