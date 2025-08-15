'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface AudioVisualizerProps {
  audioUrl: string;
}

export default function AudioVisualizer({ audioUrl }: AudioVisualizerProps) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadAudio = useCallback(async () => {
    if (!waveformRef.current) return;

    try {
      // Cancel any previous loading operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new abort controller for this load
      abortControllerRef.current = new AbortController();
      
      // Clean up previous WaveSurfer instance
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }

      setIsLoading(true);
      setError(null);

      // Check if this load was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      // Initialize WaveSurfer
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

      // Check if this load was aborted after creation
      if (abortControllerRef.current.signal.aborted) {
        wavesurfer.destroy();
        return;
      }

      wavesurferRef.current = wavesurfer;

      // Load audio
      await wavesurfer.load(audioUrl);

      // Check if this load was aborted after loading
      if (abortControllerRef.current.signal.aborted) {
        wavesurfer.destroy();
        return;
      }

      // Handle loading states
      wavesurfer.on('ready', () => {
        if (!abortControllerRef.current?.signal.aborted) {
          setIsLoading(false);
        }
      });

      wavesurfer.on('error', (error) => {
        if (!abortControllerRef.current?.signal.aborted) {
          console.error('WaveSurfer error:', error);
          setError('Failed to load audio visualization');
          setIsLoading(false);
        }
      });

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // This is expected when switching audio files quickly
        return;
      }
      
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('Audio loading error:', error);
        setError('Failed to load audio');
        setIsLoading(false);
      }
    }
  }, [audioUrl]);

  useEffect(() => {
    // Add a small delay to prevent rapid switching issues
    const timeoutId = setTimeout(() => {
      loadAudio();
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, [loadAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, []);

  if (error) {
    return (
      <div className="w-full">
        <h4 className="text-lg font-medium text-white mb-4">Audio Waveform</h4>
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-center">
          <p className="text-red-300 font-medium">{error}</p>
          <button 
            onClick={loadAudio}
            className="mt-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
