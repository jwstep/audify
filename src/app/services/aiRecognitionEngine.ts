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

  constructor() {
    // Lazy load services to avoid circular dependencies
    this.initializeServices();
  }

  private async initializeServices() {
    try {
      // Dynamic imports to avoid circular dependencies
      const { SpeechRecognitionService } = await import('./speechRecognition');
      const { AudioClassificationService } = await import('./audioClassification');
      const { AudioAnalyzer } = await import('./audioAnalysis');
      
      this.speechService = new SpeechRecognitionService();
      this.classificationService = new AudioClassificationService();
      this.audioAnalyzer = new AudioAnalyzer();
    } catch (error) {
      console.error('Failed to initialize AI services:', error);
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

      // Wait for services to be ready
      await this.waitForServices();

      // Update progress
      onProgress?.({
        stage: 'speech',
        progress: 25,
        message: 'Analyzing speech content...'
      });

      // Perform speech recognition
      let speechAnalysis: SpeechAnalysisResult | undefined;
      try {
        speechAnalysis = await this.speechService.analyzeAudioFile(audioBlob);
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
      const audioClassification = await this.classificationService.classifyAudio(audioBlob);

      // Update progress
      onProgress?.({
        stage: 'spectral',
        progress: 75,
        message: 'Analyzing spectral features...'
      });

      // Perform spectral analysis
      const spectralFeatures = await this.audioAnalyzer.analyzeAudio(audioBlob);

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

  // Wait for all services to be initialized
  private async waitForServices(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      if (this.speechService && this.classificationService && this.audioAnalyzer) {
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    throw new Error('Failed to initialize AI services');
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

    // Audio classification results
    if (audioClassification.primaryClassification.confidence > confidence) {
      primaryRecognition = `${audioClassification.primaryClassification.label}: ${audioClassification.primaryClassification.description}`;
      confidence = audioClassification.primaryClassification.confidence;
      audioType = audioClassification.audioType;
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
