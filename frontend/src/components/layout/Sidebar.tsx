import React from 'react';
import {
  FolderDown,
  Archive,
  FileText,
  Music,
  Box,
  Film,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';

const CATEGORIES = [
  { id: 'all', label: 'All Downloads', icon: FolderDown },
  { id: 'compressed', label: 'Compressed', icon: Archive },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'programs', label: 'Programs', icon: Box },
  { id: 'video', label: 'Video', icon: Film },
];

const STATUS_FILTERS = [
  { id: 'unfinished', label: 'Unfinished', icon: Clock },
  { id: 'finished', label: 'Completed', icon: CheckCircle2 },
];

export const Sidebar: React.FC = () => {
  const { activeCategory, setActiveCategory, downloads } = useDownloadStore();

  return (
    <aside className="w-56 bg-slate-900/60 border-r border-slate-800 flex flex-col justify-between p-3 text-xs">
      <div className="space-y-5">
        {/* Categories */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Categories
          </div>
          <ul className="space-y-0.5">
            {CATEGORIES.map(({ id, label, icon: Icon }) => {
              const isActive = activeCategory === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => setActiveCategory(id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 font-medium'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </span>
                    {id === 'all' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {downloads.length}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Status Filters */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Status
          </div>
          <ul className="space-y-0.5">
            {STATUS_FILTERS.map(({ id, label, icon: Icon }) => {
              const isActive = activeCategory === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => setActiveCategory(id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 font-medium'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Queues */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Queues
          </div>
          <ul className="space-y-0.5">
            <li>
              <button
                onClick={() => setActiveCategory('queue:main')}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Main Queue
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" title="Running" />
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Browser Integration Indicator */}
      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium text-slate-300">Browser Sniffer</div>
          <div className="text-[10px] text-slate-500">Port 41920 Active</div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>
    </aside>
  );
};
