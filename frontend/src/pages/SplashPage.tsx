import React, { useEffect } from 'react';

interface SplashPageProps {
  onFinish: () => void;
}

export const SplashPage: React.FC<SplashPageProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className="fixed inset-0 z-50 bg-[#08090D] flex flex-col justify-between items-center p-8 cursor-pointer select-none overflow-hidden max-w-md mx-auto"
    >
      {/* Background Anime Silhouette Art matching mockup */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1080&auto=format&fit=crop&q=80"
          alt="Cyberpunk Backdrop"
          className="w-full h-full object-cover opacity-45 filter brightness-75 contrast-125"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090D] via-transparent to-[#08090D]/80" />
      </div>

      {/* Top Brand Header */}
      <div className="relative z-10 flex flex-col items-center mt-20">
        {/* Glowing Neon P Logo */}
        <div className="w-24 h-24 mb-4 relative flex items-center justify-center animate-pulse-glow">
          <img src="/logo.svg" alt="Paaaaaaatify" className="w-full h-full drop-shadow-[0_0_25px_#1ED760]" />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Paaaaaaatify
        </h1>
        <p className="text-sm font-medium text-[#A1A1AA] mt-2 tracking-wide">
          Your Music. Your World. Together.
        </p>
      </div>

      {/* Bottom Audio Spectrum & Loading Label */}
      <div className="relative z-10 flex flex-col items-center mb-12 w-full">
        {/* Animated Green Sound Wave Bars */}
        <div className="flex items-end justify-center space-x-1.5 h-12 mb-6">
          <span className="w-1.5 bg-[#1ED760] rounded-full animate-equalizer-1 shadow-[0_0_8px_#1ED760]" />
          <span className="w-1.5 bg-[#1ED760] rounded-full animate-equalizer-2 shadow-[0_0_8px_#1ED760]" />
          <span className="w-1.5 bg-[#1ED760] rounded-full animate-equalizer-3 shadow-[0_0_8px_#1ED760]" />
          <span className="w-1.5 bg-[#1ED760] rounded-full animate-equalizer-4 shadow-[0_0_8px_#1ED760]" />
          <span className="w-1.5 bg-[#1ED760] rounded-full animate-equalizer-2 shadow-[0_0_8px_#1ED760]" />
          <span className="w-1.5 bg-[#1ED760] rounded-full animate-equalizer-1 shadow-[0_0_8px_#1ED760]" />
          <span className="w-1.5 bg-[#1ED760] rounded-full animate-equalizer-3 shadow-[0_0_8px_#1ED760]" />
        </div>

        <p className="text-xs text-[#A1A1AA] font-medium tracking-wider animate-pulse flex items-center space-x-1">
          <span>Loading your vibe... 🎵</span>
        </p>
      </div>
    </div>
  );
};

