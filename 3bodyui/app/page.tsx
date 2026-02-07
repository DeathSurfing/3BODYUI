'use client';

import React, { useState } from 'react';
import { UserRole } from '@/types';
import { Navbar } from '@/components/layout/Navbar';
import { PayeeDashboard } from '@/components/roles/payee/PayeeDashboard';
import { MerchantDashboard } from '@/components/roles/merchant/MerchantDashboard';
import { LPDashboard } from '@/components/roles/liquidityProvider/LPDashboard';
import { ThreeBodyLoader } from '@/components/loader/ThreeBodyLoader';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<UserRole>(UserRole.PAYEE);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectWallet = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setWalletConnected(true);
      setIsConnecting(false);
    }, 1500);
  };

  if (loading) {
    return <ThreeBodyLoader onComplete={() => setLoading(false)} />;
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <Sidebar 
        activeRole={activeRole} 
        onRoleChange={setActiveRole}
        walletConnected={walletConnected}
        onConnect={handleConnectWallet}
        isConnecting={isConnecting}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <Navbar 
          currentRole={activeRole}
          onReset={() => {}}
          walletConnected={walletConnected}
        />
        
        <main className="flex-1 p-8 md:p-12 lg:p-16 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <DashboardContent 
              role={activeRole} 
              walletConnected={walletConnected}
              onConnect={handleConnectWallet}
              isConnecting={isConnecting}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

// Sidebar Component
interface SidebarProps {
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  walletConnected: boolean;
  onConnect: () => void;
  isConnecting: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeRole, 
  onRoleChange, 
  walletConnected,
  onConnect,
  isConnecting
}) => {
  const roles = [
    {
      role: UserRole.PAYEE,
      title: 'Payee',
      subtitle: 'Swap USD to USDT',
      color: '#C9A962',
      icon: PayeeIcon,
    },
    {
      role: UserRole.MERCHANT,
      title: 'Merchant',
      subtitle: 'Monitor Protocol',
      color: '#B87333',
      icon: MerchantIcon,
    },
    {
      role: UserRole.LIQUIDITY_PROVIDER,
      title: 'Liquidity Provider',
      subtitle: 'Earn Yield',
      color: '#8B7355',
      icon: LPIcon,
    },
  ];

  return (
    <aside className="w-24 md:w-80 bg-[#0a0a0a] border-r-[3px] border-[#333] flex flex-col">
      {/* Logo */}
      <div className="p-6 md:p-8 border-b-[3px] border-[#333]">
        <div className="flex items-center justify-center md:justify-start gap-4">
          <div className="w-14 h-14 bg-[#111] border-[3px] border-[#C9A962] flex items-center justify-center">
            <span className="font-display font-bold text-2xl text-[#C9A962]">3B</span>
          </div>
          <div className="hidden md:block">
            <span className="font-display font-bold text-2xl block">3 BODY</span>
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#666]">
              Payment Protocol
            </span>
          </div>
        </div>
      </div>

      {/* Role Navigation */}
      <nav className="flex-1 py-8 px-4 md:px-6 space-y-3">
        {roles.map(({ role, title, subtitle, color, icon: Icon }) => {
          const isActive = activeRole === role;
          return (
            <button
              key={role}
              onClick={() => onRoleChange(role)}
              className={`w-full flex items-center gap-4 p-5 md:p-6 border-[3px] transition-all duration-200 group text-left ${
                isActive 
                  ? 'bg-[#111] border-[#C9A962]' 
                  : 'bg-transparent border-transparent hover:border-[#333]'
              }`}
            >
              <div 
                className={`w-14 h-14 flex-shrink-0 flex items-center justify-center border-[3px] transition-colors ${
                  isActive ? 'border-[#C9A962] bg-[#C9A962]/10' : 'border-[#333] group-hover:border-[#444]'
                }`}
              >
                <Icon className="w-7 h-7" color={isActive ? '#C9A962' : '#666'} />
              </div>
              <div className="hidden md:block">
                <span className={`block font-display font-bold text-lg ${isActive ? 'text-white' : 'text-[#B0B0B0]'}`}>
                  {title}
                </span>
                <span className="block text-sm font-mono text-[#666] mt-1">
                  {subtitle}
                </span>
              </div>
              {isActive && (
                <div className="hidden md:block ml-auto w-2 h-2 bg-[#C9A962] rounded-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Wallet Section */}
      <div className="p-6 md:p-8 border-t-[3px] border-[#333]">
        {!walletConnected ? (
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="w-full py-4 md:py-5 bg-[#C9A962] text-black font-display font-bold text-sm uppercase tracking-wider border-[3px] border-[#C9A962] hover:bg-[#E8D5A3] hover:border-[#E8D5A3] disabled:opacity-50 transition-colors flex items-center justify-center gap-3"
          >
            {isConnecting ? (
              <>
                <LoadingSpinner />
                <span className="hidden md:inline">Connecting...</span>
              </>
            ) : (
              <>
                <WalletIcon className="w-5 h-5" />
                <span className="hidden md:inline">Connect Wallet</span>
              </>
            )}
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 border-[3px] border-[#C9A962] bg-[#C9A962]/10 flex items-center justify-center">
              <WalletIcon className="w-7 h-7 text-[#C9A962]" />
            </div>
            <div className="hidden md:block">
              <span className="block text-sm font-mono uppercase tracking-wider text-[#666]">Connected</span>
              <span className="block font-mono text-base text-[#C9A962] mt-1">0x3B0D...Y789</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-6 border-t border-[#222] text-sm font-mono text-[#444] hidden md:block">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Mainnet Live</span>
        </div>
        <div className="mb-1">Block: 19,402,502</div>
        <div className="text-[#333] mt-3">v2.0.0</div>
      </div>
    </aside>
  );
};

// Dashboard Content
interface DashboardContentProps {
  role: UserRole;
  walletConnected: boolean;
  onConnect: () => void;
  isConnecting: boolean;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ 
  role, 
  walletConnected,
  onConnect,
  isConnecting
}) => {
  if (!walletConnected) {
    return (
      <div className="h-full flex items-center justify-center min-h-[60vh]">
        <div className="bg-[#111] border-[3px] border-[#333] p-12 md:p-16 max-w-lg w-full text-center relative">
          {/* Corner Accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#C9A962]" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#C9A962]" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-[#C9A962]" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-[#C9A962]" />

          <div className="w-20 h-20 mx-auto mb-8 border-[3px] border-[#333] flex items-center justify-center bg-[#C9A962]/10">
            <WalletIcon className="w-10 h-10 text-[#C9A962]" />
          </div>

          <h2 className="font-display text-3xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-[#B0B0B0] text-base mb-8">
            Connect your wallet to access the dashboard features and manage your assets.
          </p>

          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="w-full py-5 bg-[#C9A962] text-black font-display font-bold text-base uppercase tracking-wider border-[3px] border-[#C9A962] hover:bg-[#E8D5A3] hover:border-[#E8D5A3] disabled:opacity-50 transition-colors flex items-center justify-center gap-4"
          >
            {isConnecting ? (
              <>
                <LoadingSpinner />
                Connecting...
              </>
            ) : (
              <>
                <WalletIcon className="w-6 h-6" />
                Connect Wallet
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  switch (role) {
    case UserRole.PAYEE:
      return <PayeeDashboard />;
    case UserRole.MERCHANT:
      return <MerchantDashboard />;
    case UserRole.LIQUIDITY_PROVIDER:
      return <LPDashboard />;
    default:
      return null;
  }
};

// Icons
const PayeeIcon: React.FC<{ className?: string; color?: string }> = ({ className, color = '#C9A962' }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);

const MerchantIcon: React.FC<{ className?: string; color?: string }> = ({ className, color = '#B87333' }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const LPIcon: React.FC<{ className?: string; color?: string }> = ({ className, color = '#8B7355' }) => (
  <svg className={className} fill="none" stroke={color} strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WalletIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
  </svg>
);

const LoadingSpinner: React.FC = () => (
  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);
