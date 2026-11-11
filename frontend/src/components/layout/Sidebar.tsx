import React, { useState } from 'react';
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
  ChevronDown,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';

const CATEGORIES = [
  { id: 'compressed', label: 'Compressed (ZIP)', icon: Archive },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'programs', label: 'Programs & Apps', icon: Box },
  { id: 'video', label: 'Video', icon: Film },
];

export const Sidebar: React.FC = () => {
  const { activeCategory, setActiveCategory, downloads, queues } = useDownloadStore();
  const [openAll, setOpenAll] = useState(true);
  const [openUnfinished, setOpenUnfinished] = useState(false);
  const [openFinished, setOpenFinished] = useState(false);
  const [openQueues, setOpenQueues] = useState(true);

  const countFor = (filterId: string) => {
    if (filterId === 'all') return downloads.length;
    if (filterId === 'unfinished')
      return downloads.filter((d) => d.status !== 'completed').length;
    if (filterId === 'finished')
      return downloads.filter((d) => d.status === 'completed').length;
    if (filterId.startsWith('unfinished:')) {
      const cat = filterId.split(':')[1];
      return downloads.filter((d) => d.status !== 'completed' && d.categoryId === cat).length;
    }
    if (filterId.startsWith('finished:')) {
      const cat = filterId.split(':')[1];
      return downloads.filter((d) => d.status === 'completed' && d.categoryId === cat).length;
    }
    if (filterId.startsWith('queue:')) {
      const qid = filterId.split(':')[1];
      return downloads.filter((d) => d.queueId === qid && d.status !== 'completed').length;
    }
    return downloads.filter((d) => d.categoryId === filterId).length;
  };

  return (
    <aside className="w-60 bg-slate-50 border-r border-slate-200 flex flex-col justify-between p-2.5 text-xs select-none overflow-y-auto">
      <div className="space-y-1">
        {/* All Downloads Tree */}
        <TreeSection
          label="All Downloads"
          icon={<FolderDown className="w-3.5 h-3.5 text-blue-600" />}
          isOpen={openAll}
          isActive={activeCategory === 'all'}
          count={countFor('all')}
          onToggle={() => setOpenAll(!openAll)}
          onSelect={() => setActiveCategory('all')}
        >
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <TreeLeaf
              key={id}
              label={label}
              icon={<Icon className="w-3.5 h-3.5 text-slate-500" />}
              isActive={activeCategory === id}
              count={countFor(id)}
              onClick={() => setActiveCategory(id)}
            />
          ))}
        </TreeSection>

        {/* Unfinished Tree */}
        <TreeSection
          label="Unfinished"
          icon={<Clock className="w-3.5 h-3.5 text-amber-600" />}
          isOpen={openUnfinished}
          isActive={activeCategory === 'unfinished'}
          count={countFor('unfinished')}
          onToggle={() => setOpenUnfinished(!openUnfinished)}
          onSelect={() => setActiveCategory('unfinished')}
        >
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <TreeLeaf
              key={`unfinished:${id}`}
              label={label}
              icon={<Icon className="w-3.5 h-3.5 text-slate-500" />}
              isActive={activeCategory === `unfinished:${id}`}
              count={countFor(`unfinished:${id}`)}
              onClick={() => setActiveCategory(`unfinished:${id}`)}
            />
          ))}
        </TreeSection>

        {/* Finished Tree */}
        <TreeSection
          label="Finished"
          icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          isOpen={openFinished}
          isActive={activeCategory === 'finished'}
          count={countFor('finished')}
          onToggle={() => setOpenFinished(!openFinished)}
          onSelect={() => setActiveCategory('finished')}
        >
          {CATEGORIES.map(({ id, label, icon: Icon }) => (
            <TreeLeaf
              key={`finished:${id}`}
              label={label}
              icon={<Icon className="w-3.5 h-3.5 text-slate-500" />}
              isActive={activeCategory === `finished:${id}`}
              count={countFor(`finished:${id}`)}
              onClick={() => setActiveCategory(`finished:${id}`)}
            />
          ))}
        </TreeSection>

        {/* Queues Tree */}
        <TreeSection
          label="Queues"
          icon={<Layers className="w-3.5 h-3.5 text-indigo-600" />}
          isOpen={openQueues}
          isActive={false}
          count={queues.length}
          onToggle={() => setOpenQueues(!openQueues)}
          onSelect={() => setOpenQueues(!openQueues)}
        >
          {queues.map((q) => (
            <TreeLeaf
              key={q.id}
              label={q.name}
              icon={
                <span
                  className={`w-2 h-2 rounded-full ${
                    q.running ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              }
              isActive={activeCategory === `queue:${q.id}`}
              count={countFor(`queue:${q.id}`)}
              onClick={() => setActiveCategory(`queue:${q.id}`)}
            />
          ))}
        </TreeSection>
      </div>

      {/* Browser Helper Status */}
      <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between mt-3">
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

const TreeSection: React.FC<{
  label: string;
  icon: React.ReactNode;
  isOpen: boolean;
  isActive: boolean;
  count: number;
  onToggle: () => void;
  onSelect: () => void;
  children: React.ReactNode;
}> = ({ label, icon, isOpen, isActive, count, onToggle, onSelect, children }) => (
  <div>
    <div
      className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition ${
        isActive
          ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/70'
          : 'text-slate-700 hover:bg-slate-200/60 font-medium'
      }`}
    >
      <div className="flex items-center gap-1.5 flex-1" onClick={onSelect}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="p-0.5 rounded hover:bg-slate-200 text-slate-500 cursor-pointer"
        >
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
        {icon}
        <span className="truncate">{label}</span>
      </div>
      {count > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600">
          {count}
        </span>
      )}
    </div>
    {isOpen && <div className="pl-5 mt-0.5 space-y-0.5">{children}</div>}
  </div>
);

const TreeLeaf: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  count: number;
  onClick: () => void;
}> = ({ label, icon, isActive, count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center justify-between px-2.5 py-1 rounded-md transition cursor-pointer ${
      isActive
        ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/70'
        : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
    }`}
  >
    <span className="flex items-center gap-2 truncate">
      {icon}
      <span className="truncate">{label}</span>
    </span>
    {count > 0 && (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600">
        {count}
      </span>
    )}
  </button>
);
