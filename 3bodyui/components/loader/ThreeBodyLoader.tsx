'use client';

import React, { useState, useEffect } from 'react';

interface ThreeBodyLoaderProps {
  onComplete?: () => void;
}

type AnimationPhase = 'orbit' | 'converge' | 'explode' | 'shrink' | 'finished';
type Particle = { id: number; x: number; y: number; delay: number };

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function createParticles(): Particle[] {
  return Array.from({ length: 50 }, (_, i) => ({
    id: i,
    // Deterministic values to avoid SSR hydration mismatch.
    x: seededRandom(i + 1) * 100,
    y: seededRandom(i + 101) * 100,
    delay: seededRandom(i + 201) * 2,
  }));
}

export const ThreeBodyLoader: React.FC<ThreeBodyLoaderProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<AnimationPhase>('orbit');
  const [particles] = useState<Particle[]>(() => createParticles());

  useEffect(() => {
    // Animation timeline
    const t1 = setTimeout(() => setPhase('converge'), 3000);
    const t2 = setTimeout(() => setPhase('explode'), 4000);
    const t3 = setTimeout(() => setPhase('shrink'), 5500);
    const t4 = setTimeout(() => {
      setPhase('finished');
      if (onComplete) onComplete();
    }, 6000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 bg-[#0a0a0a] flex flex-col items-center justify-center z-50 overflow-hidden transition-opacity duration-700 ${
        phase === 'finished' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              repeating-linear-gradient(0deg, rgba(201, 169, 98, 0.1) 0px, transparent 1px, transparent 40px, rgba(201, 169, 98, 0.1) 41px),
              repeating-linear-gradient(90deg, rgba(201, 169, 98, 0.1) 0px, transparent 1px, transparent 40px, rgba(201, 169, 98, 0.1) 41px)
            `,
          }}
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-[#C9A962] rounded-full animate-pulse"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              opacity: 0.3,
              animationDelay: `${particle.delay}s`,
              animationDuration: '3s',
            }}
          />
        ))}
      </div>

      {/* Main Animation Container */}
      <div className={`relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center transition-all duration-1000 ${
        phase === 'explode' || phase === 'shrink' ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
      }`}>
        {/* Central Gold Ring */}
        <div className={`absolute w-full h-full rounded-full border-2 border-[#C9A962] transition-all duration-1000 ${
          phase === 'converge' ? 'scale-150 opacity-50' : 'scale-100 opacity-30'
        }`} />
        
        {/* Inner Gold Ring */}
        <div className={`absolute w-3/4 h-3/4 rounded-full border border-[#8B7355] transition-all duration-1000 ${
          phase === 'converge' ? 'scale-125 opacity-40' : 'scale-100 opacity-20'
        }`} />

        {/* Body 1 - Gold Metallic */}
        <div 
          className={`absolute w-full h-full transition-all duration-1000 ease-in-out ${
            phase === 'orbit' ? 'animate-[spin_4s_linear_infinite]' : 'rotate-0'
          }`}
        >
          <div 
            className={`absolute transition-all duration-1000 ease-in-out ${
              phase === 'converge' 
                ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' 
                : 'top-0 left-1/2 -translate-x-1/2'
            }`}
          >
            <StickFigure className="w-12 h-12 md:w-16 md:h-16" color="#C9A962" />
          </div>
        </div>

        {/* Body 2 - Bronze Metallic */}
        <div 
          className={`absolute w-full h-full transition-all duration-1000 ease-in-out ${
            phase === 'orbit' ? 'animate-[spin_6s_linear_infinite_reverse]' : 'rotate-0'
          }`}
        >
          <div 
            className={`absolute transition-all duration-1000 ease-in-out ${
              phase === 'converge' 
                ? 'bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2' 
                : 'bottom-4 left-4 md:bottom-8 md:left-8'
            }`}
          >
            <StickFigure className="w-10 h-10 md:w-14 md:h-14" color="#B87333" opacity={0.8} />
          </div>
        </div>

        {/* Body 3 - Copper Metallic */}
        <div 
          className={`absolute w-full h-full transition-all duration-1000 ease-in-out ${
            phase === 'orbit' ? 'animate-[spin_8s_linear_infinite]' : 'rotate-0'
          }`}
        >
          <div 
            className={`absolute transition-all duration-1000 ease-in-out ${
              phase === 'converge' 
                ? 'bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2' 
                : 'bottom-4 right-4 md:bottom-8 md:right-8'
            }`}
          >
            <StickFigure className="w-8 h-8 md:w-12 md:h-12" color="#8B7355" opacity={0.6} />
          </div>
        </div>

        {/* Connection Lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <line 
            x1="50%" y1="50%" 
            x2="50%" y2="10%" 
            stroke="#C9A962" 
            strokeWidth="1" 
            opacity={phase === 'orbit' ? 0.3 : 0}
            className="transition-opacity duration-500"
          />
          <line 
            x1="50%" y1="50%" 
            x2="15%" y2="85%" 
            stroke="#B87333" 
            strokeWidth="1" 
            opacity={phase === 'orbit' ? 0.2 : 0}
            className="transition-opacity duration-500"
          />
          <line 
            x1="50%" y1="50%" 
            x2="85%" y2="85%" 
            stroke="#8B7355" 
            strokeWidth="1" 
            opacity={phase === 'orbit' ? 0.15 : 0}
            className="transition-opacity duration-500"
          />
        </svg>
      </div>

      {/* Center Text - Art Deco Typography Reveal */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div 
          className={`text-center transition-all duration-1000 ease-out transform ${
            phase === 'orbit' || phase === 'converge' 
              ? 'opacity-0 scale-50' 
              : phase === 'explode' 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-90 translate-y-10'
          }`}
        >
          <div className="relative">
            {/* Decorative Corner Accents */}
            <div className="absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 border-[#C9A962]" />
            <div className="absolute -top-4 -right-4 w-8 h-8 border-t-2 border-r-2 border-[#C9A962]" />
            <div className="absolute -bottom-4 -left-4 w-8 h-8 border-b-2 border-l-2 border-[#C9A962]" />
            <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 border-[#C9A962]" />
            
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-[#C9A962]">
              3 BODY
            </h1>
            <div className="mt-2 w-32 h-[3px] mx-auto bg-[#C9A962]" />
            <p className="mt-3 text-[#C9A962] font-body text-sm md:text-base tracking-[0.3em] uppercase">
              Payment Protocol
            </p>
          </div>
        </div>
      </div>

      {/* Loading Text - During Orbit Phase */}
      <div 
        className={`absolute bottom-20 md:bottom-32 text-center transition-opacity duration-500 ${
          phase === 'orbit' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="text-[#C9A962] font-mono text-xs md:text-sm tracking-[0.2em] uppercase animate-pulse">
          Stabilizing Orbital Resonance
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <div className="w-2 h-2 bg-[#C9A962] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-[#B87333] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-[#8B7355] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-8 md:bottom-16 left-8 right-8 md:left-16 md:right-16">
        <div className="h-0.5 bg-[#222] rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#C9A962] transition-all duration-300"
            style={{
              width: phase === 'orbit' ? '33%' : phase === 'converge' ? '66%' : phase === 'explode' ? '90%' : '100%',
            }}
          />
        </div>
      </div>
    </div>
  );
};

interface StickFigureProps {
  className?: string;
  color?: string;
  opacity?: number;
}

const StickFigure: React.FC<StickFigureProps> = ({ className, color = '#C9A962', opacity = 1 }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    style={{ opacity }}
  >
    {/* Head */}
    <circle cx="12" cy="5" r="2.5" fill={color} fillOpacity="0.2" />
    <circle cx="12" cy="5" r="2.5" />
    
    {/* Body */}
    <path d="M12 7.5v6" />
    
    {/* Arms */}
    <path d="m9 11 3-2 3 2" />
    
    {/* Legs */}
    <path d="m9 20 3-6 3 6" />
    
    {/* Metallic shine effect */}
    <defs>
      <linearGradient id={`metallic-${color.replace('#', '')}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity="0.8" />
        <stop offset="50%" stopColor="#E8D5A3" stopOpacity="0.4" />
        <stop offset="100%" stopColor={color} stopOpacity="0.8" />
      </linearGradient>
    </defs>
  </svg>
);

export default ThreeBodyLoader;
