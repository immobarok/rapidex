import React from 'react';

// IDM-style segmented progress bar showing each worker connection's byte range.
export const ChunkVisualizer: React.FC<{ chunks: Array<{ id: number; startByte: number; currentPos: number; endByte: number }> }> = ({ chunks }) => (
  <div style={{ display: 'flex', gap: 2, height: 14, width: '100%', background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
    {chunks.map((c) => {
      const total = Math.max(1, c.endByte - c.startByte);
      const pct = Math.min(100, Math.round(((c.currentPos - c.startByte) / total) * 100));
      return (
        <div key={c.id} style={{ flex: 1, background: '#d1d5db' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: '#2563eb' }} />
        </div>
      );
    })}
  </div>
);

