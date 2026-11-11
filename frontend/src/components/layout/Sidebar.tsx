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
  Globe,
} from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';

const FILE_TYPES = [
  { id: 'all', label: 'All Files', icon: FolderDown },
  { id: 'video', label: 'Videos & Movies', icon: Film },
  { id: 'music', label: 'Music & Audio', icon: Music },
  { id: 'documents', label: 'Documents & Books', icon: FileText },
  { id: 'programs', label: 'Apps & Software', icon: Box },
  { id: 'compressed', label: 'ZIP & Archives', icon: Archive },
];

const DOWNLOAD_PROGRESS = [
  { id: 'unfinished', label: 'In Progress', icon: Clock },
  { id: 'finished', label: 'Finished', icon: CheckCircle2 },
];

export const Sidebar: React.FC = () => {
  const { activeCategory, setActiveCategory, downloads } = useDownloadStore();

  return (
    <aside className="w-56 bg-slate-50/70 border-r border-slate-200 flex flex-col justify-between p-3 text-xs">
      <div className="space-y-5">
        {/* File Types */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            File Types
          </div>
          <ul className="space-y-0.5">
            {FILE_TYPES.map(({ id, label, icon: Icon }) => {
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

        {/* Download Progress Filter */}
        <div>
          <div className="px-2.5 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Download Status
          </div>
          <ul className="space-y-0.5">
            {DOWNLOAD_PROGRESS.map(({ id, label, icon: Icon }) => {
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
      </div>

      {/* Browser Helper Status — Plain English */}
      <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-600" />
          <div>
            <div className="text-[11px] font-semibold text-slate-700">Browser Helper</div>
            <div className="text-[10px] text-slate-400">Ready to catch links</div>
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
      </div>
    </aside>
  );
};
