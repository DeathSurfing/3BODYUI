'use client';

import React, { useState } from 'react';
import { UserRole } from '@/types';
import { ThreeBodyLoader } from '@/components/loader/ThreeBodyLoader';
import { Navbar } from '@/components/layout/Navbar';
import { PayeeDashboard } from '@/components/roles/payee/PayeeDashboard';
import { MerchantDashboard } from '@/components/roles/merchant/MerchantDashboard';
import { LPDashboard } from '@/components/roles/liquidityProvider/LPDashboard';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(UserRole.UNSELECTED);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
  };

  const handleConnectWallet = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setWalletConnected(true);
      setIsConnecting(false);
    }, 1500);
  };

  const handleReset = () => {
    setRole(UserRole.UNSELECTED);
    setWalletConnected(false);
  };

  if (loading) {
    return <ThreeBodyLoader onComplete={() => setLoading(false)} />;
  }

  return (
    <div className="min-h-screen bg-black text-white grid-pattern safe-area-top safe-area-bottom">
      {role !== UserRole.UNSELECTED && (
        <Navbar
          currentRole={role}
          onReset={handleReset}
          walletConnected={walletConnected}
        />
      )}

      <main className="flex-1 relative pb-24">
        {role === UserRole.UNSELECTED ? (
          <RoleSelection onSelect={handleRoleSelect} />
        ) : !walletConnected ? (
          <ConnectWalletScreen 
            onConnect={handleConnectWallet} 
            isConnecting={isConnecting}
            role={role}
          />
        ) : (
          <DashboardContent role={role} />
        )}
      </main>

      {/* Brutalist Footer */}
      <footer className="fixed bottom-0 w-full bg-[#0a0a0a]/90 backdrop-blur-sm border-t-2 border-[#333] py-3 z-40">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-[10px] text-[#666] font-mono uppercase tracking-wider">
          <span>© 2024 Three Body Protocol</span>
          <div className="flex gap-4">
            <span className="hidden sm:inline">Block: <span className="text-[#C9A962]">19,402,502</span></span>
            <span className="hidden sm:inline">Gas: <span className="text-[#C9A962]">12 Gwei</span></span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Mainnet
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Role Selection Component
interface RoleSelectionProps {
  onSelect: (role: UserRole) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelect }) => {
  const roles = [
    {
      role: UserRole.PAYEE,
      title: 'Payee',
      subtitle: 'Initiate Swaps',
      description: 'Convert USD to USDT via atomic smart contracts. Simple, fast, secure.',
      icon: PayeeIcon,
      color: '#C9A962',
      delay: 'delay-100',
    },
    {
      role: UserRole.MERCHANT,
      title: 'Merchant',
      subtitle: 'Monitor Protocol',
      description: 'Oversee network health, manage fees, and track real-time settlement flows.',
      icon: MerchantIcon,
      color: '#B87333',
      delay: 'delay-200',
    },
    {
      role: UserRole.LIQUIDITY_PROVIDER,
      title: 'Liquidity Provider',
      subtitle: 'Earn Yield',
      description: 'Supply USDT liquidity and earn protocol fees on every transaction.',
      icon: LPIcon,
      color: '#8B7355',
      delay: 'delay-300',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-16 md:pt-24 pb-12 min-h-screen flex flex-col">
      {/* Header */}
      <div className="text-center mb-12 md:mb-16 space-y-4 animate-fade-in-up">
          <div className="inline-block">
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-[#C9A962]">
              3 BODY
            </h1>
            <div className="mt-2 h-[3px] bg-[#C9A962]" />
        </div>
        <p className="text-[#B0B0B0] text-base md:text-lg max-w-xl mx-auto font-body">
          Decentralized tri-party settlement protocol. Choose your orbit to participate in the exchange ecosystem.
        </p>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full max-w-6xl mx-auto flex-1">
        {roles.map(({ role, title, subtitle, description, icon: Icon, color, delay }) => (
          <button
            key={role}
            onClick={() => onSelect(role)}
            className={`group relative bg-[#141414] border-[3px] border-[#333] p-6 md:p-8 text-left transition-all duration-300 hover:border-[${color}] hover:shadow-[4px_4px_0px_rgba(201,169,98,0.25)] hover:-translate-y-1 animate-fade-in-up ${delay}`}
          >
            {/* Art Deco Corner Accents */}
            <div 
              className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] transition-colors duration-300"
              style={{ borderColor: 'transparent' }}
            />
            <div 
              className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] transition-colors duration-300"
              style={{ borderColor: 'transparent' }}
            />
            
            {/* Hover Corner Accents */}
            <div 
              className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ borderColor: color }}
            />
            <div 
              className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ borderColor: color }}
            />

            {/* Icon Container */}
            <div 
              className="w-14 h-14 md:w-16 md:h-16 mb-6 flex items-center justify-center border-[3px] border-[#333] group-hover:border-[#C9A962] transition-colors duration-300"
              style={{ backgroundColor: `${color}10` }}
            >
              <Icon className="w-7 h-7 md:w-8 md:h-8" color={color} />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.2em]" style={{ color }}>
                {subtitle}
              </p>
              <h3 className="font-display text-xl md:text-2xl font-bold text-white group-hover:text-[#C9A962] transition-colors">
                {title}
              </h3>
              <p className="text-[#B0B0B0] text-sm leading-relaxed">
                {description}
              </p>
            </div>

            {/* Arrow Indicator */}
            <div className="mt-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#666] group-hover:text-[#C9A962] transition-all duration-300 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0">
              <span>Enter Portal</span>
              <ArrowIcon className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="mt-12 md:mt-16 flex flex-wrap justify-center gap-6 md:gap-12 text-[10px] font-mono uppercase tracking-[0.15em] text-[#666]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <span>Mainnet Live</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#C9A962] rounded-full" />
          <span>3B Contracts v2.0</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-[#B87333] rounded-full" />
          <span>HTTP 402 Enabled</span>
        </div>
      </div>
    </div>
  );
};

