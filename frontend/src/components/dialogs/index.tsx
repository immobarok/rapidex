import React, { useState } from 'react';
import { X, Link2, Cpu, CalendarClock, Settings } from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';
import { formatBytes, formatETA } from '../../utils/formatters';
import { ChunkVisualizer } from '../widgets/ChunkVisualizer';

export const AddUrlModal: React.FC = () => {
  const { isAddModalOpen, setAddModalOpen, addMockDownload } = useDownloadStore();
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [maxConns, setMaxConns] = useState(8);

  if (!isAddModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    addMockDownload(url.trim(), fileName.trim(), maxConns);
    setUrl('');
    setFileName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-400" />
            Add New Download (IDM File Info)
          </h3>
          <button
            onClick={() => setAddModalOpen(false)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Download URL (HTTP / HTTPS / m3u8)</label>
            <input
              type="url"
              required
              autoFocus
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/archive.zip"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 mb-1">Save File As (Optional)</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Auto-detect from URL/Headers"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Max Parallel Connections</label>
              <select
                value={maxConns}
                onChange={(e) => setMaxConns(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-slate-100 focus:outline-none focus:border-blue-500"
              >
                <option value={1}>1 Connection</option>
                <option value={4}>4 Connections</option>
                <option value={8}>8 Connections (Recommended)</option>
                <option value={16}>16 Connections (High Speed)</option>
                <option value={32}>32 Connections (Max)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              Start Download Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// IDM's signature per-download live connection & chunk inspector dialog
export const ProgressDialog: React.FC = () => {
  const { inspectingDownloadId, setInspectingDownloadId, downloads, togglePauseResume } =
    useDownloadStore();

  const item = downloads.find((d) => d.id === inspectingDownloadId);
  if (!item) return null;

  const pct =
    item.totalSize > 0 ? Math.min(100, Math.round((item.downloaded / item.totalSize) * 100)) : 0;
  const remaining = Math.max(0, item.totalSize - item.downloaded);
  const eta = item.speedBps > 0 ? remaining / item.speedBps : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2 font-semibold text-slate-200 truncate">
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>{pct}% — {item.fileName}</span>
          </div>
          <button
            onClick={() => setInspectingDownloadId(null)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[11px]">
            <div className="text-slate-400">
              Downloaded: <span className="text-slate-100">{formatBytes(item.downloaded)}</span> /{' '}
              {formatBytes(item.totalSize)}
            </div>
            <div className="text-slate-400">
              Transfer Rate:{' '}
              <span className="text-emerald-400">{formatBytes(item.speedBps)}/ sec</span>
            </div>
            <div className="text-slate-400">
              Time Left: <span className="text-slate-100">{formatETA(eta)}</span>
            </div>
            <div className="text-slate-400">
              Resume Capability:{' '}
              <span className="text-blue-400">{item.acceptRanges ? 'Yes (Bytes)' : 'No'}</span>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-slate-400 font-medium">
              Dynamic File Segmentation ({item.chunks.length} Active Worker Connections)
            </div>
            <ChunkVisualizer chunks={item.chunks} />
          </div>

          <div className="max-h-40 overflow-auto border border-slate-800 rounded-lg bg-slate-950">
            <table className="w-full text-left text-[11px] font-mono">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-1.5 px-3">Conn #</th>
                  <th className="py-1.5 px-3">Byte Range</th>
                  <th className="py-1.5 px-3">Downloaded</th>
                  <th className="py-1.5 px-3">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {item.chunks.map((c) => (
                  <tr key={c.id}>
                    <td className="py-1.5 px-3 text-slate-300">Worker #{c.id + 1}</td>
                    <td className="py-1.5 px-3 text-slate-500">
                      {formatBytes(c.startByte)} → {formatBytes(c.endByte)}
                    </td>
                    <td className="py-1.5 px-3 text-slate-200">
                      {formatBytes(c.currentPos - c.startByte)}
                    </td>
                    <td className="py-1.5 px-3 text-emerald-400">
                      {c.active ? 'Receiving data...' : 'Paused'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => togglePauseResume(item.id)}
              className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              {item.status === 'downloading' ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={() => setInspectingDownloadId(null)}
              className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white"
            >
              Close Window
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// IDM Queue & Scheduler Modal
export const SchedulerModal: React.FC = () => {
  const { isSchedulerOpen, setSchedulerOpen } = useDownloadStore();
  const [maxConcurrent, setMaxConcurrent] = useState(4);
  const [shutdownWhenDone, setShutdownWhenDone] = useState(false);

  if (!isSchedulerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-sky-400" />
            Queue & Scheduler — Main Queue
          </h3>
          <button
            onClick={() => setSchedulerOpen(false)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-slate-400 mb-1">Max Simultaneous Downloads in Queue</label>
            <input
              type="number"
              min={1}
              max={16}
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-slate-100"
            />
          </div>

          <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={shutdownWhenDone}
              onChange={(e) => setShutdownWhenDone(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950"
            />
            Turn off computer when all downloads complete
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setSchedulerOpen(false)}
              className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              Apply Queue Rules
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// IDM Options Modal (Speed Limit, Default Connections, Save Path)
export const OptionsModal: React.FC = () => {
  const { isOptionsOpen, setOptionsOpen } = useDownloadStore();
  const [speedLimitMB, setSpeedLimitMB] = useState(0);
  const [defaultDir, setDefaultDir] = useState('~/Downloads/Rappidex');

  if (!isOptionsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h3 className="font-semibold text-slate-200 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            Rappidex Options
          </h3>
          <button
            onClick={() => setOptionsOpen(false)}
            className="text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block text-slate-400 mb-1">Default Download Directory</label>
            <input
              type="text"
              value={defaultDir}
              onChange={(e) => setDefaultDir(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-slate-100"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">
              Global Speed Limiter (MB/s, 0 = Unlimited)
            </label>
            <input
              type="number"
              min={0}
              value={speedLimitMB}
              onChange={(e) => setSpeedLimitMB(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-slate-100"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              onClick={() => setOptionsOpen(false)}
              className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
