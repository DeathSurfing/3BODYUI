
import React from 'react';
import { NetworkLog } from '../types';

interface ProtocolVisualizerProps {
  logs: NetworkLog[];
}

const ProtocolVisualizer: React.FC<ProtocolVisualizerProps> = ({ logs }) => {
  return (
    <div className="bg-[#18181b] border-l border-white/10 w-full lg:w-96 flex flex-col h-full">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-bold text-sm tracking-wider uppercase text-zinc-400">Network Traffic (X402)</h2>
        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">LIVE</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {logs.length === 0 && (
          <div className="text-zinc-500 text-sm text-center mt-20 italic">
            Waiting for protocol events...
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="border border-white/5 bg-zinc-900/50 rounded p-3 text-xs mono">
            <div className="flex justify-between items-start mb-2">
              <span className={`font-bold ${log.type === 'REQUEST' ? 'text-blue-400' : 'text-emerald-400'}`}>
                {log.type} {log.method || ''} {log.status ? `(${log.status})` : ''}
              </span>
              <span className="text-zinc-600 text-[10px]">{log.role}</span>
            </div>
            {log.path && <div className="text-zinc-400 mb-1">{log.path}</div>}
            
            <div className="mt-2">
              <div className="text-zinc-500 mb-1">Headers:</div>
              {Object.entries(log.headers).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <span className="text-zinc-400 shrink-0">{k}:</span>
                  <span className="text-zinc-200 truncate">{v}</span>
                </div>
              ))}
            </div>

            {log.body && (
              <div className="mt-2">
                <div className="text-zinc-500 mb-1">Body:</div>
                <pre className="text-zinc-300 whitespace-pre-wrap break-all overflow-x-hidden">
                  {JSON.stringify(log.body, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProtocolVisualizer;
