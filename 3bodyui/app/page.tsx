"use client";

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
        // Simulate connection delay
        setTimeout(() => {
            setWalletConnected(true);
            setIsConnecting(false);
        }, 1500);
    };

    const handleReset = () => {
        setRole(UserRole.UNSELECTED);
        setWalletConnected(false); // Reset wallet on role change/reset
    };

    if (loading) {
        return <ThreeBodyLoader onComplete={() => setLoading(false)} />;
    }

    return (
        <div className="min-h-screen grid-pattern selection:bg-black selection:text-white flex flex-col">
            {role !== UserRole.UNSELECTED && (
                <Navbar
                    currentRole={role}
                    onReset={handleReset}
                    walletConnected={walletConnected}
                />
            )}

            <main className="flex-1 relative pb-24">
                {role === UserRole.UNSELECTED ? (
                    <div className="max-w-7xl mx-auto px-4 pt-20 pb-12 flex flex-col items-center justify-center min-h-[80vh]">
                        <div className="text-center mb-16 space-y-4 animate-in fade-in slide-in-from-top-4 duration-700">
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">3 BODY PAYMENT</h1>
                            <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto">
                                Decentralized tri-party settlement protocol. Choose your orbit to participate in the exchange ecosystem.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
                            <RoleCard
                                title="Payee"
                                description="Initiate USD swaps to USDT with smart-contract verified settlement."
                                icon={<PayeeIcon />}
                                onClick={() => handleRoleSelect(UserRole.PAYEE)}
                                delay="delay-100"
                            />
                            <RoleCard
                                title="Merchant"
                                description="Monitor system flow, manage protocol fees, and oversee transactions."
                                icon={<MerchantIcon />}
                                onClick={() => handleRoleSelect(UserRole.MERCHANT)}
                                delay="delay-200"
                            />
                            <RoleCard
                                title="Liquidity Provider"
                                description="Supply USDT liquidity and earn protocol fees on every exchange."
                                icon={<LPIcon />}
                                onClick={() => handleRoleSelect(UserRole.LIQUIDITY_PROVIDER)}
                                delay="delay-300"
                            />
                        </div>

                        <div className="mt-20 flex items-center gap-8 text-[10px] font-bold uppercase tracking-widest text-gray-500 font-mono">
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> MAINNET LIVE
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> 3B CONTRACTS v2.0
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /> HTTP 402 ENABLED
                            </div>
                        </div>
                    </div>
                ) : !walletConnected ? (
                    <ConnectWalletScreen onConnect={handleConnectWallet} isConnecting={isConnecting} />
                ) : (
                    <>
                        {role === UserRole.PAYEE && <PayeeDashboard />}
                        {role === UserRole.MERCHANT && <MerchantDashboard />}
                        {role === UserRole.LIQUIDITY_PROVIDER && <LPDashboard />}
                    </>
                )}
            </main>

            <footer className="fixed bottom-0 w-full bg-white/50 backdrop-blur-sm border-t border-gray-200/50 py-3 pointer-events-none">
                <div className="max-w-7xl mx-auto px-4 flex justify-between items-center text-[10px] text-gray-400 font-mono">
                    <span>&copy; 2024 THREE BODY PROTOCOL AG</span>
                    <span className="hidden sm:block">BLOCK: 19402502 • GAS: 12 GWEI</span>
                </div>
            </footer>
        </div>
    );
}

interface RoleCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    delay: string;
}

const RoleCard: React.FC<RoleCardProps> = ({ title, description, icon, onClick, delay }) => (
    <button
        onClick={onClick}
        className={`group relative bg-white border border-gray-200 p-8 rounded-3xl text-left hover:border-black hover:shadow-2xl hover:shadow-gray-300 transition-all duration-300 animate-in fade-in slide-in-from-bottom-8 ${delay}`}
    >
        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-black mb-6 group-hover:bg-black group-hover:text-white transition-colors duration-300">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-3">{title}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
        <div className="mt-8 flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity translate-x-[-10px] group-hover:translate-x-0">
            ENTER PORTAL <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </div>
    </button>
);

interface ConnectWalletProps {
    onConnect: () => void;
    isConnecting: boolean;
}

const ConnectWalletScreen: React.FC<ConnectWalletProps> = ({ onConnect, isConnecting }) => (
    <div className="max-w-md mx-auto mt-20 px-4 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl mx-auto flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-bold">Connect Wallet</h2>
                <p className="text-gray-500 text-sm">You must verify your identity before accessing the dashboard.</p>
            </div>

            <button
                onClick={onConnect}
                disabled={isConnecting}
                className="w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
                {isConnecting ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        CONNECTING...
                    </>
                ) : (
                    'CONNECT WALLET'
                )}
            </button>
        </div>
    </div>
);

// Icons
const PayeeIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;
const MerchantIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const LPIcon = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
