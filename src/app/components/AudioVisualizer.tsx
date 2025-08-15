'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioVisualizerProps {
  audioUrl: string;
}

export default function AudioVisualizer({ audioUrl }: AudioVisualizerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!waveformRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#8b5cf6',
      progressColor: '#3b82f6',
      cursorColor: '#ffffff',
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 1,
      height: 120,
      barGap: 2,
      normalize: true,
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.load(audioUrl);

    wavesurfer.on('ready', () => {
      setIsLoading(false);
    });

    wavesurfer.on('error', (error) => {
      console.error('WaveSurfer error:', error);
      setIsLoading(false);
    });

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [audioUrl]);

  return (
    <div className="w-full">
      <h4 className="text-lg font-medium text-white mb-4">Audio Waveform</h4>
      
      {isLoading && (
        <div className="flex items-center justify-center h-32 bg-white/5 rounded-lg border border-white/10">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
            Loading waveform...
          </div>
        </div>
      )}
      
      <div 
        ref={waveformRef} 
        className="bg-white/5 rounded-lg border border-white/10 p-4"
      />
      
      <div className="mt-4 text-center">
        <p className="text-sm text-slate-400">
          Click and drag on the waveform to navigate
        </p>
      </div>
    </div>
  );
}
