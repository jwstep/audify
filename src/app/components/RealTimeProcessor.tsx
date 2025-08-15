'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Activity, Zap } from 'lucide-react';

interface RealTimeProcessorProps {
  isRecording: boolean;
  onAudioData: (data: Float32Array) => void;
}

export default function RealTimeProcessor({ isRecording, onAudioData }: RealTimeProcessorProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [realTimeFeatures, setRealTimeFeatures] = useState({
    volume: 0,
    frequency: 0,
    isLoud: false
  });

  const calculateVolume = useCallback((timeData: Float32Array): number => {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      sum += timeData[i] * timeData[i];
    }
    const rms = Math.sqrt(sum / timeData.length);
    return Math.min(1, rms * 10); // Scale and clamp to 0-1
  }, []);

  const calculateDominantFrequency = useCallback((frequencyData: Float32Array): number => {
    let maxIndex = 0;
    let maxValue = -Infinity;

    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxValue) {
        maxValue = frequencyData[i];
        maxIndex = i;
      }
    }

    // Convert bin index to frequency
    const sampleRate = audioContextRef.current?.sampleRate || 44100;
    return (maxIndex * sampleRate) / (analyserRef.current?.fftSize || 256);
  }, []);

  const startAnalysisLoop = useCallback(() => {
    if (!analyserRef.current) return;

    const analyser = analyserRef.current;
    const dataArray = new Float32Array(analyser.frequencyBinCount);
    const timeData = new Float32Array(analyser.frequencyBinCount);

    const analyze = () => {
      if (!isRecording) return;

      analyser.getFloatFrequencyData(dataArray);
      analyser.getFloatTimeDomainData(timeData);

      // Calculate real-time features
      const volume = calculateVolume(timeData);
      const frequency = calculateDominantFrequency(dataArray);
      const isLoud = volume > 0.3; // Threshold for "loud" audio

      setRealTimeFeatures({ volume, frequency, isLoud });

      // Send audio data to parent component
      onAudioData(timeData);

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    analyze();
  }, [isRecording, onAudioData, calculateVolume, calculateDominantFrequency]);

  const startRealTimeAnalysis = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Create AudioContext with cross-browser support
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      startAnalysisLoop();
    } catch (error) {
      console.error('Error starting real-time analysis:', error);
    }
  }, [startAnalysisLoop]);

  const stopRealTimeAnalysis = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyserRef.current = null;
  }, []);

  useEffect(() => {
    if (isRecording) {
      startRealTimeAnalysis();
    } else {
      stopRealTimeAnalysis();
    }

    return () => {
      stopRealTimeAnalysis();
    };
  }, [isRecording, startRealTimeAnalysis, stopRealTimeAnalysis]);

  if (!isRecording) {
    return (
      <div className="bg-white/5 rounded-lg border border-white/10 p-6 text-center">
        <MicOff className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400">Start recording to see real-time analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-white mb-4">Real-Time Analysis</h4>
      
      {/* Volume Meter */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-slate-300">Volume Level</span>
        </div>
        
        <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-100 ${
              realTimeFeatures.isLoud ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${realTimeFeatures.volume * 100}%` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0%</span>
          <span>{Math.round(realTimeFeatures.volume * 100)}%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Frequency Display */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-medium text-slate-300">Dominant Frequency</span>
        </div>
        
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            {realTimeFeatures.frequency > 0 ? `${realTimeFeatures.frequency.toFixed(0)} Hz` : '--'}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {realTimeFeatures.frequency > 0 ? getFrequencyDescription(realTimeFeatures.frequency) : 'No signal'}
          </p>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`rounded-lg p-3 text-center ${
          realTimeFeatures.isLoud ? 'bg-red-500/20 border-red-500/30' : 'bg-green-500/20 border-green-500/30'
        } border`}>
          <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
            realTimeFeatures.isLoud ? 'bg-red-500 animate-pulse' : 'bg-green-500'
          }`} />
          <span className="text-sm font-medium text-white">
            {realTimeFeatures.isLoud ? 'Loud' : 'Normal'}
          </span>
        </div>

        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3 text-center">
          <Mic className="w-4 h-4 text-blue-400 mx-auto mb-2" />
          <span className="text-sm font-medium text-white">Recording</span>
        </div>
      </div>
    </div>
  );
}

function getFrequencyDescription(frequency: number): string {
  if (frequency < 20) return 'Sub-bass';
  if (frequency < 60) return 'Bass';
  if (frequency < 250) return 'Low-mid';
  if (frequency < 500) return 'Mid';
  if (frequency < 2000) return 'Upper-mid';
  if (frequency < 4000) return 'Presence';
  if (frequency < 8000) return 'Brilliance';
  return 'High';
}
