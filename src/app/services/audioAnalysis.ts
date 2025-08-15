export interface AudioFeatures {
  spectralCentroid: number;
  spectralRolloff: number;
  spectralFlatness: number;
  zeroCrossingRate: number;
  rmsEnergy: number;
  dominantFrequencies: number[];
  frequencyBands: {
    low: number;
    mid: number;
    high: number;
  };
  pitch: number;
  tempo: number;
}

export interface SpectralData {
  frequencies: number[];
  magnitudes: number[];
  timeDomain: number[];
}

export class AudioAnalyzer {
  private audioContext: AudioContext;
  private analyser: AnalyserNode | null = null;
  private dataArray: Float32Array | null = null;
  private frequencyData: Float32Array | null = null;

  constructor() {
    // Create AudioContext with cross-browser support
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextClass();
  }

  async analyzeAudio(audioBlob: Blob): Promise<AudioFeatures> {
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Create buffer source
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.analyser);
      
      // Get frequency data
      const bufferLength = this.analyser.frequencyBinCount;
      this.frequencyData = new Float32Array(bufferLength);
      this.dataArray = new Float32Array(bufferLength);
      
      // Analyze audio features with timeout
      const features = await Promise.race([
        this.extractFeatures(audioBuffer),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Analysis timeout')), 10000)
        )
      ]);
      
      // Cleanup
      source.disconnect();
      
      return features;
    } catch (error) {
      console.error('Audio analysis error:', error);
      throw error;
    }
  }

  private async extractFeatures(audioBuffer: AudioBuffer): Promise<AudioFeatures> {
    const channelData = audioBuffer.getChannelData(0); // Use first channel
    const sampleRate = audioBuffer.sampleRate;
    
    // Calculate RMS Energy
    const rmsEnergy = this.calculateRMSEnergy(channelData);
    
    // Calculate Zero Crossing Rate
    const zeroCrossingRate = this.calculateZeroCrossingRate(channelData);
    
    // Use Web Audio API for frequency analysis instead of custom FFT
    const frequencyData = await this.getFrequencyDataFromAnalyser(audioBuffer);
    
    // Calculate spectral features
    const spectralCentroid = this.calculateSpectralCentroid(frequencyData.frequencies, frequencyData.magnitudes);
    const spectralRolloff = this.calculateSpectralRolloff(frequencyData.frequencies, frequencyData.magnitudes);
    const spectralFlatness = this.calculateSpectralFlatness(frequencyData.magnitudes);
    
    // Calculate frequency bands
    const frequencyBands = this.calculateFrequencyBands(frequencyData.frequencies, frequencyData.magnitudes);
    
    // Find dominant frequencies
    const dominantFrequencies = this.findDominantFrequencies(frequencyData.frequencies, frequencyData.magnitudes);
    
    // Estimate pitch
    const pitch = this.estimatePitch(frequencyData.frequencies, frequencyData.magnitudes);
    
    // Estimate tempo
    const tempo = this.estimateTempo(channelData, sampleRate);
    
    return {
      spectralCentroid,
      spectralRolloff,
      spectralFlatness,
      zeroCrossingRate,
      rmsEnergy,
      dominantFrequencies,
      frequencyBands,
      pitch,
      tempo
    };
  }

  private async getFrequencyDataFromAnalyser(audioBuffer: AudioBuffer): Promise<{ frequencies: number[], magnitudes: number[] }> {
    // Use Web Audio API's built-in frequency analysis
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 2048;
    
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyser);
    
    const frequencyData = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(frequencyData);
    
    // Convert to positive values and create frequency array
    const frequencies: number[] = [];
    const magnitudes: number[] = [];
    
    for (let i = 0; i < frequencyData.length; i++) {
      const frequency = (i * this.audioContext.sampleRate) / analyser.fftSize;
      const magnitude = Math.abs(frequencyData[i]);
      
      frequencies.push(frequency);
      magnitudes.push(magnitude);
    }
    
    // Cleanup
    source.disconnect();
    analyser.disconnect();
    
    return { frequencies, magnitudes };
  }

  private calculateRMSEnergy(channelData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    return Math.sqrt(sum / channelData.length);
  }

  private calculateZeroCrossingRate(channelData: Float32Array): number {
    let crossings = 0;
    for (let i = 1; i < channelData.length; i++) {
      if ((channelData[i] >= 0 && channelData[i - 1] < 0) || 
          (channelData[i] < 0 && channelData[i - 1] >= 0)) {
        crossings++;
      }
    }
    return crossings / (channelData.length - 1);
  }

  private calculateSpectralCentroid(frequencies: number[], magnitudes: number[]): number {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < frequencies.length; i++) {
      weightedSum += frequencies[i] * magnitudes[i];
      magnitudeSum += magnitudes[i];
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateSpectralRolloff(frequencies: number[], magnitudes: number[]): number {
    const threshold = 0.85; // 85% of total energy
    let totalEnergy = 0;
    
    for (let i = 0; i < magnitudes.length; i++) {
      totalEnergy += magnitudes[i];
    }
    
    let cumulativeEnergy = 0;
    for (let i = 0; i < frequencies.length; i++) {
      cumulativeEnergy += magnitudes[i];
      if (cumulativeEnergy >= threshold * totalEnergy) {
        return frequencies[i];
      }
    }
    
    return frequencies[frequencies.length - 1];
  }

  private calculateSpectralFlatness(magnitudes: number[]): number {
    let geometricMean = 1;
    let arithmeticMean = 0;
    
    for (let i = 0; i < magnitudes.length; i++) {
      if (magnitudes[i] > 0) {
        geometricMean *= Math.pow(magnitudes[i], 1 / magnitudes.length);
      }
      arithmeticMean += magnitudes[i];
    }
    
    arithmeticMean /= magnitudes.length;
    
    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;
  }

  private calculateFrequencyBands(frequencies: number[], magnitudes: number[]): { low: number, mid: number, high: number } {
    let lowEnergy = 0;
    let midEnergy = 0;
    let highEnergy = 0;
    
    for (let i = 0; i < frequencies.length; i++) {
      if (frequencies[i] < 250) {
        lowEnergy += magnitudes[i];
      } else if (frequencies[i] < 4000) {
        midEnergy += magnitudes[i];
      } else {
        highEnergy += magnitudes[i];
      }
    }
    
    return { low: lowEnergy, mid: midEnergy, high: highEnergy };
  }

  private findDominantFrequencies(frequencies: number[], magnitudes: number[]): number[] {
    const sortedIndices = magnitudes
      .map((magnitude, index) => ({ magnitude, index }))
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, 5)
      .map(item => frequencies[item.index]);
    
    return sortedIndices;
  }

  private estimatePitch(frequencies: number[], magnitudes: number[]): number {
    // Simple pitch estimation based on dominant frequency
    let maxMagnitude = 0;
    let dominantFreq = 0;
    
    for (let i = 0; i < magnitudes.length; i++) {
      if (magnitudes[i] > maxMagnitude && frequencies[i] > 80 && frequencies[i] < 800) {
        maxMagnitude = magnitudes[i];
        dominantFreq = frequencies[i];
      }
    }
    
    return dominantFreq;
  }

  private estimateTempo(channelData: Float32Array, sampleRate: number): number {
    // Simple tempo estimation based on zero crossings
    const zeroCrossingRate = this.calculateZeroCrossingRate(channelData);
    const estimatedTempo = zeroCrossingRate * sampleRate * 60 / (2 * Math.PI);
    
    // Clamp to reasonable tempo range (60-200 BPM)
    return Math.max(60, Math.min(200, estimatedTempo));
  }

  getSpectralData(): SpectralData | null {
    if (!this.analyser || !this.frequencyData || !this.dataArray) {
      return null;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.analyser.getFloatFrequencyData(this.frequencyData as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.analyser.getFloatTimeDomainData(this.dataArray as any);
    
    const frequencies = Array.from({ length: this.frequencyData.length }, (_, i) => 
      (i * this.audioContext.sampleRate) / (this.analyser!.fftSize)
    );
    
    return {
      frequencies,
      magnitudes: Array.from(this.frequencyData),
      timeDomain: Array.from(this.dataArray)
    };
  }

  dispose() {
    if (this.analyser) {
      this.analyser.disconnect();
    }
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
