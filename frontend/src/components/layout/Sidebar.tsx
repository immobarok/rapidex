import React from 'react';

export const Sidebar: React.FC = () => (
  <aside style={{ width: 220, borderRight: '1px solid #e5e7eb', padding: 12 }}>
    <h4>Categories</h4>
    <ul>
      <li>All Downloads</li>
      <li>Compressed</li>
      <li>Documents</li>
      <li>Music</li>
      <li>Programs</li>
      <li>Video</li>
    </ul>
    <h4>Queues</h4>
    <ul>
      <li>Main Queue</li>
      <li>Synchronization Queue</li>
    </ul>
  </aside>
);

