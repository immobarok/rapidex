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
    deleteSelected,
  } = useDownloadStore();

  const selectedItem = downloads.find((d) => d.id === selectedId);

  return (
    <header className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur">
      {/* Left Action Buttons (IDM Classic Toolbar) */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add URL
        </button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        <button
          disabled={!selectedItem || selectedItem.status === 'completed'}
          onClick={() => selectedId && togglePauseResume(selectedId)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-medium transition"
        >
          {selectedItem?.status === 'downloading' ? (
            <>
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              Resume
            </>
          )}
        </button>

        <button
          onClick={pauseAll}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition"
        >
          <Square className="w-3.5 h-3.5 text-rose-400" />
          Stop All
        </button>

        <button
          disabled={!selectedId}
          onClick={deleteSelected}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-800 disabled:opacity-40 text-slate-200 text-xs font-medium transition"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          Delete
        </button>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        <button
          onClick={() => setSchedulerOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition"
        >
          <CalendarClock className="w-3.5 h-3.5 text-sky-400" />
          Scheduler
        </button>

        <button
          onClick={() => setOptionsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs font-medium transition"
        >
          <Settings className="w-3.5 h-3.5 text-slate-400" />
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
          className="w-full pl-8 pr-3 py-1.5 bg-slate-950/90 border border-slate-800 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>
    </header>
  );
};
