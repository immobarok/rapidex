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
    <aside className="w-56 bg-slate-50/70 border-r border-slate-200 flex flex-col justify-between p-3 text-xs">
      <div className="space-y-5">
        {/* Categories */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Categories
          </div>
          <ul className="space-y-0.5">
            {CATEGORIES.map(({ id, label, icon: Icon }) => {
              const isActive = activeCategory === id;
              const count =
                id === 'all'
                  ? downloads.length
                  : downloads.filter((d) => d.categoryId === id).length;

              return (
                <li key={id}>
                  <button
                    onClick={() => setActiveCategory(id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-200/70'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                          isActive
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-200/70 text-slate-600'
                        }`}
                      >
                        {count}
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
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Status
          </div>
          <ul className="space-y-0.5">
            {STATUS_FILTERS.map(({ id, label, icon: Icon }) => {
              const isActive = activeCategory === id;
              return (
                <li key={id}>
                  <button
                    onClick={() => setActiveCategory(id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-200/70'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Queues
          </div>
          <ul className="space-y-0.5">
            <li>
              <button
                onClick={() => setActiveCategory('queue:main')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                  activeCategory === 'queue:main'
                    ? 'bg-blue-50 text-blue-600 font-semibold border border-blue-200/70'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Main Queue
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active" />
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Browser Integration Indicator */}
      <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold text-slate-700">Browser Sniffer</div>
          <div className="text-[10px] text-slate-400">127.0.0.1:41920</div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
      </div>
    </aside>
  );
};
