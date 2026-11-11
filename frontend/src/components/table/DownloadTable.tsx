import React from 'react';

export const DownloadTable: React.FC = () => (
  <main style={{ flex: 1, padding: 16, overflow: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
          <th>File Name</th>
          <th>Size</th>
          <th>Status</th>
          <th>Time Left</th>
          <th>Transfer Rate</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
            No downloads yet. Click "+ Add URL" to start.
          </td>
        </tr>
      </tbody>
    </table>
  </main>
);

