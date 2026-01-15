
import React from 'react';
import { UserRole } from '../../types';
import { APP_NAME } from '../../constants';

interface NavbarProps {
  currentRole: UserRole;
  onReset: () => void;
  walletConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, onReset, walletConnected }) => {
  return (
    <nav className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={onReset}
        >
          <div className="w-8 h-8 bg-black rounded flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
            3B
          </div>
          <span className="font-bold tracking-tight hidden sm:block">{APP_NAME}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Role</span>
            <span className="text-xs font-mono font-medium">{currentRole.replace('_', ' ')}</span>
          </div>
          
          <div className={`px-3 py-1.5 rounded-full border text-xs font-medium flex items-center gap-2 ${
            walletConnected ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${walletConnected ? 'bg-green-500' : 'bg-orange-500 animate-pulse'}`} />
            {walletConnected ? 'Wallet Linked' : 'Disconnected'}
          </div>
        </div>
      </div>
    </nav>
  );
};
