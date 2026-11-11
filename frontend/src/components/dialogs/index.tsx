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
  AlertTriangle,
  Layers,
  RefreshCw,
  FileCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { useDownloadStore } from '../../store/useDownloadStore';
import { formatBytes, formatETA } from '../../utils/formatters';
import { backendAPI, ProbeResult, SiteLogin } from '../../utils/wailsBridge';
import { ChunkVisualizer } from '../widgets/ChunkVisualizer';

// 1. IDM's "Download File Info" Dialog (Start Now vs Download Later, Category, Save Path, Description)
export const AddUrlModal: React.FC = () => {
  const {
    isAddModalOpen,
    prefillUrl,
    setAddModalOpen,
    addDownloadWithOptions,
    settings,
    queues,
  } = useDownloadStore();

  const [url, setUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [categoryId, setCategoryId] = useState('video');
  const [savePath, setSavePath] = useState('');
  const [description, setDescription] = useState('');
  const [queueId, setQueueId] = useState('main');
  const [maxConns, setMaxConns] = useState(8);
  const [probing, setProbing] = useState(false);
  const [probeInfo, setProbeInfo] = useState<ProbeResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAddModalOpen) {
      setUrl(prefillUrl || '');
      setFileName('');
      setDescription('');
      setSavePath(settings.defaultDownloadDir || '');
      setMaxConns(settings.defaultMaxConns || 8);
      setProbeInfo(null);
      setError('');
      if (prefillUrl) {
        handleProbe(prefillUrl);
      }
    }
  }, [isAddModalOpen, prefillUrl, settings]);

  if (!isAddModalOpen) return null;

  const inferCategory = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv'].includes(ext)) return 'video';
    if (['mp3', 'flac', 'wav', 'aac', 'm4a', 'ogg'].includes(ext)) return 'music';
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) return 'compressed';
    if (['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'iso', 'apk'].includes(ext)) return 'programs';
    return 'documents';
  };

  const handleProbe = async (targetUrl: string) => {
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) return;
    setProbing(true);
    setError('');
    try {
      const info = await backendAPI.probeURL(targetUrl);
      setProbeInfo(info);
      if (info.fileName) {
        setFileName(info.fileName);
        const cat = inferCategory(info.fileName);
        setCategoryId(cat);
        if (settings.categoryDirs?.[cat]) {
          setSavePath(settings.categoryDirs[cat]);
        }
      }
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setProbing(false);
    }
  };

  const handleCategoryChange = (cat: string) => {
    setCategoryId(cat);
    if (settings.categoryDirs?.[cat]) {
      setSavePath(settings.categoryDirs[cat]);
    }
  };

  const handleBrowseFolder = async () => {
    const chosen = await backendAPI.selectDirectory(savePath);
    if (chosen) setSavePath(chosen);
  };

  const submitDownload = async (startNow: boolean) => {
    if (!url.trim()) return;
    setError('');
    try {
      await addDownloadWithOptions({
        url: url.trim(),
        fileName: fileName.trim(),
        savePath: savePath.trim(),
        categoryId,
        queueId,
        description: description.trim(),
        referer: '',
        maxConns,
        startNow,
        headers: {},
      });
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600" />
            Download File Info
          </h3>
          <button
            onClick={() => setAddModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className="block font-medium text-slate-700 mb-1">URL (Web Address)</label>
            <div className="flex gap-2">
              <input
                type="url"
                required
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => handleProbe(url.trim())}
                placeholder="https://example.com/video.mp4"
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
              />
              <button
                type="button"
                disabled={probing || !url.trim()}
                onClick={() => handleProbe(url.trim())}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium disabled:opacity-50 cursor-pointer"
              >
                {probing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Check Link'}
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
                <span className="font-mono font-semibold">
                  {probeInfo.totalSize > 0 ? formatBytes(probeInfo.totalSize) : 'Size unknown'}
                </span>
                <span
                  className={
                    probeInfo.acceptRanges ? 'text-emerald-700 font-semibold' : 'text-amber-700'
                  }
                >
                  {probeInfo.acceptRanges ? 'Resume: Yes' : 'Single Stream'}
                </span>
              </div>
            </div>
          )}

          {probeInfo?.isWebPage && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-[11px] text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Note: This link points to a web page (HTML), not a direct media file.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              >
                <option value="video">Video</option>
                <option value="music">Music</option>
                <option value="programs">Programs & Apps</option>
                <option value="compressed">Compressed (ZIP)</option>
                <option value="documents">Documents</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">File Name</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="Auto-detected"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Save File To</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
              <button
                type="button"
                onClick={handleBrowseFolder}
                className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Browse...
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional note..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">Speed Mode (Connections)</label>
              <select
                value={maxConns}
                onChange={(e) => setMaxConns(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              >
                <option value={1}>1 Connection (Standard)</option>
                <option value={4}>4 Connections (Fast)</option>
                <option value={8}>8 Connections (Turbo — Default)</option>
                <option value={16}>16 Connections (High Speed)</option>
                <option value={32}>32 Connections (Maximum)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px]">
              {error}
            </div>
          )}

          {/* Classic IDM 3-Button Footer: Download Later | Start Download | Cancel */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <select
                value={queueId}
                onChange={(e) => setQueueId(e.target.value)}
                className="px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 text-[11px]"
              >
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => submitDownload(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium cursor-pointer"
              >
                Download Later
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submitDownload(true)}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs cursor-pointer"
              >
                Start Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. IDM's 3-Tab Per-Download Progress Dialog (Download Status | Speed Limiter | Options on Completion)
export const ProgressDialog: React.FC = () => {
  const {
    inspectingDownloadId,
    setInspectingDownloadId,
    downloads,
    togglePauseResume,
    openFolder,
    setTaskSpeedLimit,
  } = useDownloadStore();

  const [activeTab, setActiveTab] = useState<'status' | 'limiter' | 'completion'>('status');
  const [limitKB, setLimitKB] = useState(0);

  const item = downloads.find((d) => d.id === inspectingDownloadId);
  useEffect(() => {
    if (item) {
      setLimitKB(Math.round((item.speedLimitBps || 0) / 1024));
    }
  }, [item?.id]);

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
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2 font-semibold text-slate-800 truncate">
            <Gauge className="w-4 h-4 text-blue-600" />
            <span>
              {pct}% — {item.fileName || item.url}
            </span>
          </div>
          <button
            onClick={() => setInspectingDownloadId(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* IDM 3 Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/60 px-4 pt-2 gap-1">
          {[
            { id: 'status', label: 'Download Status' },
            { id: 'limiter', label: 'Speed Limiter' },
            { id: 'completion', label: 'Options on Completion' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1.5 rounded-t-lg font-medium border-t border-x transition cursor-pointer ${
                activeTab === t.id
                  ? 'bg-white border-slate-200 text-blue-600 -mb-px'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-4">
          {activeTab === 'status' && (
            <>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                <div className="text-slate-500">
                  Status:{' '}
                  <span className="text-slate-900 font-semibold capitalize">{item.status}</span>
                </div>
                <div className="text-slate-500">
                  File Size:{' '}
                  <span className="text-slate-900 font-semibold font-mono">
                    {item.totalSize > 0 ? formatBytes(item.totalSize) : 'Unknown'}
                  </span>
                </div>
                <div className="text-slate-500">
                  Downloaded:{' '}
                  <span className="text-slate-900 font-semibold font-mono">
                    {formatBytes(item.downloaded)} ({pct}%)
                  </span>
                </div>
                <div className="text-slate-500">
                  Transfer Rate:{' '}
                  <span className="text-emerald-600 font-semibold font-mono">
                    {formatBytes(item.speedBps)}/sec
                  </span>
                </div>
                <div className="text-slate-500">
                  Time Left: <span className="text-slate-900 font-mono">{formatETA(eta)}</span>
                </div>
                <div className="text-slate-500">
                  Resume Capability:{' '}
                  <span className="text-blue-600 font-semibold">
                    {item.acceptRanges ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-slate-600 font-medium">
                  Start positions and download progress by connections ({item.chunks?.length || 1})
                </div>
                <ChunkVisualizer
                  chunks={item.chunks || []}
                  completed={item.status === 'completed'}
                />
              </div>

              <div className="max-h-40 overflow-auto border border-slate-200 rounded-lg bg-white">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-1.5 px-3">N</th>
                      <th className="py-1.5 px-3">Downloaded</th>
                      <th className="py-1.5 px-3">Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(item.chunks || []).map((c) => {
                      const done = Math.max(0, c.currentPos - c.startByte);
                      return (
                        <tr key={c.id}>
                          <td className="py-1.5 px-3 text-slate-700 font-medium">{c.id + 1}</td>
                          <td className="py-1.5 px-3 text-slate-800 font-mono">
                            {formatBytes(done)}
                          </td>
                          <td className="py-1.5 px-3">
                            {c.active ? (
                              <span className="text-blue-600 font-medium">
                                {c.info || 'Receiving data...'}
                              </span>
                            ) : c.currentPos > c.endByte && c.endByte >= 0 ? (
                              <span className="text-emerald-600 font-medium">Completed</span>
                            ) : (
                              <span className="text-slate-500">{c.info || 'Paused'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'limiter' && (
            <div className="space-y-3 py-4">
              <label className="block font-medium text-slate-700">
                Maximum download speed for this file (KB/sec, 0 = Unlimited)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  value={limitKB}
                  onChange={(e) => setLimitKB(Number(e.target.value))}
                  className="w-48 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setTaskSpeedLimit(item.id, Math.max(0, limitKB) * 1024)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
                >
                  Apply Limit
                </button>
              </div>
            </div>
          )}

          {activeTab === 'completion' && (
            <div className="space-y-2 py-4 text-slate-700">
              <p className="text-slate-500">
                Saved to: <strong className="text-slate-800">{item.savePath}</strong>
              </p>
              <p className="text-slate-500">
                When finished, Rappidex verifies all parts and renames the temporary{' '}
                <code>.rpdx</code> file to <strong>{item.fileName}</strong>.
              </p>
            </div>
          )}

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
                  {item.status === 'downloading' ? 'Pause' : 'Resume'}
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

// 3. IDM's "Download Complete" Dialog (Open | Open Folder | Close)
export const DownloadCompleteDialog: React.FC = () => {
  const { completedDialogItem, setCompletedDialogItem, openFile, openFolder } =
    useDownloadStore();

  if (!completedDialogItem) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-200">
          <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            Download Complete
          </h3>
          <button
            onClick={() => setCompletedDialogItem(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div className="font-semibold text-slate-800 truncate">
            {completedDialogItem.fileName}
          </div>
          <div className="text-slate-500 space-y-1 text-[11px]">
            <div>
              Size: <strong className="text-slate-800">{formatBytes(completedDialogItem.totalSize)}</strong>
            </div>
            <div className="truncate">
              Saved in: <strong className="text-slate-800">{completedDialogItem.savePath}</strong>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              onClick={() => {
                openFile(completedDialogItem.id);
                setCompletedDialogItem(null);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
            >
              Open
            </button>
            <button
              onClick={() => {
                openFolder(completedDialogItem.id);
                setCompletedDialogItem(null);
              }}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
            >
              Open Folder
            </button>
            <button
              onClick={() => setCompletedDialogItem(null)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. IDM's "Batch Download" Dialog (Wildcard URL Generator)
export const BatchDownloadModal: React.FC = () => {
  const { isBatchModalOpen, setBatchModalOpen, addBatchDownloads, settings } =
    useDownloadStore();
  const [pattern, setPattern] = useState('https://example.com/file_*.zip');
  const [fromNum, setFromNum] = useState(1);
  const [toNum, setToNum] = useState(10);
  const [padLen, setPadLen] = useState(2);
  const [startNow, setStartNow] = useState(false);
  const [error, setError] = useState('');

  if (!isBatchModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await addBatchDownloads({
        pattern: pattern.trim(),
        from: fromNum,
        to: toNum,
        wildcardLen: padLen,
        savePath: settings.defaultDownloadDir,
        categoryId: '',
        queueId: 'main',
        startNow,
      });
    } catch (err: any) {
      setError(err?.message || String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Add Batch Download (Wildcard *)
          </h3>
          <button
            onClick={() => setBatchModalOpen(false)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Address with asterisk (*) wildcard
            </label>
            <input
              type="text"
              required
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-medium text-slate-700 mb-1">From</label>
              <input
                type="number"
                value={fromNum}
                onChange={(e) => setFromNum(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">To</label>
              <input
                type="number"
                value={toNum}
                onChange={(e) => setToNum(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Wildcard Size</label>
              <input
                type="number"
                min={1}
                max={6}
                value={padLen}
                onChange={(e) => setPadLen(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-slate-700 pt-1">
            <input
              type="checkbox"
              checked={startNow}
              onChange={(e) => setStartNow(e.target.checked)}
            />
            Start downloading immediately (otherwise add to Main Queue)
          </label>

          {error && (
            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setBatchModalOpen(false)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
            >
              Add Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 5. IDM's "Refresh Download Address" Dialog (for expired links)
export const RefreshUrlModal: React.FC = () => {
  const { refreshUrlItemId, setRefreshUrlItemId, downloads, refreshDownloadURL } =
    useDownloadStore();
  const item = downloads.find((d) => d.id === refreshUrlItemId);
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    if (item) setNewUrl(item.originalUrl || item.url);
  }, [item?.id]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-sky-600" />
            Refresh Download Address — {item.fileName}
          </h3>
          <button
            onClick={() => setRefreshUrlItemId(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-slate-500">
            Paste a fresh download link for this file to continue from{' '}
            <strong>{formatBytes(item.downloaded)}</strong> without losing progress:
          </p>
          <input
            type="url"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              onClick={() => setRefreshUrlItemId(null)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => refreshDownloadURL(item.id, newUrl)}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
            >
              Update & Resume
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 6. IDM Scheduler & Queue Manager Modal
export const SchedulerModal: React.FC = () => {
  const { isSchedulerOpen, setSchedulerOpen, queues, saveQueue, startQueue, stopQueue } =
    useDownloadStore();
  const mainQ = queues[0];

  const [maxConcurrent, setMaxConcurrent] = useState(mainQ?.maxConcurrent || 2);
  const [startEnabled, setStartEnabled] = useState(mainQ?.schedule?.startEnabled || false);
  const [startTime, setStartTime] = useState(mainQ?.schedule?.startTime || '02:00');
  const [stopEnabled, setStopEnabled] = useState(mainQ?.schedule?.stopEnabled || false);
  const [stopTime, setStopTime] = useState(mainQ?.schedule?.stopTime || '08:00');

  useEffect(() => {
    if (isSchedulerOpen && mainQ) {
      setMaxConcurrent(mainQ.maxConcurrent || 2);
      setStartEnabled(Boolean(mainQ.schedule?.startEnabled));
      setStartTime(mainQ.schedule?.startTime || '02:00');
      setStopEnabled(Boolean(mainQ.schedule?.stopEnabled));
      setStopTime(mainQ.schedule?.stopTime || '08:00');
    }
  }, [isSchedulerOpen, mainQ]);

  if (!isSchedulerOpen || !mainQ) return null;

  const handleSave = async () => {
    await saveQueue({
      ...mainQ,
      maxConcurrent,
      schedule: {
        ...mainQ.schedule,
        startEnabled,
        startTime,
        stopEnabled,
        stopTime,
      },
    });
    setSchedulerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-indigo-600" />
            Scheduler — {mainQ.name}
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
              Files in queue to download at the same time
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

          <div className="space-y-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={startEnabled}
                  onChange={(e) => setStartEnabled(e.target.checked)}
                />
                Start download at:
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-slate-700 font-medium">
                <input
                  type="checkbox"
                  checked={stopEnabled}
                  onChange={(e) => setStopEnabled(e.target.checked)}
                />
                Stop download at:
              </label>
              <input
                type="time"
                value={stopTime}
                onChange={(e) => setStopTime(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  startQueue(mainQ.id);
                  setSchedulerOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium cursor-pointer"
              >
                Start Now
              </button>
              <button
                type="button"
                onClick={() => {
                  stopQueue(mainQ.id);
                  setSchedulerOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium cursor-pointer"
              >
                Stop
              </button>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 7. IDM Multi-Tab Options Dialog (General | Save To | Connection | Proxy | Site Logins)
export const OptionsModal: React.FC = () => {
  const { isOptionsOpen, setOptionsOpen, settings, saveSettings } = useDownloadStore();
  const [tab, setTab] = useState<'general' | 'saveto' | 'connection' | 'proxy' | 'logins'>(
    'general'
  );
  const [draft, setDraft] = useState(settings);
  const [newLogin, setNewLogin] = useState<SiteLogin>({
    pattern: '',
    username: '',
    password: '',
  });

  useEffect(() => {
    if (isOptionsOpen) {
      setDraft(settings);
    }
  }, [isOptionsOpen, settings]);

  if (!isOptionsOpen) return null;

  const handleBrowse = async () => {
    const dir = await backendAPI.selectDirectory(draft.defaultDownloadDir);
    if (dir) setDraft({ ...draft, defaultDownloadDir: dir });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-600" />
            Rappidex Configuration & Options
          </h3>
          <button
            onClick={() => setOptionsOpen(false)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/60 px-4 pt-2 gap-1">
          {[
            { id: 'general', label: 'General' },
            { id: 'saveto', label: 'Save To' },
            { id: 'connection', label: 'Connection' },
            { id: 'proxy', label: 'Proxy / Socks' },
            { id: 'logins', label: 'Site Logins' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`px-3 py-1.5 rounded-t-lg font-medium border-t border-x transition cursor-pointer ${
                tab === t.id
                  ? 'bg-white border-slate-200 text-blue-600 -mb-px'
                  : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3 min-h-[220px]">
          {tab === 'general' && (
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.monitorClipboard}
                  onChange={(e) =>
                    setDraft({ ...draft, monitorClipboard: e.target.checked })
                  }
                />
                Automatically catch download links copied to the Clipboard
              </label>

              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.showProgressDialog}
                  onChange={(e) =>
                    setDraft({ ...draft, showProgressDialog: e.target.checked })
                  }
                />
                Show Download Progress window when a download starts
              </label>

              <label className="flex items-center gap-2 text-slate-700">
                <input
                  type="checkbox"
                  checked={draft.showCompleteDialog}
                  onChange={(e) =>
                    setDraft({ ...draft, showCompleteDialog: e.target.checked })
                  }
                />
                Show "Download Complete" dialog when a file finishes
              </label>
            </div>
          )}

          {tab === 'saveto' && (
            <div className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Default Download Folder
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={draft.defaultDownloadDir}
                    onChange={(e) =>
                      setDraft({ ...draft, defaultDownloadDir: e.target.value })
                    }
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={handleBrowse}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
                  >
                    Browse...
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  If file already exists on disk
                </label>
                <select
                  value={draft.duplicateAction}
                  onChange={(e) =>
                    setDraft({ ...draft, duplicateAction: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="rename">Auto-rename — e.g. video (1).mp4</option>
                  <option value="overwrite">Overwrite existing file</option>
                </select>
              </div>
            </div>
          )}

          {tab === 'connection' && (
            <div className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Default Max Connections per Download
                </label>
                <select
                  value={draft.defaultMaxConns}
                  onChange={(e) =>
                    setDraft({ ...draft, defaultMaxConns: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value={1}>1 Connection</option>
                  <option value={4}>4 Connections</option>
                  <option value={8}>8 Connections (Recommended)</option>
                  <option value={16}>16 Connections</option>
                  <option value={32}>32 Connections</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Global Speed Limiter (KB/sec, 0 = Unlimited)
                </label>
                <input
                  type="number"
                  min={0}
                  value={Math.round((draft.speedLimitBps || 0) / 1024)}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      speedLimitBps: Math.max(0, Number(e.target.value)) * 1024,
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>
          )}

          {tab === 'proxy' && (
            <div className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Proxy Mode</label>
                <select
                  value={draft.proxy?.mode || 'system'}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      proxy: { ...draft.proxy, mode: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                >
                  <option value="system">Use System Proxy Settings</option>
                  <option value="none">No Proxy (Direct Connection)</option>
                  <option value="manual">Manual HTTP / SOCKS5 Proxy</option>
                </select>
              </div>

              {draft.proxy?.mode === 'manual' && (
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Proxy Address (e.g. http://127.0.0.1:8080 or socks5://127.0.0.1:1080)
                  </label>
                  <input
                    type="text"
                    value={draft.proxy.url}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        proxy: { ...draft.proxy, url: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              )}
            </div>
          )}

          {tab === 'logins' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Server / Domain"
                  value={newLogin.pattern}
                  onChange={(e) => setNewLogin({ ...newLogin, pattern: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Username"
                  value={newLogin.username}
                  onChange={(e) => setNewLogin({ ...newLogin, username: e.target.value })}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg"
                />
                <div className="flex gap-1">
                  <input
                    type="password"
                    placeholder="Password"
                    value={newLogin.password}
                    onChange={(e) => setNewLogin({ ...newLogin, password: e.target.value })}
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newLogin.pattern.trim()) return;
                      setDraft({
                        ...draft,
                        siteLogins: [...(draft.siteLogins || []), newLogin],
                      });
                      setNewLogin({ pattern: '', username: '', password: '' });
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="max-h-32 overflow-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {(draft.siteLogins || []).length === 0 ? (
                  <div className="p-3 text-center text-slate-400">
                    No saved site logins.
                  </div>
                ) : (
                  draft.siteLogins.map((l, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-1.5"
                    >
                      <span>
                        <strong>{l.pattern}</strong> ({l.username})
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({
                            ...draft,
                            siteLogins: draft.siteLogins.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setOptionsOpen(false)}
            className="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveSettings(draft)}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
