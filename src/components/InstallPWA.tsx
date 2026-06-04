import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X } from 'lucide-react';

export function InstallPWA() {
  const [showiOSPrompt, setShowiOSPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
      return;
    }

    // Android/Chrome
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallClick = () => {
    // For Android/Chrome
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        }
        setDeferredPrompt(null);
      });
      return;
    }

    // Check if it's iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    if (isIOS && isSafari) {
      setShowiOSPrompt(true);
    } else {
      alert("To install this app, look for the 'Add to Home Screen' option in your browser menu.");
    }
  };

  if (isStandalone) return null;

  return (
    <>
      <button 
        onClick={handleInstallClick}
        className="flex items-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-full transition-colors backdrop-blur-xl"
        title="Install App"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="text-xs font-bold tracking-wide uppercase hidden sm:inline">Install App</span>
      </button>

      {/* iOS Install Prompt Modal */}
      {showiOSPrompt && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-0">
          <div className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-sm p-6 relative shadow-2xl animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:fade-in duration-300">
            <button 
              onClick={() => setShowiOSPrompt(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-white/5 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 p-0.5 rounded-2xl mb-6 shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full bg-[#111] rounded-2xl flex items-center justify-center">
                  <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">C</span>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">Install Chronos Dash</h3>
              <p className="text-slate-400 text-sm mb-8">Install this application on your home screen for quick and easy access when you're on the go.</p>
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 w-full text-left space-y-4">
                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-2 rounded-lg shrink-0 mt-0.5">
                    <Share className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-white text-sm font-semibold block mb-1">1. Tap Share</span>
                    <span className="text-slate-500 text-xs text-balance">Tap the share button in your Safari menu bar (usually at the bottom of the screen).</span>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-2 rounded-lg shrink-0 mt-0.5">
                    <PlusSquare className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-white text-sm font-semibold block mb-1">2. Add to Home Screen</span>
                    <span className="text-slate-500 text-xs text-balance">Scroll down the list of actions and tap 'Add to Home Screen'.</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowiOSPrompt(false)}
                className="w-full mt-6 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
