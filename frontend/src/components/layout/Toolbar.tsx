import React from 'react';
import {
  Plus,
  Play,
  Pause,
  Square,
  Trash2,
  CalendarClock,
  Settings,
  Search,
  FolderOpen,
} from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';

export const Toolbar: React.FC = () => {
  const {
    selectedId,
    downloads,
    searchQuery,
    setSearchQuery,
    setAddModalOpen,
    setSchedulerOpen,
    setOptionsOpen,
    togglePauseResume,
    pauseAll,
    deleteDownload,
    openFolder,
  } = useDownloadStore();

  const selectedItem = downloads.find((d) => d.id === selectedId);
  const isRunning =
    selectedItem?.status === 'downloading' || selectedItem?.status === 'probing';

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200">
      {/* Left Action Buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-medium shadow-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add URL
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        <button
          disabled={!selectedItem || selectedItem.status === 'completed'}
          onClick={() => selectedId && togglePauseResume(selectedId)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-medium transition cursor-pointer disabled:cursor-not-allowed"
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 text-amber-600" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-600" />
              Resume
            </>
          )}
        </button>

        <button
          onClick={pauseAll}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
        >
          <Square className="w-3.5 h-3.5 text-rose-600" />
          Stop All
        </button>

        <button
          disabled={!selectedItem}
          onClick={() => selectedId && openFolder(selectedId)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 text-xs font-medium transition cursor-pointer disabled:cursor-not-allowed"
        >
          <FolderOpen className="w-3.5 h-3.5 text-blue-600" />
          Open Folder
        </button>

        <button
          disabled={!selectedId}
          onClick={() => selectedId && deleteDownload(selectedId, false)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700 disabled:opacity-40 text-slate-700 text-xs font-medium transition cursor-pointer disabled:cursor-not-allowed"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-500" />
          Remove
        </button>

        <div className="h-5 w-px bg-slate-200 mx-1" />

        <button
          onClick={() => setSchedulerOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
        >
          <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
          Queues
        </button>

        <button
          onClick={() => setOptionsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5 text-slate-600" />
          Options
        </button>
      </div>

      {/* Right Search Filter */}
      <div className="relative w-64">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search downloads..."
          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 transition"
        />
      </div>
    </header>
  );
};
