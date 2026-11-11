import React from 'react';
import { Activity, HardDrive, Wifi, Folder } from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';
import { formatBytes } from '../../utils/formatters';

export const StatusBar: React.FC = () => {
  const { downloads, settings } = useDownloadStore();

  const activeCount = downloads.filter(
    (d) => d.status === 'downloading' || d.status === 'probing'
  ).length;
  const totalSpeed = downloads.reduce((acc, d) => acc + (d.speedBps || 0), 0);

  return (
    <footer className="h-7 px-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          Downloading Now: <strong className="text-slate-900">{activeCount}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
          All Files: <strong className="text-slate-900">{downloads.length}</strong>
        </span>
        {settings.defaultDownloadDir && (
          <span className="flex items-center gap-1 text-slate-400 truncate max-w-md">
            <Folder className="w-3 h-3" />
            Saving to: {settings.defaultDownloadDir}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 font-mono">
        {settings.speedLimitBps > 0 && (
          <span className="text-amber-600 font-sans">
            Speed Limit: {formatBytes(settings.speedLimitBps)}/s
          </span>
        )}
        <span className="flex items-center gap-1.5 font-semibold text-emerald-600">
          <Wifi className="w-3.5 h-3.5" />
          Download Speed: {formatBytes(totalSpeed)}/s
        </span>
      </div>
    </footer>
  );
};
