'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Upload, Play, Square, Trash2, FileAudio, BarChart3, Brain, Sparkles } from 'lucide-react';
import AudioVisualizer from './AudioVisualizer';
import SpectralAnalyzer from './SpectralAnalyzer';
import RealTimeProcessor from './RealTimeProcessor';
import { AudioAnalyzer, AudioFeatures } from '../services/audioAnalysis';
import { AIRecognitionEngine, AIRecognitionResult, RecognitionProgress } from '../services/aiRecognitionEngine';

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
  const [aiRecognitionResult, setAiRecognitionResult] = useState<AIRecognitionResult | null>(null);
  const [recognitionProgress, setRecognitionProgress] = useState<RecognitionProgress | null>(null);
  const [aiStatus, setAiStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const aiEngineRef = useRef<AIRecognitionEngine | null>(null);

  // Initialize AI engine
  const getAIEngine = useCallback(() => {
    if (!aiEngineRef.current) {
      aiEngineRef.current = new AIRecognitionEngine();
    }
    return aiEngineRef.current;
  }, []);

  // Check AI availability
  const checkAIAvailability = useCallback(async () => {
    const aiEngine = getAIEngine();
    
    // Wait a bit for services to initialize
    let attempts = 0;
    const maxAttempts = 20; // 2 seconds total
    
    while (attempts < maxAttempts) {
      if (aiEngine.isAIAvailable()) {
        setAiStatus('ready');
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    setAiStatus('error');
    return false;
  }, [getAIEngine]);

  // Check AI status on mount
  useEffect(() => {
    const checkStatus = async () => {
      await checkAIAvailability();
    };
    checkStatus();
  }, [checkAIAvailability]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && audioChunksRef.current) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (audioChunksRef.current) {
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
        }
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
      setAiRecognitionResult(null);
      setRecognitionProgress(null);
    }
  }, [audioData]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file (MP3, WAV, etc.)');
      return;
    }
    
    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('File size too large. Please select a file smaller than 50MB.');
      return;
    }

    try {
      const audioUrl = URL.createObjectURL(file);
      const audio = new Audio(audioUrl);
      
      audio.onloadedmetadata = () => {
        setAudioData({
          blob: file,
          url: audioUrl,
          duration: audio.duration,
          timestamp: new Date()
        });
        // Clear the file input
        event.target.value = '';
      };
      
      audio.onerror = () => {
        alert('Failed to load audio file. Please try a different file.');
        URL.revokeObjectURL(audioUrl);
      };
      
    } catch (error) {
      console.error('Error processing audio file:', error);
      alert('Error processing audio file. Please try again.');
    }
  }, []);

  // Analyze audio with AI recognition
  const analyzeAudio = useCallback(async () => {
    if (!audioData) return;
    
    setIsAnalyzing(true);
    setRecognitionResult('');
    setAudioFeatures(null);
    setAiRecognitionResult(null);
    setRecognitionProgress(null);
    
    try {
      // Get AI engine
      const aiEngine = getAIEngine();
      
      // Check if AI is available with better error handling
      const isAvailable = await checkAIAvailability();
      if (!isAvailable) {
        throw new Error('AI services are taking longer than expected to initialize. Please try again in a few seconds.');
      }
      
      // Perform AI recognition with progress tracking
      const result = await aiEngine.recognizeAudio(audioData.blob, (progress) => {
        setRecognitionProgress(progress);
      });
      
      // Set AI recognition result
      setAiRecognitionResult(result);
      
      // Generate enhanced recognition result
      const summary = aiEngine.getRecognitionSummary(result);
      setRecognitionResult(summary);
      
      // Also get spectral features for backward compatibility
      if (!audioAnalyzerRef.current) {
        audioAnalyzerRef.current = new AudioAnalyzer();
      }
      const features = await audioAnalyzerRef.current.analyzeAudio(audioData.blob);
      setAudioFeatures(features);
      
      setShowAdvancedAnalysis(true);
      
    } catch (error) {
      console.error('AI recognition error:', error);
      let errorMessage = '❌ AI recognition failed. ';
      
      if (error instanceof Error) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again.';
      }
      
      setRecognitionResult(errorMessage);
      
      // Fallback to basic analysis
      try {
        if (!audioAnalyzerRef.current) {
          audioAnalyzerRef.current = new AudioAnalyzer();
        }
        const features = await audioAnalyzerRef.current.analyzeAudio(audioData.blob);
        setAudioFeatures(features);
        setShowAdvancedAnalysis(true);
      } catch (fallbackError) {
        console.error('Fallback analysis also failed:', fallbackError);
      }
    } finally {
      setIsAnalyzing(false);
      setRecognitionProgress(null);
    }
  }, [audioData, getAIEngine, checkAIAvailability]);

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
          
          {/* AI Status Indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <Brain className="w-5 h-5" />
            <span className="text-sm">
              AI Status: 
              {aiStatus === 'initializing' && (
                <span className="text-yellow-400 ml-1">Initializing...</span>
              )}
              {aiStatus === 'ready' && (
                <span className="text-green-400 ml-1">Ready</span>
              )}
              {aiStatus === 'error' && (
                <span className="text-red-400 ml-1">Error</span>
              )}
            </span>
          </div>
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

              {/* AI Recognition Button */}
              <button
                onClick={analyzeAudio}
                disabled={isAnalyzing}
                className="mt-4 w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <Brain className="w-4 h-4" />
                    AI Recognition...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Analyze with AI
                  </div>
                )}
              </button>

              {/* Recognition Progress */}
              {recognitionProgress && (
                <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-white">{recognitionProgress.message}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${recognitionProgress.progress}%` }}
                    />
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-xs text-slate-400">{recognitionProgress.progress}%</span>
                  </div>
                </div>
              )}

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

      {/* AI Recognition Results */}
      {aiRecognitionResult && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <div className="flex items-center gap-3 mb-6">
            <Brain className="w-8 h-8 text-purple-400" />
            <h3 className="text-2xl font-semibold text-white">AI Recognition Results</h3>
            <div className="ml-auto px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full">
              <span className="text-green-400 text-sm font-medium">
                {(aiRecognitionResult.confidence * 100).toFixed(1)}% Confidence
              </span>
            </div>
          </div>
          
          <div className="bg-white/5 rounded-lg p-6 border border-white/10">
            <pre className="text-slate-300 whitespace-pre-wrap font-medium text-sm leading-relaxed">
              {recognitionResult}
            </pre>
          </div>
          
          {/* AI Insights */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h4 className="text-lg font-medium text-white mb-3">🎯 Audio Type</h4>
              <p className="text-slate-300 capitalize">{aiRecognitionResult.audioType}</p>
            </div>
            
            {aiRecognitionResult.language && (
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-lg font-medium text-white mb-3">🌍 Language</h4>
                <p className="text-slate-300">{aiRecognitionResult.language}</p>
              </div>
            )}
            
            {aiRecognitionResult.sentiment && (
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <h4 className="text-lg font-medium text-white mb-3">😊 Sentiment</h4>
                <p className="text-slate-300 capitalize">{aiRecognitionResult.sentiment}</p>
              </div>
            )}
            
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <h4 className="text-lg font-medium text-white mb-3">⏱️ Analysis Time</h4>
              <p className="text-slate-300">{aiRecognitionResult.analysisTime}ms</p>
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

      {/* Legacy Recognition Results (fallback) */}
      {recognitionResult && !aiRecognitionResult && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h3 className="text-xl font-semibold text-white mb-4">Recognition Results</h3>
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
