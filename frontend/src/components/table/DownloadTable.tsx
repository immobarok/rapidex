import React from 'react';
import { ExternalLink, FolderOpen, Plus } from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';
import { formatBytes, formatETA } from '../../utils/formatters';
import { ChunkVisualizer } from '../widgets/ChunkVisualizer';
import { DownloadStatus } from '../../types/download';

function getFriendlyStatusLabel(status: DownloadStatus): string {
  switch (status) {
    case 'probing':
      return 'Preparing...';
    case 'queued':
      return 'Waiting';
    case 'downloading':
      return 'Downloading';
    case 'paused':
      return 'Paused';
    case 'merging':
      return 'Finishing up...';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Needs Attention';
    default:
      return status;
  }
}

function getSpeedBoostLabel(maxConns: number): string {
  if (maxConns <= 1) return 'Normal Speed';
  if (maxConns <= 4) return 'Fast (4x Boost)';
  if (maxConns <= 8) return 'Turbo (8x Boost)';
  if (maxConns <= 16) return 'Super Fast (16x Boost)';
  return 'Maximum (32x Boost)';
}

export const DownloadTable: React.FC = () => {
  const {
    downloads,
    selectedId,
    activeCategory,
    searchQuery,
    setSelectedId,
    setInspectingDownloadId,
    setAddModalOpen,
    openFolder,
  } = useDownloadStore();

  const filtered = downloads.filter((item) => {
    if (activeCategory === 'unfinished' && item.status === 'completed') return false;
    if (activeCategory === 'finished' && item.status !== 'completed') return false;
    if (
      activeCategory !== 'all' &&
      activeCategory !== 'unfinished' &&
      activeCategory !== 'finished' &&
      !activeCategory.startsWith('queue:') &&
      item.categoryId !== activeCategory
    ) {
      return false;
    }
    if (searchQuery && !item.fileName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <main className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 select-none z-10">
            <tr>
              <th className="py-2.5 px-4 font-semibold">File Name</th>
              <th className="py-2.5 px-3 font-semibold w-28">File Size</th>
              <th className="py-2.5 px-3 font-semibold w-56">Download Progress</th>
              <th className="py-2.5 px-3 font-semibold w-32">Status</th>
              <th className="py-2.5 px-3 font-semibold w-28">Speed</th>
              <th className="py-2.5 px-3 font-semibold w-28">Time Remaining</th>
              <th className="py-2.5 px-3 font-semibold w-20 text-center">Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-24 text-center">
                  <div className="max-w-sm mx-auto space-y-3">
                    <div className="text-sm font-semibold text-slate-700">
                      Your Download List is Empty
                    </div>
                    <p className="text-xs text-slate-400">
                      Click <strong>New Download</strong> and paste any file link from the web to start downloading right away.
                    </p>
                    <button
                      onClick={() => setAddModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      New Download
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isSelected = item.id === selectedId;
                const pct =
                  item.totalSize > 0
                    ? Math.min(100, Math.round((item.downloaded / item.totalSize) * 100))
                    : item.status === 'completed'
                    ? 100
                    : 0;
                const remainingBytes = Math.max(0, item.totalSize - item.downloaded);
                const etaSec = item.speedBps > 0 ? remainingBytes / item.speedBps : 0;

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    onDoubleClick={() => setInspectingDownloadId(item.id)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50/90 text-slate-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <td className="py-2.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate" title={item.fileName}>
                        {item.fileName || 'Getting file name...'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate" title={item.url}>
                        {item.url}
                      </div>
                      {item.errorMessage && (
                        <div className="text-[10px] text-rose-600 truncate mt-0.5" title={item.errorMessage}>
                          Could not download: {item.errorMessage}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      {item.totalSize > 0
                        ? formatBytes(item.totalSize)
                        : item.downloaded > 0
                        ? formatBytes(item.downloaded)
                        : 'Calculating...'}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-between text-[10px] mb-1 text-slate-500">
                        <span className="font-semibold text-slate-700">{pct}%</span>
                        <span>
                          {formatBytes(item.downloaded)} • {getSpeedBoostLabel(item.maxConns)}
                        </span>
                      </div>
                      <ChunkVisualizer
                        chunks={item.chunks || []}
                        completed={item.status === 'completed'}
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          item.status === 'downloading' || item.status === 'probing'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : item.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : item.status === 'failed'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {getFriendlyStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] font-medium text-emerald-600">
                      {item.speedBps > 0 ? `${formatBytes(item.speedBps)}/s` : '--'}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {item.status === 'downloading' ? formatETA(etaSec) : '--'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFolder(item.id);
                          }}
                          title="Show in Folder"
                          className="p-1.5 rounded-md hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingDownloadId(item.id);
                          }}
                          title="View Download Details"
                          className="p-1.5 rounded-md hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
};
