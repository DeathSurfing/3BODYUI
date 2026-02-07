'use client';

import React from 'react';
import { UserRole } from '../../types';

interface NavbarProps {
  currentRole: UserRole;
  onReset: () => void;
  walletConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, walletConnected }) => {
  const roleColors: Record<UserRole, string> = {
    [UserRole.UNSELECTED]: '#666',
    [UserRole.PAYEE]: '#C9A962',
    [UserRole.MERCHANT]: '#B87333',
    [UserRole.LIQUIDITY_PROVIDER]: '#8B7355',
  };

  return (
    <nav className="h-14 bg-[#0a0a0a] border-b-[3px] border-[#333] flex items-center justify-between px-4 md:px-6">
      {/* Left - Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#444]">
        <span>Dashboard</span>
        <span>/</span>
        <span style={{ color: roleColors[currentRole] }}>{currentRole.replace('_', ' ')}</span>
      </div>

      {/* Right - Status */}
      <div className="flex items-center gap-3">
        <div 
          className={`flex items-center gap-2 px-3 py-1.5 border-[3px] ${
            walletConnected 
              ? 'border-[#C9A962] bg-[#C9A962]/10' 
              : 'border-[#B87333] bg-[#B87333]/10'
          }`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${walletConnected ? 'bg-[#C9A962] animate-pulse' : 'bg-[#B87333]'}`} />
          <span className={`text-[10px] font-mono uppercase ${walletConnected ? 'text-[#C9A962]' : 'text-[#B87333]'}`}>
            {walletConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
