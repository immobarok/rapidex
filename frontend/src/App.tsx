import React, { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Toolbar } from './components/layout/Toolbar';
import { StatusBar } from './components/layout/StatusBar';
import { DownloadTable } from './components/table/DownloadTable';
import {
  AddUrlModal,
  ProgressDialog,
  SchedulerModal,
  OptionsModal,
} from './components/dialogs';
import { useDownloadStore } from './store/useDownloadStore';

export default function App() {
  const initBackend = useDownloadStore((s) => s.initBackend);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initBackend().then((fn) => {
      cleanup = fn;
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, [initBackend]);

  return (
    <div className="flex flex-col h-screen w-screen bg-white text-slate-900">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <DownloadTable />
      </div>
      <StatusBar />

      {/* Real Wails-bound Modals & Live Connection Inspector */}
      <AddUrlModal />
      <ProgressDialog />
      <SchedulerModal />
      <OptionsModal />
    </div>
  );
}
