
import React from 'react';

interface WalletButtonProps {
  address: string | null;
  onConnect: () => void;
}

const WalletButton: React.FC<WalletButtonProps> = ({ address, onConnect }) => {
  return (
    <button
      onClick={onConnect}
      className={`px-6 py-2 border font-bold text-xs uppercase tracking-widest transition-all ${
        address 
          ? 'bg-transparent border-white text-white' 
          : 'bg-white text-black border-white hover:bg-black hover:text-white'
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
