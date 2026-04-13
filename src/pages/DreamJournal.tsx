import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Sparkles, Loader2, Brain, Eye, Share2, Trash2, 
  ChevronRight, Play, Info, Save, BookOpen, Users, MessageSquare, 
  Presentation, Search, UserPlus, UserMinus, Headphones, RefreshCw, Zap
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { MoodPortal } from '../components/MoodPortal';
import { 
  analyzeDream, 
  generateDreamImage, 
  DreamAnalysis,
  generatePodcast,
  generateDebate,
  generateRoundTable,
  generateSlides,
  generateDeepResearch,
  PodcastScript,
  DebateScript,
  RoundTableScript,
  SlideContent,
  DeepResearchReport
} from '../lib/gemini';
import { db, setDoc, doc, Timestamp, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/FirebaseProvider';
import { compressImage } from '../lib/imageUtils';

type JournalState = 'idle' | 'recording' | 'analyzing' | 'result' | 'expanding';

export const DreamJournal: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<JournalState>('idle');
  const [transcript, setTranscript] = useState('');
  const [analysis, setAnalysis] = useState<DreamAnalysis | null>(null);
  const [dreamImage, setDreamImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [synthesisType, setSynthesisType] = useState<'podcast' | 'debate' | 'roundtable' | 'slides' | 'research' | null>(null);
  const [synthesisResult, setSynthesisResult] = useState<any>(null);
  const [podcastConfig, setPodcastConfig] = useState({ hostCount: 2, includeUser: false });
  const [synthesisLoading, setSynthesisLoading] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const lastProcessedIndex = useRef<number>(-1);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    lastProcessedIndex.current = -1;

    recognition.onresult = (event: any) => {
      let newFinalText = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal && i > lastProcessedIndex.current) {
          newFinalText += event.results[i][0].transcript + ' ';
          lastProcessedIndex.current = i;
        }
      }
      if (newFinalText) {
        setTranscript(prev => prev + newFinalText);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error !== 'no-speech') {
        setState('idle');
      }
    };

    recognition.onend = () => {
      if (state === 'recording') {
        // If it ended but we are still in recording state, it might have timed out
        // We don't auto-restart to avoid loops, but we update state
        setState('idle');
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setState('recording');
    } catch (e) {
      console.error('Failed to start recognition', e);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setState('idle');
  };

  const toggleRecording = () => {
    if (state === 'recording') {
      stopRecording();
    } else {
      setTranscript('');
      startRecording();
    }
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setState('analyzing');
    setLoading(true);
    try {
      const result = await analyzeDream(transcript);
      setAnalysis(result);
      const imageUrl = await generateDreamImage(result.surrealistPrompt);
      setDreamImage(imageUrl);
      setState('result');
    } catch (error) {
      console.error(error);
      setState('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleSynthesis = async (type: 'podcast' | 'debate' | 'roundtable' | 'slides' | 'research') => {
    if (!analysis) return;
    setSynthesisType(type);
    setSynthesisLoading(true);
    setSynthesisResult(null);
    try {
      let result;
      switch (type) {
        case 'podcast':
          result = await generatePodcast(analysis, podcastConfig.hostCount, podcastConfig.includeUser);
          break;
        case 'debate':
          result = await generateDebate(analysis);
          break;
        case 'roundtable':
          result = await generateRoundTable(analysis);
          break;
        case 'slides':
          result = await generateSlides(analysis);
          break;
        case 'research':
          result = await generateDeepResearch(analysis);
          break;
      }
      setSynthesisResult(result);
    } catch (error) {
      console.error(error);
    } finally {
      setSynthesisLoading(false);
    }
  };

  const handleSaveToJournal = async () => {
    if (!user || !analysis) return;
    setSaving(true);
    const dreamId = `dream_${Date.now()}`;
    const path = `users/${user.uid}/dreams/${dreamId}`;
    try {
      let finalImageUrl = dreamImage;
      if (dreamImage && dreamImage.startsWith('data:')) {
        // Compress image to ensure it fits in Firestore 1MB limit
        try {
          finalImageUrl = await compressImage(dreamImage, 0.6, 800);
        } catch (e) {
          console.error('Compression failed, using original image', e);
        }
      }

      await setDoc(doc(db, path), {
        id: dreamId,
        authorUid: user.uid,
        transcript: transcript,
        analysis: analysis,
        imageUrl: finalImageUrl,
        createdAt: Timestamp.now()
      });
      alert('Dream saved to your journal!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center">
      <AnimatePresence mode="wait">
        {(state === 'idle' || state === 'recording') && (
          <motion.div
            key="capture"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-2xl"
          >
            <GlassCard glowColor={state === 'recording' ? 'red' : 'purple'}>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold flex items-center gap-2">
                  <Brain className="text-purple-400" />
                  Subconscious Capture
                </h2>
                {state === 'recording' && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_rgba(255,0,0,0.5)]"
                  />
                )}
              </div>

              <div className="relative mb-8">
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Describe your dream in detail... or use the microphone to speak."
                  className="w-full h-64 bg-white/5 border border-white/10 rounded-2xl p-6 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none font-light leading-relaxed"
                />
                
                <button
                  onClick={toggleRecording}
                  className={`absolute bottom-4 right-4 p-4 rounded-full transition-all duration-300 ${
                    state === 'recording' 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/50 hover:bg-purple-500/30'
                  }`}
                >
                  {state === 'recording' ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                </button>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setTranscript('')}
                  className="flex-1 py-4 bg-[#FF0000]/10 hover:bg-[#FF0000]/20 border border-[#FF0000]/30 text-[#FF0000]/60 font-bold uppercase tracking-widest transition-all"
                >
                  Clear
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!transcript.trim() || loading}
                  className="flex-[2] py-4 bg-[#00FF00]/20 hover:bg-[#00FF00]/30 border border-[#00FF00]/50 text-[#00FF00] rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,255,0,0.1)]"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Sparkles /> Analyze Subconscious</>}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {state === 'analyzing' && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-2xl text-center"
          >
            <div className="mb-12 relative">
              <div className="w-40 h-40 mx-auto bg-purple-500/20 rounded-full animate-nebula flex items-center justify-center">
                <Brain className="w-16 h-16 text-purple-400 animate-pulse" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-4 tracking-tight">Synthesizing Archetypes</h2>
            <p className="text-purple-100/60 max-w-md mx-auto leading-relaxed">
              Mapping symbolic data to Jungian structures and generating a surrealist visual representation of your dream's frequency.
            </p>
          </motion.div>
        )}

        {state === 'result' && analysis && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-6xl grid lg:grid-cols-2 gap-8"
          >
            <div className="space-y-8">
              <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                {dreamImage ? (
                  <img
                    src={dreamImage}
                    alt="Dream Visualization"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-white/5 animate-pulse flex items-center justify-center">
                    <Eye className="w-12 h-12 text-white/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8 right-8">
                  <h3 className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-2">Visual Frequency</h3>
                  <p className="text-sm text-white/60 italic leading-relaxed">{analysis.surrealistPrompt}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setState('idle')}
                  className="flex-1 py-4 bg-[#FF0000]/10 hover:bg-[#FF0000]/20 border border-[#FF0000]/30 text-[#FF0000]/60 font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Trash2 className="w-5 h-5" /> New Entry
                </button>
                <button
                  onClick={handleSaveToJournal}
                  disabled={saving}
                  className="flex-1 py-4 bg-[#00FF00]/10 hover:bg-[#00FF00]/20 border border-[#00FF00]/30 text-[#00FF00]/60 font-bold flex items-center justify-center gap-2 transition-all"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save to Journal
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <GlassCard glowColor="purple">
                <h3 className="text-xs font-mono text-purple-400 uppercase tracking-widest mb-6">Jungian Analysis</h3>
                
                <div className="space-y-8">
                  <div>
                    <h4 className="text-sm font-bold text-white/40 uppercase mb-3">Archetypes Identified</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.archetypes.map(a => (
                        <span key={a} className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs text-purple-300 font-medium">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white/40 uppercase mb-3">Symbolic Mapping</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.symbols.map(s => (
                        <span key={s} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/60">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white/40 uppercase mb-3">Interpretation</h4>
                    <p className="text-purple-50/80 leading-relaxed font-light text-lg italic">
                      "{analysis.interpretation}"
                    </p>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/10 space-y-4">
                  <button
                    onClick={() => navigate('/storybook', { 
                      state: { 
                        dreamPrompt: transcript,
                        dreamAnalysis: analysis 
                      } 
                    })}
                    className="w-full py-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 shadow-xl transition-all group border border-blue-400/30"
                  >
                    <BookOpen className="w-6 h-6 group-hover:scale-125 transition-transform" />
                    Transform into Story
                  </button>

                  <button
                    onClick={() => setState('expanding')}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-medium text-white/60 flex items-center justify-center gap-2 transition-all"
                  >
                    <Zap className="w-4 h-4" />
                    Deep Synthesis Analysis
                  </button>
                </div>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {state === 'expanding' && (
          <motion.div
            key="expanding"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl"
          >
            <GlassCard glowColor="blue">
              <div className="flex justify-between items-center mb-12">
                <div>
                  <h2 className="text-4xl font-bold mb-2">Deep Synthesis</h2>
                  <p className="text-blue-100/40">Transform your subconscious data into structured knowledge formats.</p>
                </div>
                <button onClick={() => { setState('result'); setSynthesisType(null); setSynthesisResult(null); }} className="p-3 hover:bg-white/5 rounded-full transition-colors">
                  <ChevronRight className="w-8 h-8 rotate-180" />
                </button>
              </div>

              {!synthesisType ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <SynthesisOption 
                    icon={<Headphones className="w-6 h-6" />}
                    title="AI Podcast"
                    description="A multi-host discussion exploring the themes of your dream."
                    onClick={() => handleSynthesis('podcast')}
                  />
                  <SynthesisOption 
                    icon={<MessageSquare className="w-6 h-6" />}
                    title="Thematic Debate"
                    description="Two opposing psychological perspectives debating your dream's meaning."
                    onClick={() => handleSynthesis('debate')}
                  />
                  <SynthesisOption 
                    icon={<Users className="w-6 h-6" />}
                    title="Round Table"
                    description="A diverse panel of experts discussing your subconscious symbols."
                    onClick={() => handleSynthesis('roundtable')}
                  />
                  <SynthesisOption 
                    icon={<Presentation className="w-6 h-6" />}
                    title="Visual Slides"
                    description="A structured presentation deck summarizing the analysis."
                    onClick={() => handleSynthesis('slides')}
                  />
                  <SynthesisOption 
                    icon={<Search className="w-6 h-6" />}
                    title="Deep Research"
                    description="A comprehensive report with cross-cultural and historical context."
                    onClick={() => handleSynthesis('research')}
                  />
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center justify-between border-b border-white/10 pb-6">
                    <div className="flex items-center gap-4">
                      <button onClick={() => { setSynthesisType(null); setSynthesisResult(null); }} className="text-white/40 hover:text-white">
                        <ChevronRight className="w-6 h-6 rotate-180" />
                      </button>
                      <h3 className="text-2xl font-bold capitalize">{synthesisType} Synthesis</h3>
                    </div>
                    {synthesisType === 'podcast' && (
                      <div className="flex items-center gap-4 bg-white/5 p-2 rounded-xl border border-white/10">
                        <div className="flex items-center gap-2 px-3 border-r border-white/10">
                          <span className="text-xs text-white/40 uppercase font-mono">Hosts</span>
                          <select 
                            value={podcastConfig.hostCount}
                            onChange={(e) => setPodcastConfig(prev => ({ ...prev, hostCount: parseInt(e.target.value) }))}
                            className="bg-transparent text-white focus:outline-none cursor-pointer"
                          >
                            {[1,2,3,4].map(n => <option key={n} value={n} className="bg-[#0a0a0a]">{n}</option>)}
                          </select>
                        </div>
                        <button 
                          onClick={() => setPodcastConfig(prev => ({ ...prev, includeUser: !prev.includeUser }))}
                          className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-all ${podcastConfig.includeUser ? 'bg-blue-500/20 text-blue-400' : 'text-white/40'}`}
                        >
                          {podcastConfig.includeUser ? <UserPlus className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
                          <span className="text-xs font-bold uppercase">Join In</span>
                        </button>
                        <button 
                          onClick={() => handleSynthesis('podcast')}
                          className="p-2 bg-blue-500 hover:bg-blue-400 rounded-lg transition-colors"
                        >
                          <RefreshCw className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                  </div>

                  {synthesisLoading ? (
                    <div className="py-20 flex flex-col items-center justify-center space-y-6">
                      <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                      <p className="text-blue-100/40 animate-pulse">Generating deep synthesis content...</p>
                    </div>
                  ) : synthesisResult ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {synthesisType === 'podcast' && <PodcastView data={synthesisResult} />}
                      {synthesisType === 'debate' && <DebateView data={synthesisResult} />}
                      {synthesisType === 'roundtable' && <RoundTableView data={synthesisResult} />}
                      {synthesisType === 'slides' && <SlidesView data={synthesisResult} />}
                      {synthesisType === 'research' && <ResearchView data={synthesisResult} />}
                    </div>
                  ) : null}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mood Check-in Portal */}
      {user && (
        <div className="mt-24 w-full max-w-4xl">
          <MoodPortal />
        </div>
      )}
    </div>
  );
};

const SynthesisOption = ({ icon, title, description, onClick }: { icon: React.ReactNode, title: string, description: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="group p-6 bg-white/5 border border-white/10 rounded-3xl text-left hover:bg-blue-500/10 hover:border-blue-500/30 transition-all"
  >
    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h4 className="text-xl font-bold mb-2">{title}</h4>
    <p className="text-sm text-white/40 leading-relaxed">{description}</p>
  </button>
);

const PodcastView = ({ data }: { data: PodcastScript }) => (
  <div className="space-y-6">
    <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
      <h4 className="text-sm font-bold text-blue-400 uppercase mb-4">Podcast Hosts</h4>
      <div className="flex flex-wrap gap-4">
        {data.hosts.map((h, i) => (
          <div key={i} className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-xs font-bold">
              {h.name[0]}
            </div>
            <div>
              <p className="text-sm font-bold">{h.name}</p>
              <p className="text-[10px] text-white/40 uppercase">{h.role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
      {data.dialogue.map((d, i) => (
        <div key={i} className={`flex flex-col ${d.speaker === 'User' ? 'items-end' : 'items-start'}`}>
          <div className={`max-w-[80%] p-4 rounded-2xl ${d.speaker === 'User' ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-white/5 border border-white/10'}`}>
            <p className="text-[10px] font-bold text-white/40 uppercase mb-1">{d.speaker}</p>
            <p className="text-sm leading-relaxed">{d.text}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const DebateView = ({ data }: { data: DebateScript }) => (
  <div className="space-y-8">
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-green-400 uppercase">Perspective A</h4>
        {data.pro.map((p, i) => (
          <div key={i} className="p-6 bg-green-500/5 border border-green-500/20 rounded-2xl">
            <p className="font-bold mb-2">{p.name}</p>
            <p className="text-sm text-white/60 leading-relaxed">{p.argument}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-red-400 uppercase">Perspective B</h4>
        {data.con.map((c, i) => (
          <div key={i} className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl">
            <p className="font-bold mb-2">{c.name}</p>
            <p className="text-sm text-white/60 leading-relaxed">{c.argument}</p>
          </div>
        ))}
      </div>
    </div>
    <div className="p-8 bg-white/5 border border-white/10 rounded-3xl">
      <h4 className="text-sm font-bold text-white/40 uppercase mb-4">Synthesis Conclusion</h4>
      <p className="text-lg italic font-light leading-relaxed">"{data.conclusion}"</p>
    </div>
  </div>
);

const RoundTableView = ({ data }: { data: RoundTableScript }) => (
  <div className="space-y-8">
    <div className="flex flex-wrap gap-4">
      {data.participants.map((p, i) => (
        <div key={i} className="flex-1 min-w-[200px] p-4 bg-white/5 border border-white/10 rounded-2xl">
          <p className="font-bold text-blue-400">{p.name}</p>
          <p className="text-xs text-white/40 italic">{p.pov}</p>
        </div>
      ))}
    </div>
    <div className="space-y-4">
      {data.discussion.map((d, i) => (
        <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl">
          <span className="font-bold text-xs uppercase mr-2">{d.speaker}:</span>
          <span className="text-sm text-white/80">{d.text}</span>
        </div>
      ))}
    </div>
  </div>
);

const SlidesView = ({ data }: { data: SlideContent }) => {
  const [activeSlide, setActiveSlide] = useState(0);
  return (
    <div className="space-y-6">
      <div className="aspect-video bg-white/5 border border-white/10 rounded-3xl p-12 flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-8 right-8 text-xs font-mono text-white/20">
          Slide {activeSlide + 1} / {data.slides.length}
        </div>
        <motion.div 
          key={activeSlide}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <h4 className="text-4xl font-bold">{data.slides[activeSlide].title}</h4>
          <ul className="space-y-3">
            {data.slides[activeSlide].content.map((c, i) => (
              <li key={i} className="flex items-start gap-3 text-lg text-white/60">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2.5 shrink-0" />
                {c}
              </li>
            ))}
          </ul>
          <div className="pt-8 border-t border-white/10">
            <p className="text-xs text-white/20 italic">Visual Suggestion: {data.slides[activeSlide].visualSuggestion}</p>
          </div>
        </motion.div>
      </div>
      <div className="flex justify-center gap-2">
        {data.slides.map((_, i) => (
          <button 
            key={i}
            onClick={() => setActiveSlide(i)}
            className={`w-3 h-3 rounded-full transition-all ${activeSlide === i ? 'bg-blue-500 w-8' : 'bg-white/20'}`}
          />
        ))}
      </div>
    </div>
  );
};

const ResearchView = ({ data }: { data: DeepResearchReport }) => (
  <div className="space-y-12">
    <h4 className="text-4xl font-bold text-center mb-12">{data.title}</h4>
    {data.sections.map((s, i) => (
      <div key={i} className="space-y-6">
        <h5 className="text-xl font-bold border-l-4 border-blue-500 pl-4">{s.title}</h5>
        <p className="text-white/70 leading-relaxed text-lg">{s.content}</p>
        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
          <h6 className="text-xs font-bold text-white/30 uppercase mb-4">References & Context</h6>
          <ul className="grid md:grid-cols-2 gap-2">
            {s.references.map((r, j) => (
              <li key={j} className="text-xs text-blue-400/60 flex items-center gap-2">
                <div className="w-1 h-1 bg-blue-500/40 rounded-full" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    ))}
  </div>
);
