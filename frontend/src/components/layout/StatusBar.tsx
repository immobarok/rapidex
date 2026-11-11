import React from 'react';
import { Activity, HardDrive, Wifi } from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';
import { formatBytes } from '../../utils/formatters';

export const StatusBar: React.FC = () => {
  const { downloads } = useDownloadStore();

  const activeCount = downloads.filter((d) => d.status === 'downloading').length;
  const totalSpeed = downloads.reduce((acc, d) => acc + (d.speedBps || 0), 0);

  return (
    <footer className="h-7 px-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          Active Downloads: <strong className="text-slate-200">{activeCount}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-slate-500" />
          Total Tasks: <strong className="text-slate-200">{downloads.length}</strong>
        </span>
      </div>

      <div className="flex items-center gap-4 font-mono">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <Wifi className="w-3.5 h-3.5" />
          {formatBytes(totalSpeed)}/s
        </span>
      </div>
    </footer>
  );
};

