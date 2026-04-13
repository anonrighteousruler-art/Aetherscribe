import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Book, Loader2, RefreshCw, ChevronLeft, ChevronRight, Save, Wand2 } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { generateStoryBrief, generateStoryPages, generatePageImage, StoryBrief, StoryPage } from '../lib/gemini';
import { db, setDoc, doc, Timestamp, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/FirebaseProvider';
import { compressImage } from '../lib/imageUtils';

type Step = 'input' | 'brief' | 'pages' | 'images' | 'viewer';

export const Storybook: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [step, setStep] = useState<Step>('input');
  const [prompt, setPrompt] = useState('');
  const [isFromDream, setIsFromDream] = useState(false);

  useEffect(() => {
    const state = location.state as { dreamPrompt?: string; dreamAnalysis?: any };
    if (state?.dreamPrompt) {
      setPrompt(state.dreamPrompt);
      setIsFromDream(true);
    }
  }, [location]);
  const [brief, setBrief] = useState<StoryBrief | null>(null);
  const [pages, setPages] = useState<StoryPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      const newBrief = await generateStoryBrief(prompt);
      setBrief(newBrief);
      setStep('brief');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBrief = async () => {
    setLoading(true);
    try {
      const newPages = await generateStoryPages(brief!);
      setPages(newPages);
      setStep('pages');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImages = async () => {
    setLoading(true);
    setStep('images');
    try {
      const updatedPages = [...pages];
      for (let i = 0; i < updatedPages.length; i++) {
        const imageUrl = await generatePageImage(updatedPages[i], brief!);
        updatedPages[i] = { ...updatedPages[i], imageUrl };
        setPages([...updatedPages]); // Update state incrementally
      }
      setStep('viewer');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!user || !brief) return;
    setSaving(true);
    const storyId = `story_${Date.now()}`;
    const storyPath = `users/${user.uid}/storybooks/${storyId}`;
    try {
      // 1. Save story metadata
      await setDoc(doc(db, storyPath), {
        id: storyId,
        authorUid: user.uid,
        title: brief.title,
        summary: brief.summary,
        heroSpecs: brief.heroSpecs,
        setting: brief.setting,
        plotArc: brief.plotArc,
        artStyle: brief.artStyle,
        createdAt: Timestamp.now()
      });

      // 2. Save each page as a separate document in a subcollection
      for (const page of pages) {
        let finalImageUrl = page.imageUrl;
        if (page.imageUrl && page.imageUrl.startsWith('data:')) {
          try {
            // Compress each page image to be safe
            finalImageUrl = await compressImage(page.imageUrl, 0.6, 800);
          } catch (e) {
            console.error('Page image compression failed', e);
          }
        }

        const pagePath = `${storyPath}/pages/page_${page.pageNumber}`;
        await setDoc(doc(db, pagePath), {
          ...page,
          imageUrl: finalImageUrl
        });
      }

      alert('Story saved to your library!');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, storyPath);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-6 flex flex-col items-center">
      <AnimatePresence mode="wait">
        {step === 'input' && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
          >
            <GlassCard glowColor="blue">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  {isFromDream ? <Wand2 className="w-8 h-8 text-blue-400" /> : <Book className="w-8 h-8 text-blue-400" />}
                </div>
                <div>
                  <h2 className="text-3xl font-bold">
                    {isFromDream ? 'Manifesting Dream' : 'Story Manifestation'}
                  </h2>
                  <p className="text-blue-100/40 text-sm">
                    {isFromDream ? 'Your subconscious data has been imported.' : 'Define the narrative parameters.'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the core concept of your story..."
                    className="w-full h-48 bg-white/5 border border-white/10 rounded-2xl p-6 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none font-light leading-relaxed"
                  />
                  {isFromDream && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-[10px] text-blue-300 font-bold uppercase tracking-wider">
                      Dream Data Linked
                    </div>
                  )}
                </div>

                <button
                  onClick={handleStart}
                  disabled={!prompt.trim() || loading}
                  className="w-full py-4 bg-[#00FF00]/20 hover:bg-[#00FF00]/30 border border-[#00FF00]/50 text-[#00FF00] rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,255,0,0.1)]"
                >
                  {loading ? <Loader2 className="animate-spin" /> : <><Sparkles /> Generate Narrative Brief</>}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {step === 'brief' && brief && (
          <motion.div
            key="brief"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="w-full max-w-4xl"
          >
            <GlassCard glowColor="blue">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-4xl font-bold mb-2">{brief.title}</h2>
                  <p className="text-blue-400 font-mono text-sm uppercase tracking-widest">{brief.artStyle}</p>
                </div>
                <button onClick={() => setStep('input')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <RefreshCw className="w-5 h-5 text-white/40" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-white/40 uppercase mb-2">The Hero</h3>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                      <p className="text-xl font-bold">{brief.heroSpecs.name}, {brief.heroSpecs.age}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {brief.heroSpecs.interests.map(i => (
                          <span key={i} className="px-2 py-1 bg-blue-500/20 rounded-md text-xs text-blue-300">{i}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white/40 uppercase mb-2">Setting</h3>
                    <p className="text-blue-100/80">{brief.setting}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white/40 uppercase mb-2">Plot Arc</h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-1 bg-blue-500/20 rounded-full" />
                      <p className="text-sm italic text-blue-100/60">{brief.plotArc.beginning}</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-1 bg-blue-500/40 rounded-full" />
                      <p className="text-sm italic text-blue-100/60">{brief.plotArc.middle}</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-1 bg-blue-500/60 rounded-full" />
                      <p className="text-sm italic text-blue-100/60">{brief.plotArc.end}</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleConfirmBrief}
                disabled={loading}
                className="w-full py-4 bg-[#00FF00]/20 hover:bg-[#00FF00]/30 border border-[#00FF00]/50 text-[#00FF00] rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,255,0,0.1)]"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><Book /> Generate Pages</>}
              </button>
            </GlassCard>
          </motion.div>
        )}

        {step === 'pages' && (
          <motion.div
            key="pages"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-5xl grid gap-4"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Story Draft</h2>
              <button
                onClick={handleGenerateImages}
                disabled={loading}
                className="px-6 py-2 bg-[#00FF00]/20 hover:bg-[#00FF00]/30 border border-[#00FF00]/50 text-[#00FF00] rounded-full font-bold flex items-center gap-2 transition-all shadow-[0_0_10px_rgba(0,255,0,0.1)]"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><Sparkles /> Illustrate Story</>}
              </button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pages.map((page, idx) => (
                <GlassCard key={idx} className="h-full">
                  <div className="text-xs font-mono text-blue-400 mb-2">PAGE {page.pageNumber}</div>
                  <p className="text-sm text-blue-100/80 leading-relaxed mb-4">{page.text}</p>
                  <div className="mt-auto pt-4 border-t border-white/10">
                    <h4 className="text-[10px] uppercase text-white/30 mb-1">Visual Plan</h4>
                    <p className="text-[10px] text-white/50 italic">{page.visualPlan.mood}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'images' && (
          <motion.div
            key="images"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-2xl text-center"
          >
            <div className="mb-8 relative">
              <div className="w-32 h-32 mx-auto bg-blue-500/20 rounded-full animate-pulse flex items-center justify-center">
                <Sparkles className="w-12 h-12 text-blue-400 animate-spin" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-4">Illustrating Your Story</h2>
            <p className="text-blue-100/60 mb-8">
              We're generating high-fidelity illustrations for each page using the <strong>{brief?.artStyle}</strong> style.
            </p>
            <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
              {pages.map((p, i) => (
                <div key={i} className={`h-1 rounded-full ${p.imageUrl ? 'bg-blue-500' : 'bg-white/10'}`} />
              ))}
            </div>
          </motion.div>
        )}

        {step === 'viewer' && (
          <motion.div
            key="viewer"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-6xl"
          >
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentPage}
                    src={pages[currentPage].imageUrl}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center">
                   <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-xs font-mono">
                    {currentPage + 1} / {pages.length}
                   </div>
                </div>
              </div>

              <div className="space-y-8">
                <GlassCard glowColor="blue">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-mono text-blue-400">PAGE {pages[currentPage].pageNumber}</h3>
                    <button 
                      onClick={handleSaveToLibrary}
                      disabled={saving}
                      className="flex items-center gap-2 text-xs font-bold text-blue-300 hover:text-blue-100 transition-colors"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      SAVE STORY
                    </button>
                  </div>
                  <p className="text-2xl md:text-3xl font-serif leading-relaxed text-blue-50">
                    {pages[currentPage].text}
                  </p>
                </GlassCard>

                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 disabled:opacity-20 rounded-2xl flex items-center justify-center transition-all"
                  >
                    <ChevronLeft className="w-8 h-8" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
                    disabled={currentPage === pages.length - 1}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 disabled:opacity-20 rounded-2xl flex items-center justify-center transition-all"
                  >
                    <ChevronRight className="w-8 h-8" />
                  </button>
                </div>
                
                <button
                  onClick={() => setStep('input')}
                  className="w-full py-4 border border-white/10 hover:bg-white/5 rounded-2xl text-white/40 text-sm font-bold uppercase tracking-widest transition-all"
                >
                  Create New Story
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
