import React, { useEffect, useState } from 'react';
import {
  ExternalLink,
  FolderOpen,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Copy,
  FileCheck,
  Plus,
} from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';
import { formatBytes, formatETA } from '../../utils/formatters';
import { ChunkVisualizer } from '../widgets/ChunkVisualizer';
import { DownloadItem, DownloadStatus } from '../../types/download';

function getFriendlyStatusLabel(item: DownloadItem): string {
  const status: DownloadStatus = item.status;
  switch (status) {
    case 'probing':
      return 'Connecting...';
    case 'queued':
      return 'In Queue';
    case 'downloading': {
      if (item.totalSize > 0) {
        const pct = Math.min(100, Math.round((item.downloaded / item.totalSize) * 100));
        return `Downloading (${pct}%)`;
      }
      return 'Downloading';
    }
    case 'paused':
      if (item.totalSize > 0 && item.downloaded > 0) {
        const pct = Math.min(100, Math.round((item.downloaded / item.totalSize) * 100));
        return `Paused (${pct}%)`;
      }
      return 'Paused';
    case 'completed':
      return 'Complete';
    case 'failed':
      return 'Error';
    default:
      return status;
  }
}

function formatDateShort(iso?: string): string {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
    setRefreshUrlItemId,
    openFile,
    openFolder,
    resumeDownload,
    pauseDownload,
    deleteDownload,
  } = useDownloadStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: DownloadItem;
  } | null>(null);

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const filtered = downloads.filter((item) => {
    if (activeCategory === 'unfinished' && item.status === 'completed') return false;
    if (activeCategory === 'finished' && item.status !== 'completed') return false;
    if (activeCategory.startsWith('unfinished:')) {
      const cat = activeCategory.split(':')[1];
      if (item.status === 'completed' || item.categoryId !== cat) return false;
    } else if (activeCategory.startsWith('finished:')) {
      const cat = activeCategory.split(':')[1];
      if (item.status !== 'completed' || item.categoryId !== cat) return false;
    } else if (activeCategory.startsWith('queue:')) {
      const qid = activeCategory.split(':')[1];
      if (item.queueId !== qid || item.status === 'completed') return false;
    } else if (
      activeCategory !== 'all' &&
      activeCategory !== 'unfinished' &&
      activeCategory !== 'finished' &&
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
    <main className="flex-1 flex flex-col bg-white overflow-hidden relative">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          {/* Classic IDM 8-Column Table Header */}
          <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-[11px] font-semibold text-slate-600 select-none z-10">
            <tr>
              <th className="py-2 px-3 border-r border-slate-200">File Name</th>
              <th className="py-2 px-2.5 border-r border-slate-200 w-16 text-center">Queue</th>
              <th className="py-2 px-2.5 border-r border-slate-200 w-24">Size</th>
              <th className="py-2 px-2.5 border-r border-slate-200 w-48">Status / Parts</th>
              <th className="py-2 px-2.5 border-r border-slate-200 w-24">Time Left</th>
              <th className="py-2 px-2.5 border-r border-slate-200 w-28">Transfer Rate</th>
              <th className="py-2 px-2.5 border-r border-slate-200 w-32">Last Try Date</th>
              <th className="py-2 px-3">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-24 text-center">
                  <div className="max-w-sm mx-auto space-y-3">
                    <div className="text-sm font-semibold text-slate-700">
                      No Downloads in This View
                    </div>
                    <p className="text-xs text-slate-400">
                      Click <strong>Add URL</strong> (or copy any download link to your clipboard) to start downloading with multi-part acceleration.
                    </p>
                    <button
                      onClick={() => setAddModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add URL
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((item) => {
                const isSelected = item.id === selectedId;
                const remainingBytes = Math.max(0, item.totalSize - item.downloaded);
                const etaSec = item.speedBps > 0 ? remainingBytes / item.speedBps : 0;

                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    onDoubleClick={() => {
                      if (item.status === 'completed') {
                        openFile(item.id);
                      } else {
                        setInspectingDownloadId(item.id);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedId(item.id);
                      setContextMenu({ x: e.clientX, y: e.clientY, item });
                    }}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-blue-50/90 text-slate-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <td className="py-2 px-3 max-w-xs border-r border-slate-100">
                      <div className="font-semibold text-slate-800 truncate" title={item.fileName}>
                        {item.fileName || 'Resolving file name...'}
                      </div>
                      {item.errorMessage ? (
                        <div
                          className="text-[10px] text-rose-600 truncate mt-0.5"
                          title={item.errorMessage}
                        >
                          {item.errorMessage}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 truncate" title={item.url}>
                          {item.originalUrl || item.url}
                        </div>
                      )}
                    </td>

                    <td className="py-2 px-2.5 text-center border-r border-slate-100 text-[11px] text-slate-500">
                      {item.queueId === 'main' ? 'Main' : item.queueId}
                    </td>

                    <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 border-r border-slate-100">
                      {item.totalSize > 0
                        ? formatBytes(item.totalSize)
                        : item.downloaded > 0
                        ? formatBytes(item.downloaded)
                        : 'Unknown'}
                    </td>

                    <td className="py-2 px-2.5 border-r border-slate-100">
                      <div className="flex items-center justify-between text-[10px] mb-1">
                        <span
                          className={`font-semibold ${
                            item.status === 'completed'
                              ? 'text-emerald-700'
                              : item.status === 'failed'
                              ? 'text-rose-600'
                              : item.status === 'downloading'
                              ? 'text-blue-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {getFriendlyStatusLabel(item)}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {formatBytes(item.downloaded)}
                        </span>
                      </div>
                      <ChunkVisualizer
                        chunks={item.chunks || []}
                        completed={item.status === 'completed'}
                      />
                    </td>

                    <td className="py-2 px-2.5 font-mono text-[11px] text-slate-500 border-r border-slate-100">
                      {item.status === 'downloading' ? formatETA(etaSec) : '--'}
                    </td>

                    <td className="py-2 px-2.5 font-mono text-[11px] font-medium text-emerald-600 border-r border-slate-100">
                      {item.speedBps > 0 ? `${formatBytes(item.speedBps)}/sec` : '--'}
                    </td>

                    <td className="py-2 px-2.5 text-[11px] text-slate-500 border-r border-slate-100">
                      {formatDateShort(item.lastTryAt || item.createdAt)}
                    </td>

                    <td className="py-2 px-3 text-[11px] text-slate-500 truncate max-w-[180px]">
                      {item.description || '--'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* IDM Right-Click Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-56 bg-white border border-slate-200 rounded-lg shadow-xl py-1 text-xs text-slate-700"
        >
          {contextMenu.item.status === 'completed' && (
            <ContextItem
              icon={<FileCheck className="w-3.5 h-3.5 text-emerald-600" />}
              label="Open File"
              onClick={() => openFile(contextMenu.item.id)}
            />
          )}
          <ContextItem
            icon={<FolderOpen className="w-3.5 h-3.5 text-blue-600" />}
            label="Open Folder (Show in Finder)"
            onClick={() => openFolder(contextMenu.item.id)}
          />
          <ContextItem
            icon={<ExternalLink className="w-3.5 h-3.5 text-indigo-600" />}
            label="Show Progress / Properties"
            onClick={() => setInspectingDownloadId(contextMenu.item.id)}
          />

          <div className="my-1 border-t border-slate-100" />

          {contextMenu.item.status !== 'completed' && (
            <>
              <ContextItem
                icon={<Play className="w-3.5 h-3.5 text-emerald-600" />}
                label="Resume Download"
                onClick={() => resumeDownload(contextMenu.item.id)}
              />
              <ContextItem
                icon={<Pause className="w-3.5 h-3.5 text-amber-600" />}
                label="Stop Download"
                onClick={() => pauseDownload(contextMenu.item.id)}
              />
              <ContextItem
                icon={<RefreshCw className="w-3.5 h-3.5 text-sky-600" />}
                label="Refresh Download Address..."
                onClick={() => setRefreshUrlItemId(contextMenu.item.id)}
              />
              <div className="my-1 border-t border-slate-100" />
            </>
          )}

          <ContextItem
            icon={<Copy className="w-3.5 h-3.5 text-slate-500" />}
            label="Copy Download Address"
            onClick={() => {
              navigator.clipboard?.writeText(
                contextMenu.item.originalUrl || contextMenu.item.url
              );
            }}
          />

          <div className="my-1 border-t border-slate-100" />

          <ContextItem
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
            label="Remove from List"
            onClick={() => deleteDownload(contextMenu.item.id, false)}
          />
          <ContextItem
            icon={<Trash2 className="w-3.5 h-3.5 text-rose-700" />}
            label="Delete File from Disk"
            onClick={() => deleteDownload(contextMenu.item.id, true)}
          />
        </div>
      )}
    </main>
  );
};

const ContextItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700 text-left cursor-pointer"
  >
    {icon}
    <span>{label}</span>
  </button>
);
