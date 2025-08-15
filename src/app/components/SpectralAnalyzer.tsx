'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { BarChart3, Music, Activity } from 'lucide-react';
import { AudioFeatures } from '../services/audioAnalysis';

interface SpectralAnalyzerProps {
  audioFeatures: AudioFeatures | null;
  isAnalyzing: boolean;
}

export default function SpectralAnalyzer({ audioFeatures, isAnalyzing }: SpectralAnalyzerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  const drawFrequencyBands = useCallback((ctx: CanvasRenderingContext2D, bands: { low: number, mid: number, high: number }) => {
    const { width, height } = canvasSize;
    const barWidth = width / 3;
    const maxValue = Math.max(bands.low, bands.mid, bands.high);
    
    // Normalize values
    const normalizedLow = maxValue > 0 ? (bands.low / maxValue) * height * 0.6 : 0;
    const normalizedMid = maxValue > 0 ? (bands.mid / maxValue) * height * 0.6 : 0;
    const normalizedHigh = maxValue > 0 ? (bands.high / maxValue) * height * 0.6 : 0;

    // Draw bars
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(0, height - normalizedLow, barWidth, normalizedLow);
    
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(barWidth, height - normalizedMid, barWidth, normalizedMid);
    
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(barWidth * 2, height - normalizedHigh, barWidth, normalizedHigh);

    // Draw labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Low', barWidth / 2, height - 10);
    ctx.fillText('Mid', barWidth + barWidth / 2, height - 10);
    ctx.fillText('High', barWidth * 2 + barWidth / 2, height - 10);
  }, [canvasSize]);

  const drawSpectralFeatures = useCallback((ctx: CanvasRenderingContext2D, features: AudioFeatures) => {
    const { width, height } = canvasSize;
    
    // Draw spectral centroid indicator
    const centroidX = (features.spectralCentroid / 22050) * width; // Normalize to Nyquist frequency
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centroidX, 0);
    ctx.lineTo(centroidX, height);
    ctx.stroke();
    
    // Draw spectral rolloff indicator
    const rolloffX = (features.spectralRolloff / 22050) * width;
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(rolloffX, 0);
    ctx.lineTo(rolloffX, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [canvasSize]);

  const drawDominantFrequencies = useCallback((ctx: CanvasRenderingContext2D, frequencies: number[]) => {
    const { width, height } = canvasSize;
    
    frequencies.forEach((freq, index) => {
      if (freq > 0) {
        const x = (freq / 22050) * width;
        const y = height - (index + 1) * 30;
        
        // Draw frequency marker
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw frequency label
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Inter';
        ctx.textAlign = 'left';
        ctx.fillText(`${freq.toFixed(0)}Hz`, x + 8, y + 4);
      }
    });
  }, [canvasSize]);

  useEffect(() => {
    if (!audioFeatures || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw frequency bands visualization
    drawFrequencyBands(ctx, audioFeatures.frequencyBands);
    
    // Draw spectral features
    drawSpectralFeatures(ctx, audioFeatures);
    
    // Draw dominant frequencies
    drawDominantFrequencies(ctx, audioFeatures.dominantFrequencies);
  }, [audioFeatures, canvasSize, drawFrequencyBands, drawSpectralFeatures, drawDominantFrequencies]);

  if (isAnalyzing) {
    return (
      <div className="bg-white/5 rounded-lg border border-white/10 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-400">Analyzing audio...</p>
        </div>
      </div>
    );
  }

  if (!audioFeatures) {
    return (
      <div className="bg-white/5 rounded-lg border border-white/10 p-6 text-center">
        <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <p className="text-slate-400">Record or upload audio to see spectral analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-lg font-medium text-white mb-4">Spectral Analysis</h4>
      
      {/* Canvas for visualizations */}
      <div className="bg-white/5 rounded-lg border border-white/10 p-4">
        <canvas
          ref={canvasRef}
          className="w-full h-32 bg-gradient-to-b from-slate-800 to-slate-900 rounded"
        />
      </div>

      {/* Audio Features Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-slate-300">Pitch</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {audioFeatures.pitch > 0 ? `${audioFeatures.pitch.toFixed(0)} Hz` : 'N/A'}
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Tempo</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {audioFeatures.tempo.toFixed(0)} BPM
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-slate-300">Energy</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {(audioFeatures.rmsEnergy * 100).toFixed(1)}%
          </p>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-slate-300">Flatness</span>
          </div>
          <p className="text-lg font-semibold text-white">
            {audioFeatures.spectralFlatness.toFixed(3)}
          </p>
        </div>
      </div>

      {/* Advanced Features */}
      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
        <h5 className="text-sm font-medium text-slate-300 mb-3">Advanced Features</h5>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Spectral Centroid:</span>
            <span className="text-white">{audioFeatures.spectralCentroid.toFixed(0)} Hz</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Spectral Rolloff:</span>
            <span className="text-white">{audioFeatures.spectralRolloff.toFixed(0)} Hz</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Zero Crossing Rate:</span>
            <span className="text-white">{(audioFeatures.zeroCrossingRate * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
