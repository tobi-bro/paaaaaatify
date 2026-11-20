import React from 'react';
import { X, Mic2 } from 'lucide-react';
import { useAudioPlayer } from '../context/AudioPlayerContext';

interface LyricsDrawerProps {
  onClose: () => void;
}

export const LyricsDrawer: React.FC<LyricsDrawerProps> = ({ onClose }) => {
  const { currentSong } = useAudioPlayer();

  const sampleLyrics = currentSong?.lyrics || `[Verse 1]
Baby, back then, didn't want me around
Now I'm on top, everybody looking up
Paaaaaaatify playing across the town
Neon green pulse, never turning down.

[Chorus]
Industry baby, yeah we run the game
100% free sound, remember the name
No limits, no paywalls, only pure vibe
Sing it together, we stay alive.

[Verse 2]
Late night studio, soundwave high
Cyberpunk reflections in our eyes
Feel the rhythm sync with every friend
The beat never has to end.`;

  return (
    <div className="fixed inset-0 z-50 bg-[#08090D]/95 backdrop-blur-2xl flex flex-col p-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1B1E28]">
        <div className="flex items-center space-x-2">
          <Mic2 className="w-5 h-5 text-[#1ED760]" />
          <h3 className="font-bold text-white text-lg">Lyrics</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-[#A1A1AA] hover:text-white rounded-full bg-[#12141B] border border-[#1B1E28]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Song Title Banner */}
      <div className="py-4">
        <h4 className="text-xl font-bold text-white">{currentSong?.title}</h4>
        <p className="text-sm text-[#1ED760]">{currentSong?.artist_name}</p>
      </div>

      {/* Lyrics Scrollable Body */}
      <div className="flex-1 overflow-y-auto space-y-6 py-4 pr-2 text-lg font-medium leading-relaxed text-[#A1A1AA]">
        {sampleLyrics.split('\n\n').map((stanza, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl transition-all ${
              idx === 1
                ? 'bg-gradient-to-r from-purple-900/30 to-[#1ED760]/20 text-white font-bold border border-[#1ED760]/30 shadow-lg text-xl'
                : 'hover:text-white'
            }`}
          >
            {stanza.split('\n').map((line, lIdx) => (
              <p key={lIdx} className="my-1">
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

