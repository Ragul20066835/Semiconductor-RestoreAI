import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Restore from './pages/Restore';
import Comparison from './pages/Comparison';
import Analytics from './pages/Analytics';
import History from './pages/History';
import Settings from './pages/Settings';
import About from './pages/About';

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark theme
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.remove('light-theme');
      document.documentElement.style.backgroundColor = '#09090B';
    } else {
      document.documentElement.classList.add('light-theme');
      document.documentElement.style.backgroundColor = '#f8fafc';
    }
  }, [isDark]);

  return (
    <Router>
      <Layout isDark={isDark} setIsDark={setIsDark}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/restore" element={<Restore />} />
          <Route path="/comparison" element={<Comparison />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings isDark={isDark} setIsDark={setIsDark} />} />
          <Route path="/about" element={<About />} />
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
}
