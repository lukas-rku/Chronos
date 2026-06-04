import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, CloudRain, Wind, Coffee, Mic } from 'lucide-react';
import { cn } from '../utils';

export function AmbientSoundscape() {
  const [playing, setPlaying] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  const stopAudio = () => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch(e) {}
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    setPlaying(null);
  };

  const playBrownNoise = () => {
    stopAudio();
    const ctx = initAudio();
    const bufferSize = ctx.sampleRate * 2; // 2 seconds
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // (roughly compensate for gain)
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.5;
    
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    source.start();
    sourceRef.current = source;
    gainNodeRef.current = gainNode;
    setPlaying('brown');
  };

  const playPinkNoise = () => {
    stopAudio();
    const ctx = initAudio();
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    
    for (let i = 0; i < bufferSize; i++) {
        let white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.11; 
        b6 = white * 0.115926;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gainNode = ctx.createGain();
    gainNode.gain.value = 0.5;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start();
    sourceRef.current = source;
    setPlaying('pink');
  };

  return (
    <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-xl">
      <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mr-2 flex items-center gap-1">
        <Volume2 className="w-3 h-3" /> Focus
      </span>
      <button 
        onClick={() => playing === 'brown' ? stopAudio() : playBrownNoise()}
        className={cn("p-1.5 rounded-full transition-colors", playing === 'brown' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-white')}
        title="Brown Noise"
      >
        <Wind className="w-4 h-4" />
      </button>
      <button 
        onClick={() => playing === 'pink' ? stopAudio() : playPinkNoise()}
        className={cn("p-1.5 rounded-full transition-colors", playing === 'pink' ? 'bg-pink-500/20 text-pink-400' : 'text-slate-400 hover:text-white')}
        title="Pink Noise"
      >
        <CloudRain className="w-4 h-4" />
      </button>
      {playing && (
        <button onClick={stopAudio} className="p-1.5 ml-1 text-slate-400 hover:text-red-400 transition-colors">
          <VolumeX className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
