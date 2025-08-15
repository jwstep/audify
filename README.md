# Audify 🎵

An AI-powered audio recognition tool that takes any sound input and instantly identifies it.

## Features

- **Real-time Audio Recording**: Use your microphone to record audio directly in the browser
- **File Upload Support**: Upload existing audio files for analysis
- **Advanced Audio Analysis**: Comprehensive spectral analysis and feature extraction
- **Real-time Processing**: Live audio analysis during recording
- **Audio Visualization**: Beautiful waveform display using WaveSurfer.js
- **Spectral Analysis**: Frequency bands, dominant frequencies, and spectral characteristics
- **AI Recognition**: Instant audio identification and classification (coming in Phase 3)
- **Modern UI**: Beautiful, responsive design with Tailwind CSS

## Development Phases

### ✅ Phase 1: Core Audio Infrastructure & UI Foundation (Completed)
- [x] Set up audio recording capabilities using Web Audio API
- [x] Create basic UI components (record button, audio visualization)
- [x] Implement audio input handling and file upload support
- [x] Basic styling and responsive design

### ✅ Phase 2: Audio Processing & Analysis (Completed)
- [x] Integrate audio analysis libraries (Web Audio API, AudioContext)
- [x] Implement audio feature extraction (spectral analysis, MFCC)
- [x] Add audio visualization components (waveform, spectrogram)
- [x] Audio format support and conversion
- [x] Real-time audio processing and analysis
- [x] Advanced spectral analysis with frequency bands
- [x] Audio feature extraction (pitch, tempo, energy, spectral characteristics)

### 🔄 Phase 3: AI Integration & Recognition (Next)
- [ ] Integrate with free AI audio recognition APIs
- [ ] Implement audio classification and labeling
- [ ] Add confidence scoring and multiple recognition results
- [ ] Error handling and fallback options

### 📋 Phase 4: Enhanced Features & Polish
- [ ] Audio history and saved recordings
- [ ] Export functionality (text, audio files)
- [ ] Advanced audio filters and preprocessing
- [ ] Performance optimizations and accessibility improvements

### 📋 Phase 5: Advanced Recognition & Customization
- [ ] Custom audio model training capabilities
- [ ] Batch processing for multiple audio files
- [ ] Real-time streaming audio recognition
- [ ] User preferences and settings

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Audio Processing**: Web Audio API, WaveSurfer.js, Custom FFT Analysis
- **Audio Analysis**: Spectral analysis, feature extraction, real-time processing
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd audify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Record Audio**: Click the "Start Recording" button and allow microphone access
2. **Upload Audio**: Use the "Upload Audio" button to select an audio file
3. **Real-time Analysis**: View live audio analysis during recording
4. **Visualize**: View the audio waveform and playback controls
5. **Analyze**: Click "Analyze with AI" to get detailed audio analysis
6. **Advanced Features**: Explore spectral analysis, frequency bands, and audio characteristics

## New in Phase 2

- **Real-time Audio Processing**: Live analysis during recording with volume meters and frequency displays
- **Spectral Analysis**: Advanced frequency analysis with visual representations
- **Audio Feature Extraction**: Pitch detection, tempo estimation, energy analysis, and spectral characteristics
- **Enhanced Visualization**: Interactive frequency band displays and spectral feature indicators
- **Cross-browser Compatibility**: Support for both standard and webkit AudioContext implementations

## Browser Compatibility

- Chrome 66+
- Firefox 60+
- Safari 11.1+
- Edge 79+

## Contributing

This project follows a phased development approach. Each phase should be completed and tested before moving to the next. Please ensure all tests pass and the application is fully functional before submitting pull requests.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- WaveSurfer.js for audio visualization
- Lucide for beautiful icons
- Next.js team for the amazing framework
- Web Audio API for powerful audio processing capabilities
