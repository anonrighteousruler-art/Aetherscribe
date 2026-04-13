import React from 'react';
import { motion } from 'motion/react';

export const NebulaBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0a051a]">
      {/* Base Nebula Layer */}
      <motion.div
        className="absolute inset-0 opacity-40"
        animate={{
          background: [
            'radial-gradient(circle at 20% 30%, #4a1d96 0%, transparent 50%)',
            'radial-gradient(circle at 80% 70%, #4a1d96 0%, transparent 50%)',
            'radial-gradient(circle at 20% 30%, #4a1d96 0%, transparent 50%)',
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />
      
      {/* Secondary Nebula Layer */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            'radial-gradient(circle at 70% 20%, #1e3a8a 0%, transparent 40%)',
            'radial-gradient(circle at 30% 80%, #1e3a8a 0%, transparent 40%)',
            'radial-gradient(circle at 70% 20%, #1e3a8a 0%, transparent 40%)',
          ],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />

      {/* Accent Nebula Layer */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{
          background: [
            'radial-gradient(circle at 50% 50%, #7c3aed 0%, transparent 60%)',
            'radial-gradient(circle at 40% 40%, #7c3aed 0%, transparent 60%)',
            'radial-gradient(circle at 50% 50%, #7c3aed 0%, transparent 60%)',
          ],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />

      {/* Stars/Particles */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
    </div>
  );
};
