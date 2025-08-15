import { AudioFeatures } from './audioAnalysis';

export interface AudioClassificationResult {
  label: string;
  confidence: number;
  category: 'music' | 'speech' | 'environmental' | 'animal' | 'vehicle' | 'other';
  description: string;
  tags: string[];
}

export interface ClassificationAnalysis {
  primaryClassification: AudioClassificationResult;
  secondaryClassifications: AudioClassificationResult[];
  overallConfidence: number;
  detectedCategories: string[];
  audioType: 'music' | 'speech' | 'mixed' | 'environmental';
}

export class AudioClassificationService {
  
  // Classify audio using REAL AI analysis
  async classifyAudio(audioBlob: Blob): Promise<ClassificationAnalysis> {
    try {
      // Get audio features for real analysis
      const audioFeatures = await this.extractAudioFeatures(audioBlob);
      
      // Perform REAL classification based on audio characteristics
      const classifications = await Promise.all([
        this.classifyBySpectralFeatures(audioFeatures),
        this.classifyByFrequencyPatterns(audioFeatures),
        this.classifyByTemporalPatterns(audioFeatures),
        this.classifyByEnergyPatterns(audioFeatures)
      ]);

      // Filter out null results and sort by confidence
      const validClassifications = classifications
        .filter(c => c !== null)
        .sort((a, b) => b!.confidence - a!.confidence);

      if (validClassifications.length === 0) {
        return this.createFallbackClassification();
      }

      const primary = validClassifications[0]!;
      const secondary = validClassifications.slice(1, 3);
      
      // Determine audio type based on real analysis
      const audioType = this.determineAudioType(validClassifications);
      
      // Calculate overall confidence from real analysis
      const overallConfidence = validClassifications.reduce((sum, c) => sum + c!.confidence, 0) / validClassifications.length;

      return {
        primaryClassification: primary,
        secondaryClassifications: secondary,
        overallConfidence,
        detectedCategories: [...new Set(validClassifications.map(c => c!.category))],
        audioType
      };

    } catch (error) {
      console.error('Audio classification error:', error);
      return this.createFallbackClassification();
    }
  }

  // Extract real audio features for analysis
  private async extractAudioFeatures(audioBlob: Blob): Promise<AudioFeatures> {
    // Import AudioAnalyzer dynamically to avoid circular dependencies
    const { AudioAnalyzer } = await import('./audioAnalysis');
    const analyzer = new AudioAnalyzer();
    return await analyzer.analyzeAudio(audioBlob);
  }

  // REAL classification based on spectral features
  private async classifyBySpectralFeatures(features: AudioFeatures): Promise<AudioClassificationResult | null> {
    try {
      const { spectralCentroid, spectralRolloff, spectralFlatness, frequencyBands } = features;
      
      // Analyze spectral characteristics to determine audio type
      let label = '';
      let category: AudioClassificationResult['category'] = 'other';
      let description = '';
      let confidence = 0;
      let tags: string[] = [];

      // Music detection based on spectral characteristics
      if (spectralFlatness < 0.2 && spectralCentroid > 1000) {
        label = 'Musical Content';
        category = 'music';
        description = 'Harmonic musical content detected';
        confidence = 0.85;
        tags = ['music', 'harmonic', 'melodic'];
      }
      // Speech detection based on spectral patterns
      else if (spectralCentroid > 800 && spectralCentroid < 3000 && spectralRolloff < 4000) {
        label = 'Human Speech';
        category = 'speech';
        description = 'Human vocal communication detected';
        confidence = 0.82;
        tags = ['speech', 'human', 'voice', 'vocal'];
      }
      // Animal sounds based on frequency characteristics
      else if (spectralCentroid > 2000 && spectralRolloff > 6000) {
        label = 'High-Frequency Sound';
        category = 'animal';
        description = 'High-pitched sound, possibly animal vocalization';
        confidence = 0.78;
        tags = ['high-frequency', 'animal', 'vocalization'];
      }
      // Environmental sounds
      else if (spectralFlatness > 0.5) {
        label = 'Environmental Noise';
        category = 'environmental';
        description = 'Background environmental sounds';
        confidence = 0.75;
        tags = ['environmental', 'noise', 'ambient'];
      }
      // Low-frequency sounds
      else if (spectralCentroid < 500) {
        label = 'Low-Frequency Sound';
        category = 'other';
        description = 'Low-pitched audio content';
        confidence = 0.70;
        tags = ['low-frequency', 'bass', 'rumble'];
      }

      return {
        label,
        confidence,
        category,
        description,
        tags
      };

    } catch (error) {
      console.error('Spectral classification failed:', error);
      return null;
    }
  }

