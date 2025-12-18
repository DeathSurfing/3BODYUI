
import React from 'react';

interface WalletButtonProps {
  address: string | null;
  onConnect: () => void;
}

const WalletButton: React.FC<WalletButtonProps> = ({ address, onConnect }) => {
  return (
    <button
      onClick={onConnect}
      className={`px-4 py-2 rounded-full font-medium transition-all ${
        address 
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
      }`}
    >
      {address 
        ? `${address.slice(0, 6)}...${address.slice(-4)}`
        : 'Connect Wallet'
      }
    </button>
  );
};

export default WalletButton;
