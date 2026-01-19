import React, { useState, useEffect } from 'react';

interface ThreeBodyLoaderProps {
  onComplete?: () => void;
}

type AnimationPhase = 'orbit' | 'converge' | 'explode' | 'shrink' | 'finished';

export const ThreeBodyLoader: React.FC<ThreeBodyLoaderProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<AnimationPhase>('orbit');

  useEffect(() => {
    // 1. Orbit Phase (3s)
    const t1 = setTimeout(() => setPhase('converge'), 3000);

    // 2. Converge Phase (1s) -> move to center
    const t2 = setTimeout(() => setPhase('explode'), 4000);

    // 3. Explode/Reveal Phase (1.5s) -> Stickmen gone, Title Huge
    const t3 = setTimeout(() => setPhase('shrink'), 5500);

    // 4. Shrink Phase (0.5s) -> Fade out to website
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
    <div className={`fixed inset-0 bg-white flex flex-col items-center justify-center z-50 overflow-hidden transition-opacity duration-700 ${phase === 'finished' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

      {/* Container for Orbit & Converge */}
      <div className={`relative w-48 h-48 flex items-center justify-center transition-all duration-1000 ${phase === 'explode' || phase === 'shrink' ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}>

        {/* Body 1 */}
        <div className={`absolute w-full h-full transition-all duration-1000 ease-in-out ${phase === 'orbit' ? 'animate-[spin_4s_linear_infinite]' : 'rotate-0'}`}>
          <div className={`absolute transition-all duration-1000 ease-in-out ${phase === 'converge' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : 'top-0 left-1/2 -translate-x-1/2'}`}>
            <StickFigure className="w-8 h-8 text-black opacity-80" />
          </div>
        </div>

        {/* Body 2 */}
        <div className={`absolute w-full h-full transition-all duration-1000 ease-in-out ${phase === 'orbit' ? 'animate-[spin_6s_linear_infinite_reverse]' : 'rotate-0'}`}>
          <div className={`absolute transition-all duration-1000 ease-in-out ${phase === 'converge' ? 'bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2' : 'bottom-4 left-4'}`}>
            <StickFigure className="w-8 h-8 text-black opacity-60" />
          </div>
        </div>

        {/* Body 3 */}
        <div className={`absolute w-full h-full transition-all duration-1000 ease-in-out ${phase === 'orbit' ? 'animate-[spin_8s_linear_infinite]' : 'rotate-0'}`}>
          <div className={`absolute transition-all duration-1000 ease-in-out ${phase === 'converge' ? 'bottom-1/2 right-1/2 translate-x-1/2 translate-y-1/2' : 'bottom-4 right-4'}`}>
            <StickFigure className="w-8 h-8 text-black opacity-40" />
          </div>
        </div>

      </div>

      {/* Center Text - Appears during Explode */}
      <div className={`absolute inset-0 flex items-center justify-center pointer-events-none`}>
        <div className={`transition-all duration-1000 ease-out transform ${phase === 'orbit' || phase === 'converge' ? 'opacity-0 scale-50' :
          phase === 'explode' ? 'opacity-100 scale-150' :
            'opacity-0 scale-90 translate-y-10' // Shrink/Fade out state
          }`}>
          <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-black">
            3 BODY
          </h1>
        </div>
      </div>

      {/* Loading subtext (only during orbit) */}
      <p className={`mt-8 text-sm text-gray-400 font-mono tracking-tighter animate-pulse absolute bottom-12 transition-opacity duration-500 ${phase === 'orbit' ? 'opacity-100' : 'opacity-0'}`}>
        STABILIZING ORBITAL RESONANCE...
      </p>
    </div>
  );
}

const StickFigure = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <circle cx="12" cy="5" r="3" />
    <path d="m9 20 3-6 3 6" />
    <path d="M6 8l6 2 6-2" />
    <path d="M12 10v4" />
  </svg>
)
