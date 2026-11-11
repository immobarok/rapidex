import React from 'react';

export const Toolbar: React.FC = () => (
  <header style={{ display: 'flex', gap: 8, padding: '10px 16px', borderBottom: '1px solid #e5e7eb' }}>
    <button>+ Add URL</button>
    <button>Resume</button>
    <button>Stop</button>
    <button>Stop All</button>
    <button>Delete</button>
    <button>Scheduler</button>
    <button>Options</button>
  </header>
);

