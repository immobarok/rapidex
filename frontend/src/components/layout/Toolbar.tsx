import React from 'react';
import {
  Plus,
  Play,
  Pause,
  Square,
  Trash2,
  CheckCheck,
  CalendarClock,
  Settings,
  Search,
  PlayCircle,
  StopCircle,
  Layers,
} from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';

export const Toolbar: React.FC = () => {
  const {
    selectedId,
    downloads,
    queues,
    searchQuery,
    setSearchQuery,
    setAddModalOpen,
    setBatchModalOpen,
    setSchedulerOpen,
    setOptionsOpen,
    resumeDownload,
    pauseDownload,
    pauseAll,
    deleteDownload,
    deleteCompleted,
    startQueue,
    stopQueue,
  } = useDownloadStore();

  const selectedItem = downloads.find((d) => d.id === selectedId);
  const canResume =
    selectedItem &&
    (selectedItem.status === 'paused' ||
      selectedItem.status === 'failed' ||
      selectedItem.status === 'queued');
  const canPause =
    selectedItem &&
    (selectedItem.status === 'downloading' || selectedItem.status === 'probing');

  const mainQueue = queues[0];
  const isQueueRunning = Boolean(mainQueue?.running);

  return (
    <div className="bg-white border-b border-slate-200 select-none">
      {/* Top Menubar Row (Tasks | File | Downloads | View | Help) + App Brand */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50 border-b border-slate-200 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
            <img
              src="/appicon.png"
              alt="Rappidex"
              className="w-5 h-5 rounded-md shadow-2xs"
            />
            <span className="font-bold text-slate-800 tracking-tight">Rappidex</span>
          </div>

          <button
            onClick={() => setAddModalOpen(true)}
            className="px-2 py-0.5 rounded hover:bg-slate-200/70 text-slate-700 font-medium cursor-pointer"
          >
            Add New Download
          </button>
          <button
            onClick={() => setBatchModalOpen(true)}
            className="px-2 py-0.5 rounded hover:bg-slate-200/70 text-slate-700 font-medium cursor-pointer flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            Batch Download (Multiple Files)
          </button>
          <button
            onClick={() => setSchedulerOpen(true)}
            className="px-2 py-0.5 rounded hover:bg-slate-200/70 text-slate-700 font-medium cursor-pointer"
          >
            Scheduler & Queues
          </button>
          <button
            onClick={() => setOptionsOpen(true)}
            className="px-2 py-0.5 rounded hover:bg-slate-200/70 text-slate-700 font-medium cursor-pointer"
          >
            Settings
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find a file in your list..."
            className="w-full pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
          />
        </div>
      </div>

      {/* Classic IDM Large-Icon Action Ribbon */}
      <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto">
        <ToolbarButton
          icon={<Plus className="w-5 h-5 text-blue-600" />}
          label="Add URL"
          onClick={() => setAddModalOpen(true)}
        />

        <div className="h-9 w-px bg-slate-200 mx-1" />

        <ToolbarButton
          icon={<Play className="w-5 h-5 text-emerald-600" />}
          label="Resume"
          disabled={!canResume}
          onClick={() => selectedId && resumeDownload(selectedId)}
        />

        <ToolbarButton
          icon={<Pause className="w-5 h-5 text-amber-600" />}
          label="Stop"
          disabled={!canPause}
          onClick={() => selectedId && pauseDownload(selectedId)}
        />

        <ToolbarButton
          icon={<Square className="w-5 h-5 text-rose-600" />}
          label="Stop All"
          onClick={pauseAll}
        />

        <div className="h-9 w-px bg-slate-200 mx-1" />

        <ToolbarButton
          icon={<Trash2 className="w-5 h-5 text-slate-600" />}
          label="Delete"
          disabled={!selectedId}
          onClick={() => selectedId && deleteDownload(selectedId, false)}
        />

        <ToolbarButton
          icon={<CheckCheck className="w-5 h-5 text-teal-600" />}
          label="Clear Finished"
          onClick={deleteCompleted}
        />

        <div className="h-9 w-px bg-slate-200 mx-1" />

        <ToolbarButton
          icon={<Settings className="w-5 h-5 text-slate-700" />}
          label="Options"
          onClick={() => setOptionsOpen(true)}
        />

        <ToolbarButton
          icon={<CalendarClock className="w-5 h-5 text-indigo-600" />}
          label="Scheduler"
          onClick={() => setSchedulerOpen(true)}
        />

        {!isQueueRunning ? (
          <ToolbarButton
            icon={<PlayCircle className="w-5 h-5 text-emerald-600" />}
            label="Start Queue"
            onClick={() => startQueue(mainQueue?.id || 'main')}
          />
        ) : (
          <ToolbarButton
            icon={<StopCircle className="w-5 h-5 text-rose-600" />}
            label="Stop Queue"
            onClick={() => stopQueue(mainQueue?.id || 'main')}
          />
        )}
      </div>
    </div>
  );
};

const ToolbarButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}> = ({ icon, label, disabled, onClick }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="flex flex-col items-center justify-center min-w-[68px] px-2.5 py-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200/70 disabled:opacity-35 disabled:hover:bg-transparent transition cursor-pointer disabled:cursor-not-allowed"
  >
    <div className="mb-0.5">{icon}</div>
    <span className="text-[11px] font-medium text-slate-700 whitespace-nowrap">{label}</span>
  </button>
);
