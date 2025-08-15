// Type declarations for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultItem {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  language?: string;
  isFinal: boolean;
  timestamp: Date;
}

export interface SpeechAnalysisResult {
  transcription: string;
  confidence: number;
  language: string;
  wordCount: number;
  duration: number;
  keywords: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private isSupported: boolean;
  private isListening: boolean = false;
  private onResultCallback?: (result: SpeechRecognitionResult) => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    // Check browser support
    this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    
    if (this.isSupported) {
      this.initializeRecognition();
    }
  }

  private initializeRecognition() {
    // Use the appropriate SpeechRecognition constructor
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    this.recognition = new SpeechRecognition();
    
    // Configure recognition settings
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    
    // Set up event handlers
    this.recognition.onstart = () => {
      this.isListening = true;
      console.log('Speech recognition started');
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      if (this.onResultCallback) {
        this.onResultCallback({
          text: transcript,
          confidence,
          isFinal,
          timestamp: new Date()
        });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      
      if (this.onErrorCallback) {
        this.onErrorCallback(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      console.log('Speech recognition ended');
    };
  }

  // Start real-time speech recognition
  startRecognition(
    onResult: (result: SpeechRecognitionResult) => void,
    onError: (error: string) => void
  ): boolean {
    if (!this.isSupported || !this.recognition) {
      onError('Speech recognition not supported in this browser');
      return false;
    }

    if (this.isListening) {
      onError('Speech recognition already active');
      return false;
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError;

    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      onError('Failed to start speech recognition');
      return false;
    }
  }

  // Stop speech recognition
  stopRecognition(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  // Analyze audio file for speech content
  async analyzeAudioFile(audioBlob: Blob): Promise<SpeechAnalysisResult> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      // Create audio element to get duration
      const audio = new Audio(URL.createObjectURL(audioBlob));
      let duration = 0;
      
      audio.onloadedmetadata = () => {
        duration = audio.duration;
      };

      // Start recognition
      const results: SpeechRecognitionResult[] = [];
      let finalText = '';
      let totalConfidence = 0;
      let resultCount = 0;

      const onResult = (result: SpeechRecognitionResult) => {
        results.push(result);
        
        if (result.isFinal) {
          finalText = result.text;
          totalConfidence += result.confidence;
          resultCount++;
        }
      };

      const onError = (error: string) => {
        reject(new Error(`Speech recognition failed: ${error}`));
      };

      // Start recognition
      if (!this.startRecognition(onResult, onError)) {
        reject(new Error('Failed to start speech recognition'));
        return;
      }

      // Stop after a reasonable time or when we have results
      setTimeout(() => {
        this.stopRecognition();
        
        if (results.length === 0) {
          reject(new Error('No speech detected in audio'));
          return;
        }

        // Calculate average confidence
        const avgConfidence = resultCount > 0 ? totalConfidence / resultCount : 0;
        
        // Detect language (basic detection based on common patterns)
        const language = this.detectLanguage(finalText);
        
        // Extract keywords
        const keywords = this.extractKeywords(finalText);
        
        // Basic sentiment analysis
        const sentiment = this.analyzeSentiment(finalText);

        resolve({
          transcription: finalText,
          confidence: avgConfidence,
          language,
          wordCount: finalText.split(' ').length,
          duration,
          keywords,
          sentiment
        });
      }, Math.min(duration * 1000 + 2000, 30000)); // Max 30 seconds
    });
  }

  // Basic language detection
  private detectLanguage(text: string): string {
    // Simple pattern matching for common languages
    if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/.test(text)) {
      return 'Spanish/French/Portuguese';
    }
    if (/[äöüß]/.test(text)) {
      return 'German';
    }
    if (/[а-яё]/.test(text)) {
      return 'Russian';
    }
    if (/[一-龯]/.test(text)) {
      return 'Chinese/Japanese';
    }
    if (/[가-힣]/.test(text)) {
      return 'Korean';
    }
    if (/[ก-ฮ]/.test(text)) {
      return 'Thai';
    }
    
    // Default to English
    return 'English';
  }

  // Extract meaningful keywords
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter(word => word.length > 3); // Filter out short words
    
    // Remove common stop words
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'
    ]);
    
    const keywords = words.filter(word => !stopWords.has(word));
    
    // Return top 10 keywords
    return keywords.slice(0, 10);
  }

  // Basic sentiment analysis
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const lowerText = text.toLowerCase();
    
    const positiveWords = [
      'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome',
      'love', 'like', 'enjoy', 'happy', 'joy', 'pleasure', 'beautiful', 'perfect'
    ];
    
    const negativeWords = [
      'bad', 'terrible', 'awful', 'horrible', 'dislike', 'hate', 'angry', 'sad',
      'disappointed', 'frustrated', 'annoying', 'boring', 'difficult', 'problem'
    ];
    
    let positiveScore = 0;
    let negativeScore = 0;
    
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) positiveScore += matches.length;
    });
    
    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      const matches = lowerText.match(regex);
      if (matches) negativeScore += matches.length;
    });
    
    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  // Check if speech recognition is supported
  isSpeechRecognitionSupported(): boolean {
    return this.isSupported;
  }

  // Get current listening status
  getListeningStatus(): boolean {
    return this.isListening;
  }

  // Cleanup
  dispose(): void {
    if (this.recognition) {
      this.recognition.stop();
      this.recognition = null;
    }
  }
}
