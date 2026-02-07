'use client';

import React from 'react';
import { UserRole } from '../../types';

interface NavbarProps {
  currentRole: UserRole;
  onReset: () => void;
  walletConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, onReset, walletConnected }) => {
  const roleNames: Record<UserRole, string> = {
    [UserRole.UNSELECTED]: '',
    [UserRole.PAYEE]: 'Payee',
    [UserRole.MERCHANT]: 'Merchant',
    [UserRole.LIQUIDITY_PROVIDER]: 'Liquidity Provider',
  };

  const roleColors: Record<UserRole, string> = {
    [UserRole.UNSELECTED]: '#666',
    [UserRole.PAYEE]: '#C9A962',
    [UserRole.MERCHANT]: '#B87333',
    [UserRole.LIQUIDITY_PROVIDER]: '#8B7355',
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0a0a0a]/95 backdrop-blur-md border-b-[3px] border-[#333]">
      <div className="max-w-7xl mx-auto px-4 h-16 md:h-20 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={onReset}
          className="flex items-center gap-3 group"
        >
          <div className="relative">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-[#141414] border-[3px] border-[#333] flex items-center justify-center group-hover:border-[#C9A962] transition-colors duration-200">
              <span 
                className="font-display font-bold text-lg md:text-xl"
                style={{ color: roleColors[currentRole] }}
              >
                3B
              </span>
            </div>
            {/* Corner accent */}
            <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-[#C9A962] opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="hidden sm:block">
            <span className="font-display font-bold text-lg md:text-xl tracking-tight">
              3 BODY
            </span>
            <span className="block text-[8px] font-mono uppercase tracking-[0.2em] text-[#666]">
              Payment Protocol
            </span>
          </div>
        </button>

        {/* Center - Role Indicator */}
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#666]">
            Current Role
          </span>
          <span 
            className="font-display font-semibold text-sm md:text-base"
            style={{ color: roleColors[currentRole] }}
          >
            {roleNames[currentRole]}
          </span>
        </div>

        {/* Right - Wallet Status */}
        <div className="flex items-center gap-3">
          <div 
            className={`px-3 py-1.5 md:px-4 md:py-2 border-[3px] flex items-center gap-2 transition-all duration-200 ${
              walletConnected 
                ? 'border-[#C9A962] bg-[#C9A962]/10' 
                : 'border-[#B87333] bg-[#B87333]/10'
            }`}
          >
            <div 
              className={`w-2 h-2 rounded-full ${
                walletConnected 
                  ? 'bg-[#C9A962] animate-pulse' 
                  : 'bg-[#B87333]'
              }`} 
            />
            <span className={`text-[10px] md:text-xs font-mono uppercase tracking-wider ${
              walletConnected ? 'text-[#C9A962]' : 'text-[#B87333]'
            }`}>
              {walletConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 border-[3px] border-[#333] hover:border-[#C9A962] transition-colors">
            <MenuIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Role Indicator Bar */}
      <div 
        className="h-[3px] w-full bg-[#333]"
      >
        <div 
          className="h-full bg-[#C9A962]"
          style={{ width: '100%', opacity: 0.5 }}
        />
      </div>
    </nav>
  );
};

const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export default Navbar;