// Connect Wallet Screen
interface ConnectWalletProps {
  onConnect: () => void;
  isConnecting: boolean;
  role: UserRole;
}

const ConnectWalletScreen: React.FC<ConnectWalletProps> = ({ onConnect, isConnecting, role }) => {
  const roleNames: Record<UserRole, string> = {
    [UserRole.UNSELECTED]: '',
    [UserRole.PAYEE]: 'Payee',
    [UserRole.MERCHANT]: 'Merchant',
    [UserRole.LIQUIDITY_PROVIDER]: 'Liquidity Provider',
  };

  return (
    <div className="max-w-md mx-auto mt-12 md:mt-20 px-4 animate-fade-in-up">
      <div className="bg-[#141414] border-[3px] border-[#333] p-8 md:p-10 relative">
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#C9A962]" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#C9A962]" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-[#C9A962]" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-[#C9A962]" />

        <div className="text-center space-y-6">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto border-[3px] border-[#333] flex items-center justify-center bg-[#C9A962]/10">
            <WalletIcon className="w-8 h-8 text-[#C9A962]" />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#C9A962]">
              {roleNames[role]} Access
            </p>
            <h2 className="font-display text-2xl md:text-3xl font-bold">
              Connect Wallet
            </h2>
            <p className="text-[#B0B0B0] text-sm">
              Verify your identity to access the {roleNames[role].toLowerCase()} dashboard.
            </p>
          </div>

          {/* Connect Button */}
          <button
            onClick={onConnect}
            disabled={isConnecting}
            className="w-full py-4 bg-[#C9A962] text-[#0a0a0a] font-display font-bold text-sm uppercase tracking-wider border-[3px] border-[#C9A962] hover:bg-[#E8D5A3] hover:border-[#E8D5A3] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isConnecting ? (
              <>
                <LoadingSpinner />
                Connecting...
              </>
            ) : (
              <>
                <WalletIcon className="w-5 h-5" />
                Connect Wallet
              </>
            )}
          </button>

          {/* Security Note */}
          <p className="text-[10px] text-[#666] font-mono">
            Secure connection via Web3 authentication
          </p>
        </div>
      </div>
    </div>
  );
};

// Dashboard Content
interface DashboardContentProps {
  role: UserRole;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ role }) => {
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

const ArrowIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
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
