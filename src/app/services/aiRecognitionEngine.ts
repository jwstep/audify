import { AudioFeatures } from './audioAnalysis';
import { SpeechAnalysisResult } from './speechRecognition';
import { ClassificationAnalysis } from './audioClassification';

export interface AIRecognitionResult {
  // Primary recognition results
  primaryRecognition: string;
  confidence: number;
  
  // Detailed analysis
  speechAnalysis?: SpeechAnalysisResult;
  audioClassification: ClassificationAnalysis;
  spectralFeatures: AudioFeatures;
  
  // Combined insights
  audioType: 'music' | 'speech' | 'mixed' | 'environmental' | 'unknown';
  detectedContent: string[];
  language?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  
  // Timestamps
  analysisTime: number;
  timestamp: Date;
}

export interface RecognitionProgress {
  stage: 'initializing' | 'speech' | 'classification' | 'spectral' | 'combining' | 'complete';
  progress: number;
  message: string;
}

export class AIRecognitionEngine {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private speechService: any; // Will be imported when needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private classificationService: any; // Will be imported when needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private audioAnalyzer: any; // Will be imported when needed
  private isInitializing: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Start initialization immediately
    this.initializeServices();
  }

  private async initializeServices() {
    if (this.isInitializing) {
      return this.initializationPromise;
    }

    this.isInitializing = true;
    this.initializationPromise = this.performInitialization();
    
    return this.initializationPromise;
  }

  private async performInitialization() {
    try {
      // Dynamic imports to avoid circular dependencies
      const { SpeechRecognitionService } = await import('./speechRecognition');
      const { AudioClassificationService } = await import('./audioClassification');
      const { AudioAnalyzer } = await import('./audioAnalysis');
      
      this.speechService = new SpeechRecognitionService();
      this.classificationService = new AudioClassificationService();
      this.audioAnalyzer = new AudioAnalyzer();
      
      console.log('AI services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI services:', error);
      // Don't throw here, let the recognition handle it gracefully
    } finally {
      this.isInitializing = false;
    }
  }

  // Main recognition method
  async recognizeAudio(
    audioBlob: Blob,
    onProgress?: (progress: RecognitionProgress) => void
  ): Promise<AIRecognitionResult> {
    const startTime = Date.now();
    
    try {
      // Update progress
      onProgress?.({
        stage: 'initializing',
        progress: 10,
        message: 'Initializing AI recognition services...'
      });

      // Wait for services to be ready with timeout
      await this.waitForServicesWithTimeout();

      // Update progress
      onProgress?.({
        stage: 'speech',
        progress: 25,
        message: 'Analyzing speech content...'
      });

      // Perform speech recognition
      let speechAnalysis: SpeechAnalysisResult | undefined;
      try {
        if (this.speechService) {
          speechAnalysis = await this.speechService.analyzeAudioFile(audioBlob);
        }
      } catch (error) {
        console.log('Speech recognition failed, continuing with other analysis:', error);
      }

      // Update progress
      onProgress?.({
        stage: 'classification',
        progress: 50,
        message: 'Classifying audio content...'
      });

      // Perform audio classification
      let audioClassification: ClassificationAnalysis;
      try {
        if (this.classificationService) {
          audioClassification = await this.classificationService.classifyAudio(audioBlob);
        } else {
          throw new Error('Classification service not available');
        }
      } catch (error) {
        console.error('Audio classification failed:', error);
        // Create fallback classification
        audioClassification = this.createFallbackClassification();
      }

      // Update progress
      onProgress?.({
        stage: 'spectral',
        progress: 75,
        message: 'Analyzing spectral features...'
      });

      // Perform spectral analysis
      let spectralFeatures: AudioFeatures;
      try {
        if (this.audioAnalyzer) {
          spectralFeatures = await this.audioAnalyzer.analyzeAudio(audioBlob);
        } else {
          throw new Error('Spectral analyzer not available');
        }
      } catch (error) {
        console.error('Spectral analysis failed:', error);
        // Create fallback features
        spectralFeatures = this.createFallbackFeatures();
      }

      // Update progress
      onProgress?.({
        stage: 'combining',
        progress: 90,
        message: 'Combining AI insights...'
      });

      // Combine all results
      const result = this.combineResults(
        speechAnalysis,
        audioClassification,
        spectralFeatures
      );

      // Update progress
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: 'AI recognition complete!'
      });

      return {
        ...result,
        analysisTime: Date.now() - startTime,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('AI recognition failed:', error);
      throw error;
    }
  }

  // Wait for services with timeout
  private async waitForServicesWithTimeout(): Promise<void> {
    const timeout = 5000; // 5 second timeout
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (this.speechService && this.classificationService && this.audioAnalyzer) {
        return;
      }
      
      // If still initializing, wait a bit more
      if (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // If not initializing and services aren't ready, try to initialize again
      if (!this.isInitializing) {
        await this.initializeServices();
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('AI services failed to initialize within 5 seconds');
  }

  // Create fallback classification when service fails
  private createFallbackClassification(): ClassificationAnalysis {
    return {
      primaryClassification: {
        label: 'Audio Content',
        confidence: 0.5,
        category: 'other',
        description: 'General audio content detected',
        tags: ['audio', 'content', 'general']
      },
      secondaryClassifications: [],
      overallConfidence: 0.5,
      detectedCategories: ['other'],
      audioType: 'mixed'
    };
  }

  // Create fallback features when spectral analysis fails
  private createFallbackFeatures(): AudioFeatures {
    return {
      spectralCentroid: 0,
      spectralRolloff: 0,
      spectralFlatness: 0,
      zeroCrossingRate: 0,
      rmsEnergy: 0,
      dominantFrequencies: [],
      frequencyBands: { low: 0, mid: 0, high: 0 },
      pitch: 0,
      tempo: 0
    };
  }

  // Combine all analysis results into a comprehensive recognition
  private combineResults(
    speechAnalysis: SpeechAnalysisResult | undefined,
    audioClassification: ClassificationAnalysis,
    spectralFeatures: AudioFeatures
  ): Omit<AIRecognitionResult, 'analysisTime' | 'timestamp'> {
    
    // Determine primary recognition
    let primaryRecognition = '';
    let confidence = 0;
    let audioType: AIRecognitionResult['audioType'] = 'unknown';
    const detectedContent: string[] = [];
    let language: string | undefined;
    let sentiment: 'positive' | 'negative' | 'neutral' | undefined;

    // Speech analysis results
    if (speechAnalysis) {
      primaryRecognition = `Speech detected: "${speechAnalysis.transcription}"`;
      confidence = speechAnalysis.confidence;
      audioType = 'speech';
      language = speechAnalysis.language;
      sentiment = speechAnalysis.sentiment;
      detectedContent.push('Human Speech', `Language: ${speechAnalysis.language}`, `Words: ${speechAnalysis.wordCount}`);
      
      if (speechAnalysis.keywords.length > 0) {
        detectedContent.push(`Keywords: ${speechAnalysis.keywords.slice(0, 5).join(', ')}`);
      }
    }

    // Audio classification results - prioritize animal sounds and specific classifications
    if (audioClassification.primaryClassification.confidence > confidence) {
      const classification = audioClassification.primaryClassification;
      
      // Special handling for animal sounds
      if (classification.category === 'animal') {
        primaryRecognition = `${classification.label}: ${classification.description}`;
        confidence = Math.max(confidence, classification.confidence);
        audioType = 'environmental'; // Animal sounds are environmental
        detectedContent.push('Animal Sound', `Species: ${classification.label}`, `Type: ${classification.description}`);
      }
      // Special handling for music
      else if (classification.category === 'music') {
        primaryRecognition = `${classification.label}: ${classification.description}`;
        confidence = Math.max(confidence, classification.confidence);
        audioType = 'music';
        detectedContent.push('Musical Content', `Genre: ${classification.label}`, `Style: ${classification.description}`);
      }
      // Special handling for speech
      else if (classification.category === 'speech') {
        primaryRecognition = `${classification.label}: ${classification.description}`;
        confidence = Math.max(confidence, classification.confidence);
        audioType = 'speech';
        detectedContent.push('Vocal Content', `Type: ${classification.label}`, `Style: ${classification.description}`);
      }
      // Default handling for other categories
      else {
        primaryRecognition = `${classification.label}: ${classification.description}`;
        confidence = Math.max(confidence, classification.confidence);
        audioType = audioClassification.audioType;
      }
    }

    // Add classification details
    detectedContent.push(
      `Category: ${audioClassification.primaryClassification.category}`,
      `Confidence: ${(audioClassification.overallConfidence * 100).toFixed(1)}%`
    );

    // Add secondary classifications
    if (audioClassification.secondaryClassifications.length > 0) {
      const secondaryLabels = audioClassification.secondaryClassifications
        .map(c => c.label)
        .join(', ');
      detectedContent.push(`Also detected: ${secondaryLabels}`);
    }

    // Spectral analysis insights
    if (spectralFeatures.pitch > 0) {
      detectedContent.push(`Pitch: ${spectralFeatures.pitch.toFixed(0)} Hz`);
    }
    
    if (spectralFeatures.tempo > 0) {
      detectedContent.push(`Tempo: ${spectralFeatures.tempo.toFixed(0)} BPM`);
    }

    // Determine if it's mixed content
    if (speechAnalysis && audioClassification.audioType !== 'speech') {
      audioType = 'mixed';
      primaryRecognition = `Mixed content: ${primaryRecognition} with background ${audioClassification.primaryClassification.label.toLowerCase()}`;
    }

    // Enhance confidence based on multiple sources
    if (speechAnalysis && audioClassification.primaryClassification.confidence > 0.7) {
      confidence = Math.min(0.95, (confidence + audioClassification.overallConfidence) / 2);
    }

    return {
      primaryRecognition,
      confidence,
      speechAnalysis,
      audioClassification,
      spectralFeatures,
      audioType,
      detectedContent,
      language,
      sentiment
    };
  }

  // Get recognition summary for display
  getRecognitionSummary(result: AIRecognitionResult): string {
    let summary = `🎵 AI Recognition Results:\n\n`;
    
    // Primary recognition
    summary += `🔍 **Primary Recognition:**\n`;
    summary += `${result.primaryRecognition}\n`;
    summary += `Confidence: ${(result.confidence * 100).toFixed(1)}%\n\n`;
    
    // Speech analysis
    if (result.speechAnalysis) {
      summary += `🎤 **Speech Analysis:**\n`;
      summary += `Transcription: "${result.speechAnalysis.transcription}"\n`;
      summary += `Language: ${result.speechAnalysis.language}\n`;
      summary += `Word Count: ${result.speechAnalysis.wordCount}\n`;
      if (result.speechAnalysis.sentiment) {
        summary += `Sentiment: ${result.speechAnalysis.sentiment}\n`;
      }
      summary += `\n`;
    }
    
    // Audio classification
    summary += `🏷️ **Audio Classification:**\n`;
    summary += `Type: ${result.audioClassification.primaryClassification.label}\n`;
    summary += `Category: ${result.audioClassification.primaryClassification.category}\n`;
    summary += `Overall Confidence: ${(result.audioClassification.overallConfidence * 100).toFixed(1)}%\n\n`;
    
    // Spectral features
    summary += `📊 **Audio Features:**\n`;
    if (result.spectralFeatures.pitch > 0) {
      summary += `Pitch: ${result.spectralFeatures.pitch.toFixed(0)} Hz\n`;
    }
    if (result.spectralFeatures.tempo > 0) {
      summary += `Tempo: ${result.spectralFeatures.tempo.toFixed(0)} BPM\n`;
    }
    summary += `Energy: ${(result.spectralFeatures.rmsEnergy * 100).toFixed(1)}%\n\n`;
    
    // Analysis info
    summary += `⏱️ Analysis completed in ${result.analysisTime}ms\n`;
    summary += `📅 ${result.timestamp.toLocaleString()}`;
    
    return summary;
  }

  // Check if AI services are available
  isAIAvailable(): boolean {
    return !!(this.speechService && this.classificationService && this.audioAnalyzer);
  }

  // Get service status
  getServiceStatus(): { speech: boolean; classification: boolean; spectral: boolean } {
    return {
      speech: !!this.speechService,
      classification: !!this.classificationService,
      spectral: !!this.audioAnalyzer
    };
  }
}