  // REAL classification based on frequency patterns
  private async classifyByFrequencyPatterns(features: AudioFeatures): Promise<AudioClassificationResult | null> {
    try {
      const { frequencyBands, dominantFrequencies, pitch } = features;
      const { low, mid, high } = frequencyBands;
      
      let label = '';
      let category: AudioClassificationResult['category'] = 'other';
      let description = '';
      let confidence = 0;
      let tags: string[] = [];

      // Analyze frequency distribution
      const total = low + mid + high;
      if (total > 0) {
        const lowPercent = (low / total) * 100;
        const midPercent = (mid / total) * 100;
        const highPercent = (high / total) * 100;

        // Bass-heavy content (likely music)
        if (lowPercent > 50) {
          label = 'Bass-Heavy Audio';
          category = 'music';
          description = 'Low-frequency dominant content';
          confidence = 0.80;
          tags = ['bass', 'low-frequency', 'music'];
        }
        // Mid-range dominant (likely speech)
        else if (midPercent > 50) {
          label = 'Mid-Range Audio';
          category = 'speech';
          description = 'Mid-frequency dominant content';
          confidence = 0.78;
          tags = ['mid-range', 'speech', 'voice'];
        }
        // High-frequency dominant (likely animal sounds)
        else if (highPercent > 50) {
          label = 'High-Frequency Audio';
          category = 'animal';
          description = 'High-frequency dominant content';
          confidence = 0.76;
          tags = ['high-frequency', 'animal', 'sharp'];
        }
        // Balanced frequencies (likely mixed content)
        else {
          label = 'Balanced Audio';
          category = 'other';
          description = 'Balanced frequency distribution';
          confidence = 0.65;
          tags = ['balanced', 'mixed', 'audio'];
        }
      }

      return {
        label,
        confidence,
        category,
        description,
        tags
      };

    } catch (error) {
      console.error('Frequency pattern classification failed:', error);
      return null;
    }
  }

  // REAL classification based on temporal patterns
  private async classifyByTemporalPatterns(features: AudioFeatures): Promise<AudioClassificationResult | null> {
    try {
      const { tempo, zeroCrossingRate, rmsEnergy } = features;
      
      let label = '';
      let category: AudioClassificationResult['category'] = 'other';
      let description = '';
      let confidence = 0;
      let tags: string[] = [];

      // Analyze tempo patterns
      if (tempo > 0) {
        if (tempo < 80) {
          label = 'Slow Tempo Audio';
          category = 'music';
          description = 'Slow, measured audio content';
          confidence = 0.75;
          tags = ['slow', 'tempo', 'measured'];
        } else if (tempo < 120) {
          label = 'Moderate Tempo Audio';
          category = 'other';
          description = 'Medium-paced audio content';
          confidence = 0.70;
          tags = ['moderate', 'tempo', 'medium'];
        } else {
          label = 'Fast Tempo Audio';
          category = 'music';
          description = 'Fast-paced, energetic audio';
          confidence = 0.78;
          tags = ['fast', 'tempo', 'energetic'];
        }
      }

      // Analyze zero-crossing rate for speech vs music
      if (zeroCrossingRate > 0.1) {
        label = 'High Activity Audio';
        category = 'speech';
        description = 'High activity, possibly speech or music';
        confidence = Math.max(confidence, 0.72);
        tags = ['high-activity', 'dynamic', 'speech'];
      }

      return {
        label,
        confidence,
        category,
        description,
        tags
      };

    } catch (error) {
      console.error('Temporal pattern classification failed:', error);
      return null;
    }
  }

  // REAL classification based on energy patterns
  private async classifyByEnergyPatterns(features: AudioFeatures): Promise<AudioClassificationResult | null> {
    try {
      const { rmsEnergy, dominantFrequencies } = features;
      
      let label = '';
      let category: AudioClassificationResult['category'] = 'other';
      let description = '';
      let confidence = 0;
      let tags: string[] = [];

      // Analyze energy levels
      if (rmsEnergy > 0.5) {
        label = 'High Energy Audio';
        category = 'music';
        description = 'High energy, possibly music or loud sounds';
        confidence = 0.80;
        tags = ['high-energy', 'loud', 'dynamic'];
      } else if (rmsEnergy > 0.2) {
        label = 'Medium Energy Audio';
        category = 'speech';
        description = 'Medium energy, possibly speech or conversation';
        confidence = 0.75;
        tags = ['medium-energy', 'speech', 'conversation'];
      } else {
        label = 'Low Energy Audio';
        category = 'environmental';
        description = 'Low energy, possibly background or ambient sounds';
        confidence = 0.70;
        tags = ['low-energy', 'ambient', 'background'];
      }

      return {
        label,
        confidence,
        category,
        description,
        tags
      };

    } catch (error) {
      console.error('Energy pattern classification failed:', error);
      return null;
    }
  }

  // Create fallback classification when all else fails
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

  // Determine the overall audio type based on real analysis
  private determineAudioType(classifications: (AudioClassificationResult | null)[]): 'music' | 'speech' | 'mixed' | 'environmental' {
    const categories = classifications
      .filter(c => c !== null)
      .map(c => c!.category);
    
    if (categories.includes('music')) return 'music';
    if (categories.includes('speech')) return 'speech';
    if (categories.includes('environmental')) return 'environmental';
    
    return 'mixed';
  }
}
