
import React from 'react';
import { NetworkLog } from '../types';

interface ProtocolVisualizerProps {
  logs: NetworkLog[];
}

const ProtocolVisualizer: React.FC<ProtocolVisualizerProps> = ({ logs }) => {
  return (
    <div className="bg-black border-l border-white w-full lg:w-96 flex flex-col h-full">
      <div className="p-4 border-b border-white flex items-center justify-between">
        <h2 className="font-bold text-[10px] tracking-[0.3em] uppercase">Traffic Log</h2>
        <span className="text-[10px] border border-white px-2 py-0.5 font-bold animate-pulse">LIVE</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {logs.length === 0 && (
          <div className="text-white/30 text-[10px] uppercase tracking-widest text-center mt-20">
            No Active Packets
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="border border-white/20 p-4 text-[10px] mono">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold border border-white px-1">
                {log.type} {log.method || ''} {log.status ? `[${log.status}]` : ''}
              </span>
              <span className="text-white/50">{log.role}</span>
            </div>
            {log.path && <div className="text-white/40 mb-3">{log.path}</div>}
            
            <div className="space-y-4">
              <div>
                <div className="text-white/30 uppercase mb-1">Headers</div>
                {Object.entries(log.headers).map(([k, v]) => (
                  <div key={k} className="flex gap-2 leading-tight">
                    <span className="text-white/40 shrink-0">{k}:</span>
                    <span className="text-white break-all">{v}</span>
                  </div>
                ))}
              </div>

              {log.body && (
                <div>
                  <div className="text-white/30 uppercase mb-1">Payload</div>
                  <pre className="text-white whitespace-pre-wrap break-all leading-tight">
                    {JSON.stringify(log.body, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProtocolVisualizer;
