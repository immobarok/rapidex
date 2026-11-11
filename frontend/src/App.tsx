import React from 'react';
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

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <DownloadTable />
      </div>
      <StatusBar />

      {/* IDM Modals & Per-Download Inspector */}
      <AddUrlModal />
      <ProgressDialog />
      <SchedulerModal />
      <OptionsModal />
    </div>
  );
}
