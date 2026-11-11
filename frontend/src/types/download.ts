export type DownloadStatus =
  | 'queued'
  | 'probing'
  | 'downloading'
  | 'paused'
  | 'merging'
  | 'completed'
  | 'failed';

export interface ChunkState {
  id: number;
  startByte: number;
  currentPos: number;
  endByte: number;
  active: boolean;
}

export interface DownloadItem {
  id: string;
  url: string;
  fileName: string;
  savePath: string;
  categoryId: string;
  queueId: string;
  totalSize: number;
  downloaded: number;
  speedBps: number;
  acceptRanges: boolean;
  status: DownloadStatus;
  maxConns: number;
  chunks: ChunkState[];
}

