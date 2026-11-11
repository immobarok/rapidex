import React, { useEffect, useState } from 'react';
import {
  X,
  Link2,
  Gauge,
  CalendarClock,
  Settings,
  FolderOpen,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';
import { formatBytes, formatETA } from '../../utils/formatters';
import { backendAPI, ProbeResult } from '../../utils/wailsBridge';
import { ChunkVisualizer } from '../widgets/ChunkVisualizer';

export const AddUrlModal: React.FC = () => {
  const { isAddModalOpen, setAddModalOpen, startRealDownload, settings } = useDownloadStore();
  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [savePath, setSavePath] = useState('');
  const [maxConns, setMaxConns] = useState(8);
  const [probing, setProbing] = useState(false);
  const [probeInfo, setProbeInfo] = useState<ProbeResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAddModalOpen) {
      setSavePath(settings.defaultDownloadDir || '');
      setMaxConns(settings.defaultMaxConns || 8);
      setProbeInfo(null);
      setError('');
    }
  }, [isAddModalOpen, settings]);

  if (!isAddModalOpen) return null;

  const handleProbe = async (targetUrl: string) => {
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) return;
    setProbing(true);
    setError('');
    try {
      const info = await backendAPI.probeURL(targetUrl);
      setProbeInfo(info);
      if (!fileName && info.fileName) {
        setFileName(info.fileName);
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setProbing(false);
    }
  };

  const handleBrowseFolder = async () => {
    const chosen = await backendAPI.selectDirectory(savePath);
    if (chosen) {
      setSavePath(chosen);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setError('');
    try {
      await startRealDownload(url.trim(), savePath.trim(), fileName.trim(), maxConns);
      setUrl('');
      setFileName('');
      setProbeInfo(null);
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600" />
            Start a New Download
          </h3>
          <button
            onClick={() => setAddModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Paste File Link (Web Address)
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                required
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => handleProbe(url.trim())}
                placeholder="https://example.com/movie.mp4"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                disabled={probing || !url.trim()}
                onClick={() => handleProbe(url.trim())}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium disabled:opacity-50 cursor-pointer"
              >
                {probing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify Link'}
              </button>
            </div>
          </div>

          {probeInfo && (
            <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 flex items-center justify-between text-[11px] text-slate-700">
              <div className="flex items-center gap-2 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium truncate">{probeInfo.fileName}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono">
                  {probeInfo.totalSize > 0 ? formatBytes(probeInfo.totalSize) : 'Size unknown'}
                </span>
                <span
                  className={
                    probeInfo.acceptRanges ? 'text-emerald-700 font-semibold' : 'text-amber-700'
                  }
                >
                  {probeInfo.acceptRanges ? 'Fast Boost Ready' : 'Standard Speed'}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                File Name (Optional)
              </label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Named automatically"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Download Speed Mode</label>
              <select
                value={maxConns}
                onChange={(e) => setMaxConns(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              >
                <option value={1}>Normal Speed (1 Stream)</option>
                <option value={4}>Fast Boost (4 Streams)</option>
                <option value={8}>Turbo Boost (8 Streams — Recommended)</option>
                <option value={16}>Super Fast (16 Streams)</option>
                <option value={32}>Maximum Speed (32 Streams)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Save to Folder</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                placeholder="Choose where to save this file"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Choose Folder
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs cursor-pointer"
            >
              Download Now
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Friendly Download Details & Speed Boost Window
export const ProgressDialog: React.FC = () => {
  const {
    inspectingDownloadId,
    setInspectingDownloadId,
    downloads,
    togglePauseResume,
    openFolder,
  } = useDownloadStore();

  const item = downloads.find((d) => d.id === inspectingDownloadId);
  if (!item) return null;

  const pct =
    item.totalSize > 0
      ? Math.min(100, Math.round((item.downloaded / item.totalSize) * 100))
      : item.status === 'completed'
      ? 100
      : 0;
  const remaining = Math.max(0, item.totalSize - item.downloaded);
  const eta = item.speedBps > 0 ? remaining / item.speedBps : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 font-semibold text-slate-800 truncate">
            <Gauge className="w-4 h-4 text-blue-600" />
            <span>
              {pct}% Downloaded — {item.fileName || item.url}
            </span>
          </div>
          <button
            onClick={() => setInspectingDownloadId(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
            <div className="text-slate-500">
              Downloaded So Far:{' '}
              <span className="text-slate-900 font-semibold font-mono">
                {formatBytes(item.downloaded)}
              </span>{' '}
              of {item.totalSize > 0 ? formatBytes(item.totalSize) : 'Unknown'}
            </div>
            <div className="text-slate-500">
              Current Speed:{' '}
              <span className="text-emerald-600 font-semibold font-mono">
                {formatBytes(item.speedBps)}/s
              </span>
            </div>
            <div className="text-slate-500">
              Estimated Time Left:{' '}
              <span className="text-slate-900 font-semibold font-mono">{formatETA(eta)}</span>
            </div>
            <div className="text-slate-500">
              Can Pause & Continue Later:{' '}
              <span className="text-blue-600 font-semibold">
                {item.acceptRanges ? 'Yes' : 'No'}
              </span>
            </div>
          </div>

          <div>
            <div className="mb-1.5 text-slate-600 font-medium">
              Speed Boost Progress ({item.chunks?.length || 1} Parallel File Parts)
            </div>
            <ChunkVisualizer
              chunks={item.chunks || []}
              completed={item.status === 'completed'}
            />
          </div>

          <div className="max-h-44 overflow-auto border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-1.5 px-3">Part</th>
                  <th className="py-1.5 px-3">Part Size</th>
                  <th className="py-1.5 px-3">Downloaded</th>
                  <th className="py-1.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(item.chunks || []).map((c) => {
                  const done = Math.max(0, c.currentPos - c.startByte);
                  const segTotal = Math.max(1, c.endByte - c.startByte + 1);
                  const isSegDone = done >= segTotal;
                  return (
                    <tr key={c.id}>
                      <td className="py-1.5 px-3 text-slate-700 font-medium">Part {c.id + 1}</td>
                      <td className="py-1.5 px-3 text-slate-500 font-mono">
                        {formatBytes(segTotal)}
                      </td>
                      <td className="py-1.5 px-3 text-slate-800 font-mono">{formatBytes(done)}</td>
                      <td className="py-1.5 px-3">
                        {c.active ? (
                          <span className="text-blue-600 font-medium">Downloading...</span>
                        ) : isSegDone ? (
                          <span className="text-emerald-600 font-medium">Finished</span>
                        ) : (
                          <span className="text-amber-600">Paused</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <button
              onClick={() => openFolder(item.id)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Show in Folder
            </button>

            <div className="flex gap-2">
              {item.status !== 'completed' && (
                <button
                  onClick={() => togglePauseResume(item.id)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                >
                  {item.status === 'downloading' ? 'Pause' : 'Continue'}
                </button>
              )}
              <button
                onClick={() => setInspectingDownloadId(null)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Auto-Schedule Modal
export const SchedulerModal: React.FC = () => {
  const { isSchedulerOpen, setSchedulerOpen, settings, saveSettings, resumeAll, pauseAll } =
    useDownloadStore();
  const [maxConcurrent, setMaxConcurrent] = useState(settings.maxConcurrentTasks || 4);
  const [shutdownWhenDone, setShutdownWhenDone] = useState(settings.shutdownWhenDone || false);

  useEffect(() => {
    if (isSchedulerOpen) {
      setMaxConcurrent(settings.maxConcurrentTasks || 4);
      setShutdownWhenDone(settings.shutdownWhenDone || false);
    }
  }, [isSchedulerOpen, settings]);

  if (!isSchedulerOpen) return null;

  const handleSave = async () => {
    await saveSettings({
      ...settings,
      maxConcurrentTasks: maxConcurrent,
      shutdownWhenDone,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-indigo-600" />
            Auto-Schedule & Batch Downloads
          </h3>
          <button
            onClick={() => setSchedulerOpen(false)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              How many files to download at the same time
            </label>
            <input
              type="number"
              min={1}
              max={16}
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={shutdownWhenDone}
              onChange={(e) => setShutdownWhenDone(e.target.checked)}
              className="rounded border-slate-300"
            />
            Turn off my computer when all downloads finish
          </label>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  resumeAll();
                  setSchedulerOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium cursor-pointer"
              >
                Start All Waiting
              </button>
              <button
                type="button"
                onClick={() => {
                  pauseAll();
                  setSchedulerOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium cursor-pointer"
              >
                Pause All
              </button>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Settings Modal — Simple, non-technical wording
export const OptionsModal: React.FC = () => {
  const { isOptionsOpen, setOptionsOpen, settings, saveSettings } = useDownloadStore();
  const [defaultDir, setDefaultDir] = useState(settings.defaultDownloadDir);
  const [defaultMaxConns, setDefaultMaxConns] = useState(settings.defaultMaxConns || 8);
  const [speedLimitKB, setSpeedLimitKB] = useState(
    Math.round((settings.speedLimitBps || 0) / 1024)
  );

  useEffect(() => {
    if (isOptionsOpen) {
      setDefaultDir(settings.defaultDownloadDir);
      setDefaultMaxConns(settings.defaultMaxConns || 8);
      setSpeedLimitKB(Math.round((settings.speedLimitBps || 0) / 1024));
    }
  }, [isOptionsOpen, settings]);

  if (!isOptionsOpen) return null;

  const handleBrowse = async () => {
    const dir = await backendAPI.selectDirectory(defaultDir);
    if (dir) setDefaultDir(dir);
  };

  const handleSave = async () => {
    await saveSettings({
      ...settings,
      defaultDownloadDir: defaultDir,
      defaultMaxConns,
      speedLimitBps: Math.max(0, speedLimitKB) * 1024,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-600" />
            Preferences & Settings
          </h3>
          <button
            onClick={() => setOptionsOpen(false)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Where to save downloaded files
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={defaultDir}
                onChange={(e) => setDefaultDir(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
              <button
                type="button"
                onClick={handleBrowse}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
              >
                Choose Folder
              </button>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Default Download Speed Mode
            </label>
            <select
              value={defaultMaxConns}
              onChange={(e) => setDefaultMaxConns(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            >
              <option value={1}>Normal Speed</option>
              <option value={4}>Fast Boost (4x)</option>
              <option value={8}>Turbo Boost (8x — Recommended)</option>
              <option value={16}>Super Fast (16x)</option>
              <option value={32}>Maximum Speed (32x)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Maximum Download Speed Limit (KB/s — leave 0 for Unlimited)
            </label>
            <input
              type="number"
              min={0}
              value={speedLimitKB}
              onChange={(e) => setSpeedLimitKB(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setOptionsOpen(false)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
