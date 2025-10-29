import React from 'react';
import { BannerGenerator } from './components/BannerGenerator';
import { SparklesIcon } from './components/Icon';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-3 bg-indigo-500/10 text-indigo-400 py-2 px-4 rounded-full mb-4">
            <SparklesIcon className="w-5 h-5" />
            <span className="font-medium">Imagen 4 & Gemini Pro</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
            AI Creative Suite
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
            Generate, research, and edit like a pro. Your complete toolkit for creating stunning, high-impact banners.
          </p>
        </header>
        
        <main>
          <BannerGenerator />
        </main>

        <footer className="text-center mt-12 text-gray-500">
            <p>&copy; {new Date().getFullYear()} AI Creative Suite. Powered by Google AI.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
