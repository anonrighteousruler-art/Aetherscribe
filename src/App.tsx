import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NebulaBackground } from './components/NebulaBackground';
import { Landing } from './pages/Landing';
import { Storybook } from './pages/Storybook';
import { DreamJournal } from './pages/DreamJournal';
import { FirebaseProvider, ErrorBoundary } from './lib/FirebaseProvider';

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <Router>
          <div className="relative min-h-screen overflow-x-hidden">
            <NebulaBackground />
            
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/storybook" element={<Storybook />} />
              <Route path="/dream-journal" element={<DreamJournal />} />
            </Routes>
          </div>
        </Router>
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
