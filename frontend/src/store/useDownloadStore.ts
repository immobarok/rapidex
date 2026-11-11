import { create } from 'zustand';
import { DownloadItem } from '../types/download';

interface DownloadStore {
  downloads: DownloadItem[];
  selectedId: string | null;
  activeCategory: string;
  searchQuery: string;
  isAddModalOpen: boolean;
  isSchedulerOpen: boolean;
  isOptionsOpen: boolean;
  inspectingDownloadId: string | null;
  globalSpeedLimitBps: number;

  setSelectedId: (id: string | null) => void;
  setActiveCategory: (category: string) => void;
  setSearchQuery: (q: string) => void;
  setAddModalOpen: (open: boolean) => void;
  setSchedulerOpen: (open: boolean) => void;
  setOptionsOpen: (open: boolean) => void;
  setInspectingDownloadId: (id: string | null) => void;
  addMockDownload: (url: string, fileName: string, maxConns: number) => void;
  togglePauseResume: (id: string) => void;
  pauseAll: () => void;
  deleteSelected: () => void;
}

const initialMockDownloads: DownloadItem[] = [
  {
    id: 'dl_1',
    url: 'https://releases.ubuntu.com/24.04/ubuntu-24.04.1-desktop-amd64.iso',
    fileName: 'ubuntu-24.04.1-desktop-amd64.iso',
    savePath: '~/Downloads/Rappidex/Programs',
    categoryId: 'programs',
    queueId: 'main',
    totalSize: 5_153_960_755,
    downloaded: 3_412_104_200,
    speedBps: 48_500_000,
    acceptRanges: true,
    status: 'downloading',
    maxConns: 8,
    chunks: [
      { id: 0, startByte: 0, currentPos: 580_000_000, endByte: 644_245_094, active: true },
      { id: 1, startByte: 644_245_095, currentPos: 1_120_000_000, endByte: 1_288_490_188, active: true },
      { id: 2, startByte: 1_288_490_189, currentPos: 1_850_000_000, endByte: 1_932_735_282, active: true },
      { id: 3, startByte: 1_932_735_283, currentPos: 2_310_000_000, endByte: 2_576_980_376, active: true },
      { id: 4, startByte: 2_576_980_377, currentPos: 3_100_000_000, endByte: 3_221_225_470, active: true },
      { id: 5, startByte: 3_221_225_471, currentPos: 3_620_000_000, endByte: 3_865_470_564, active: true },
      { id: 6, startByte: 3_865_470_565, currentPos: 4_290_000_000, endByte: 4_509_715_658, active: true },
      { id: 7, startByte: 4_509_715_659, currentPos: 4_910_000_000, endByte: 5_153_960_755, active: true },
    ],
  },
  {
    id: 'dl_2',
    url: 'https://cdn.blender.org/release/Blender4.2/blender-4.2.3-macos-arm64.dmg',
    fileName: 'blender-4.2.3-macos-arm64.dmg',
    savePath: '~/Downloads/Rappidex/Programs',
    categoryId: 'programs',
    queueId: 'main',
    totalSize: 334_455_320,
    downloaded: 334_455_320,
    speedBps: 0,
    acceptRanges: true,
    status: 'completed',
    maxConns: 8,
    chunks: [],
  },
  {
    id: 'dl_3',
    url: 'https://media.example.com/4k-nature-documentary-hdr.mkv',
    fileName: '4k-nature-documentary-hdr.mkv',
    savePath: '~/Downloads/Rappidex/Video',
    categoryId: 'video',
    queueId: 'main',
    totalSize: 2_147_483_648,
    downloaded: 845_120_000,
    speedBps: 0,
    acceptRanges: true,
    status: 'paused',
    maxConns: 16,
    chunks: [
      { id: 0, startByte: 0, currentPos: 250_000_000, endByte: 536_870_912, active: false },
      { id: 1, startByte: 536_870_913, currentPos: 740_000_000, endByte: 1_073_741_824, active: false },
      { id: 2, startByte: 1_073_741_825, currentPos: 1_310_000_000, endByte: 1_610_612_736, active: false },
      { id: 3, startByte: 1_610_612_737, currentPos: 1_820_000_000, endByte: 2_147_483_648, active: false },
    ],
  },
];

export const useDownloadStore = create<DownloadStore>((set) => ({
  downloads: initialMockDownloads,
  selectedId: 'dl_1',
  activeCategory: 'all',
  searchQuery: '',
  isAddModalOpen: false,
  isSchedulerOpen: false,
  isOptionsOpen: false,
  inspectingDownloadId: null,
  globalSpeedLimitBps: 0,

  setSelectedId: (id) => set({ selectedId: id }),
  setActiveCategory: (category) => set({ activeCategory: category }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setAddModalOpen: (open) => set({ isAddModalOpen: open }),
  setSchedulerOpen: (open) => set({ isSchedulerOpen: open }),
  setOptionsOpen: (open) => set({ isOptionsOpen: open }),
  setInspectingDownloadId: (id) => set({ inspectingDownloadId: id }),

  addMockDownload: (url, fileName, maxConns) =>
    set((state) => {
      const size = 524_288_000;
      const chunkSize = Math.floor(size / maxConns);
      const chunks = Array.from({ length: maxConns }, (_, i) => ({
        id: i,
        startByte: i * chunkSize,
        currentPos: i * chunkSize,
        endByte: i === maxConns - 1 ? size - 1 : (i + 1) * chunkSize - 1,
        active: true,
      }));
      const newItem: DownloadItem = {
        id: `dl_${Date.now()}`,
        url,
        fileName: fileName || url.split('/').pop() || 'download.bin',
        savePath: '~/Downloads/Rappidex',
        categoryId: 'compressed',
        queueId: 'main',
        totalSize: size,
        downloaded: 0,
        speedBps: 18_400_000,
        acceptRanges: true,
        status: 'downloading',
        maxConns,
        chunks,
      };
      return { downloads: [newItem, ...state.downloads], selectedId: newItem.id, isAddModalOpen: false };
    }),

  togglePauseResume: (id) =>
    set((state) => ({
      downloads: state.downloads.map((d) => {
        if (d.id !== id) return d;
        if (d.status === 'downloading') {
          return { ...d, status: 'paused', speedBps: 0 };
        }
        if (d.status === 'paused' || d.status === 'failed') {
          return { ...d, status: 'downloading', speedBps: 32_100_000 };
        }
        return d;
      }),
    })),

  pauseAll: () =>
    set((state) => ({
      downloads: state.downloads.map((d) =>
        d.status === 'downloading' ? { ...d, status: 'paused', speedBps: 0 } : d
      ),
    })),

  deleteSelected: () =>
    set((state) => ({
      downloads: state.downloads.filter((d) => d.id !== state.selectedId),
      selectedId: null,
    })),
}));

