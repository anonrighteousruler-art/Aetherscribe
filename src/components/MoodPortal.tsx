import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Flame, Mountain, Wind, Waves, CircleDashed, Sun, Moon, Shield, 
  TreeDeciduous, Snowflake, Zap, Sparkles, Heart
} from 'lucide-react';
import { GlassCard } from './GlassCard';
import { db, setDoc, doc, Timestamp, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/FirebaseProvider';

export const MoodPortal: React.FC = () => {
  const { user } = useAuth();
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const MOODS = [
    { id: 'fire', label: 'Mad', element: 'Fire', icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    { id: 'earth', label: 'Solid', element: 'Earth', icon: Mountain, color: 'text-amber-700', bg: 'bg-amber-700/10', border: 'border-amber-700/30' },
    { id: 'air', label: 'Thinking', element: 'Air', icon: Wind, color: 'text-sky-300', bg: 'bg-sky-300/10', border: 'border-sky-300/30' },
    { id: 'water', label: 'Emotional', element: 'Water', icon: Waves, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
    { id: 'void', label: 'Lost', element: 'Void', icon: CircleDashed, color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/30' },
    { id: 'light', label: 'Inspired', element: 'Light', icon: Sun, color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
    { id: 'shadow', label: 'Fearful', element: 'Shadow', icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-600/10', border: 'border-indigo-600/30' },
    { id: 'metal', label: 'Focused', element: 'Metal', icon: Shield, color: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/30' },
    { id: 'wood', label: 'Growth', element: 'Wood', icon: TreeDeciduous, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
    { id: 'ice', label: 'Calm', element: 'Ice', icon: Snowflake, color: 'text-cyan-200', bg: 'bg-cyan-200/10', border: 'border-cyan-200/30' },
    { id: 'storm', label: 'Chaotic', element: 'Storm', icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
    { id: 'ether', label: 'Spiritual', element: 'Ether', icon: Sparkles, color: 'text-fuchsia-400', bg: 'bg-fuchsia-400/10', border: 'border-fuchsia-400/30' },
  ];

  const handleMoodCheckIn = async (mood: typeof MOODS[0]) => {
    if (!user || saving) return;
    setSaving(true);
    const moodId = `mood_${Date.now()}`;
    const path = `users/${user.uid}/moods/${moodId}`;
    try {
      await setDoc(doc(db, path), {
        id: moodId,
        authorUid: user.uid,
        mood: mood.label,
        element: mood.element,
        createdAt: Timestamp.now()
      });
      setLastCheckIn(mood.label);
      setTimeout(() => setLastCheckIn(null), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard>
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold flex items-center gap-2">
              <Heart className="text-pink-500" />
              Emotional Frequency
            </h3>
            <p className="text-sm text-white/40">Check-in with your current resonance</p>
          </div>
          {lastCheckIn && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-emerald-400 text-sm font-bold uppercase tracking-widest"
            >
              Resonance Logged: {lastCheckIn}
            </motion.div>
          )}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {MOODS.map((mood) => (
            <button
              key={mood.id}
              onClick={() => handleMoodCheckIn(mood)}
              disabled={saving}
              className={`group relative flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-500 ${mood.bg} ${mood.border} hover:scale-105 active:scale-95`}
            >
              <div className={`mb-2 transition-transform duration-500 group-hover:scale-110 ${mood.color}`}>
                <mood.icon className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tighter text-white/60">{mood.element}</span>
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-white/5" />
            </button>
          ))}
        </div>
      </div>
    </GlassCard>
  );
};
