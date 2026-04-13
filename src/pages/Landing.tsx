import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, Moon, Sparkles, Zap, LogIn, User as UserIcon, Loader2 } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { MoodPortal } from '../components/MoodPortal';
import { useAuth } from '../lib/FirebaseProvider';
import { signInWithPopup, auth, googleProvider } from '../lib/firebase';

export const Landing: React.FC = () => {
  const { user, loading } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error('Login failed', error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-white">
      <div className="absolute top-8 right-8">
        {loading ? (
          <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse" />
        ) : user ? (
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-white/20" />
            <span className="text-sm font-medium">{user.displayName}</span>
          </div>
        ) : (
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className={`flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 transition-all ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            <span>{isLoggingIn ? 'Connecting...' : 'Connect'}</span>
          </button>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-16"
      >
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          AetherScribe
        </h1>
        <p className="text-xl md:text-2xl text-blue-200/80 font-light max-w-2xl mx-auto">
          Bridging structured narrative and the subconscious psyche through integrated intelligence.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 max-w-6xl w-full">
        <Link to={user ? "/dream-journal" : "#"} onClick={!user ? handleLogin : undefined} className="block group">
          <GlassCard glowColor="purple" className="h-full transition-transform duration-300 group-hover:scale-[1.02] border-purple-500/50">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Moon className="w-8 h-8 text-purple-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">1. Capture Your Dream</h2>
                <p className="text-purple-100/60 leading-relaxed">
                  The journey begins here. Record your subconscious experiences for deep Jungian analysis and surrealist visualization.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-auto">
              <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-300">Primary Entry</span>
              <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs text-purple-300">Subconscious</span>
            </div>
          </GlassCard>
        </Link>

        <Link to={user ? "/storybook" : "#"} onClick={!user ? handleLogin : undefined} className="block group">
          <GlassCard glowColor="blue" className="h-full transition-transform duration-300 group-hover:scale-[1.02]">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <BookOpen className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">2. Manifest as Story</h2>
                <p className="text-blue-100/60 leading-relaxed">
                  Transform your captured dreams or original ideas into structured, illustrated children's stories with consistent narrative arcs.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-auto">
              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-300">Structured</span>
              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-300">Expansion</span>
            </div>
          </GlassCard>
        </Link>
      </div>

      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-16 w-full max-w-4xl"
        >
          <MoodPortal />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="mt-16 flex items-center gap-8 text-sm text-white/40"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          <span>Gemini Bolt Latency</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <span>Jungian Analysis</span>
        </div>
      </motion.div>
    </div>
  );
};
