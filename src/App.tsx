import { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { User } from './types';
import { LogIn, Loader2, Sparkles } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkSession();

    // Listen for OAuth success from popup
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        checkSession();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch(e) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const loginWithAuthentik = async () => {
    try {
      setError('');
      const res = await fetch('/api/auth/url');
      if (!res.ok) throw new Error('Could not fetch Auth endpoint');
      const { url } = await res.json();

      const authWindow = window.open(url, 'oauth_popup', 'width=500,height=600');
      if (!authWindow) {
        setError('Popup blocked! Please allow popups.');
      }
    } catch(err: any) {
      setError(err.message || 'Error occurred');
    }
  };

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (user) {
    return <Dashboard user={user} onLogout={logout} />;
  }

  return (
    <div className="h-full flex relative items-center justify-center p-4 bg-[#050505] text-slate-200">
      <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl max-w-sm w-full p-8 text-center space-y-8 relative overflow-hidden shadow-2xl shadow-black">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-[50px] pointer-events-none" />
        {/* Top gradient line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
        
        <div className="space-y-4 relative z-10">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-6">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-light tracking-tight text-white">Chronos <span className="font-bold text-indigo-400">Dash</span></h1>
          <p className="text-slate-500 text-sm">Sign in to access your dashboard and manage your shifts securely.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-400 border border-red-500/20 text-sm rounded-lg p-3 relative z-10">
             {error}
          </div>
        )}

        <button 
          onClick={loginWithAuthentik}
          className="w-full relative overflow-hidden rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold py-4 px-4 flex items-center justify-center gap-2 transition-all z-10"
        >
          <LogIn className="w-5 h-5" />
          Sign in with Authentik
        </button>
      </div>
    </div>
  );
}

