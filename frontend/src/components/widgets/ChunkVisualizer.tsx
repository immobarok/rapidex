import React from 'react';
import { ChunkState } from '../../types/download';

// IDM-style multi-connection segmented progress bar showing each worker connection's byte range.
export const ChunkVisualizer: React.FC<{ chunks: ChunkState[] }> = ({ chunks }) => {
  if (!chunks || chunks.length === 0) {
    return (
      <div className="h-2.5 w-full bg-slate-800 rounded overflow-hidden">
        <div className="h-full w-full bg-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex gap-0.5 h-2.5 w-full bg-slate-950 p-0.5 rounded border border-slate-800 overflow-hidden">
      {chunks.map((c) => {
        const total = Math.max(1, c.endByte - c.startByte);
        const pct = Math.min(100, Math.max(0, Math.round(((c.currentPos - c.startByte) / total) * 100)));
        return (
          <div key={c.id} className="flex-1 bg-slate-800/90 rounded-[1px] overflow-hidden">
            <div
              className={`h-full transition-all duration-150 ${
                c.active ? 'bg-blue-500' : 'bg-amber-500/80'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        );
      })}
    </div>
  );
};
