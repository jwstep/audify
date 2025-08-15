'use client';

import { useState, useRef, useCallback } from 'react';
import { Mic, Upload, Play, Square, Trash2, FileAudio, BarChart3 } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';
import SpectralAnalyzer from './SpectralAnalyzer';
import RealTimeProcessor from './RealTimeProcessor';
import { AudioAnalyzer, AudioFeatures } from '../services/audioAnalysis';

interface AudioData {
  blob: Blob;
  url: string;
  duration: number;
  timestamp: Date;
}

export default function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<string>('');
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Create audio element to get duration
        const audio = new Audio(audioUrl);
        audio.onloadedmetadata = () => {
          setAudioData({
            blob: audioBlob,
            url: audioUrl,
            duration: audio.duration,
            timestamp: new Date()
          });
        };
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Play audio
  const playAudio = useCallback(() => {
    if (audioData && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
        audioRef.current.onended = () => setIsPlaying(false);
      }
    }
  }, [audioData, isPlaying]);

  // Delete audio
  const deleteAudio = useCallback(() => {
    if (audioData) {
      URL.revokeObjectURL(audioData.url);
      setAudioData(null);
      setRecognitionResult('');
      setIsAnalyzing(false);
      setAudioFeatures(null);
      setShowAdvancedAnalysis(false);
    }
  }, [audioData]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      audio.onloadedmetadata = () => {
        setAudioData({
          blob: file,
          url: audioUrl,
          duration: audio.duration,
          timestamp: new Date()
        });
      };
    }
  }, []);

  // Analyze audio with advanced features
  const analyzeAudio = useCallback(async () => {
    if (!audioData) return;
    
    setIsAnalyzing(true);
    setRecognitionResult('');
    setAudioFeatures(null);
    
    try {
      // Initialize audio analyzer
      if (!audioAnalyzerRef.current) {
        audioAnalyzerRef.current = new AudioAnalyzer();
      }
      
      // Perform advanced analysis
      const features = await audioAnalyzerRef.current.analyzeAudio(audioData.blob);
      setAudioFeatures(features);
      
      // Generate enhanced recognition result
      const result = generateEnhancedResult(features);
      setRecognitionResult(result);
      
      setShowAdvancedAnalysis(true);
    } catch (error) {
      console.error('Audio analysis error:', error);
      setRecognitionResult('❌ Error analyzing audio. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [audioData]);

  // Generate enhanced recognition result based on audio features
  const generateEnhancedResult = (features: AudioFeatures): string => {
    let result = '🎵 Audio Analysis Results:\n\n';
    
    // Analyze frequency characteristics
    if (features.pitch > 0) {
      if (features.pitch < 200) {
        result += '🎤 Low-pitched audio detected\n';
      } else if (features.pitch < 800) {
        result += '🎤 Mid-pitched audio detected\n';
      } else {
        result += '🎤 High-pitched audio detected\n';
      }
    }
    
    // Analyze tempo
    if (features.tempo > 0) {
      if (features.tempo < 80) {
        result += '🐌 Slow tempo detected\n';
      } else if (features.tempo < 120) {
        result += '🐢 Moderate tempo detected\n';
      } else {
        result += '🚀 Fast tempo detected\n';
      }
    }
    
    // Analyze spectral characteristics
    if (features.spectralFlatness < 0.1) {
      result += '🎼 Harmonic content detected (likely music)\n';
    } else if (features.spectralFlatness > 0.5) {
      result += '🔊 Noise-like audio detected\n';
    }
    
    // Analyze frequency distribution
    const { low, mid, high } = features.frequencyBands;
    const total = low + mid + high;
    if (total > 0) {
      const lowPercent = (low / total) * 100;
      const midPercent = (mid / total) * 100;
      const highPercent = (high / total) * 100;
      
      if (lowPercent > 50) {
        result += '🔈 Bass-heavy audio\n';
      } else if (midPercent > 50) {
        result += '🎵 Mid-range dominant\n';
      } else if (highPercent > 50) {
        result += '🔊 High-frequency dominant\n';
      }
    }
    
    result += '\n📊 Advanced metrics available in Spectral Analysis';
    
    return result;
  };

  // Handle real-time audio data
  const handleRealTimeAudioData = useCallback((data: Float32Array) => {
    // This data can be used for real-time processing
    // For now, we'll just log it for debugging
    console.log('Real-time audio data received:', data.length, 'samples');
  }, []);

  return (
    <div className="space-y-8">
      {/* Recording Controls */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-semibold text-white mb-2">Record Audio</h2>
          <p className="text-slate-300">Use your microphone or upload an audio file</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {/* Record Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 ${
              isRecording
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30'
                : 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/30'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-6 h-6" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="w-6 h-6" />
                Start Recording
              </>
            )}
          </button>

          {/* File Upload */}
          <label className="flex items-center gap-3 px-8 py-4 rounded-full font-semibold text-lg bg-purple-500 hover:bg-purple-600 text-white cursor-pointer shadow-lg shadow-purple-500/30 transition-all duration-300">
            <Upload className="w-6 h-6" />
            Upload Audio
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-300 font-medium">Recording...</span>
            </div>
          </div>
        )}
      </div>

      {/* Real-Time Analysis (when recording) */}
      {isRecording && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <RealTimeProcessor 
            isRecording={isRecording} 
            onAudioData={handleRealTimeAudioData} 
          />
        </div>
      )}

      {/* Audio Display */}
      {audioData && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Audio Info */}
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-white mb-4">Audio Recording</h3>
              
              <div className="space-y-3 text-slate-300">
                <div className="flex items-center gap-2">
                  <FileAudio className="w-5 h-5" />
                  <span>Duration: {audioData.duration.toFixed(2)}s</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Recorded: {audioData.timestamp.toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Audio Controls */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={playAudio}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlaying ? 'Stop' : 'Play'}
                </button>
                
                <button
                  onClick={deleteAudio}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>

              {/* Analyze Button */}
              <button
                onClick={analyzeAudio}
                disabled={isAnalyzing}
                className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
              </button>

              {/* Toggle Advanced Analysis */}
              {audioFeatures && (
                <button
                  onClick={() => setShowAdvancedAnalysis(!showAdvancedAnalysis)}
                  className="mt-3 w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  {showAdvancedAnalysis ? 'Hide' : 'Show'} Advanced Analysis
                </button>
              )}
            </div>

            {/* Audio Visualizer */}
            <div className="flex-1">
              <AudioVisualizer audioUrl={audioData.url} />
            </div>
          </div>
        </div>
      )}

      {/* Advanced Analysis */}
      {showAdvancedAnalysis && audioFeatures && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <SpectralAnalyzer 
            audioFeatures={audioFeatures} 
            isAnalyzing={isAnalyzing} 
          />
        </div>
      )}

      {/* Recognition Results */}
      {recognitionResult && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">AI Recognition Results</h3>
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <pre className="text-slate-300 whitespace-pre-wrap font-medium">{recognitionResult}</pre>
          </div>
        </div>
      )}

      {/* Hidden Audio Element */}
      {audioData && (
        <audio
          ref={audioRef}
          src={audioData.url}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
}
