import AudioRecorder from './components/AudioRecorder';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Audify
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            AI-powered audio recognition tool that takes any sound input and instantly identifies it
          </p>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto">
          <AudioRecorder />
        </main>

        {/* Footer */}
        <footer className="text-center mt-16 text-slate-400">
          <p>Powered by AI • Built with Next.js</p>
        </footer>
      </div>
    </div>
  );
}
