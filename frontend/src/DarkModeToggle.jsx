import React, { useEffect, useState } from 'react';

export default function DarkModeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    const root = document.documentElement;
    const appContainer = document.getElementById('app-root-container');
    
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      if (appContainer) {
        appContainer.style.background = 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #020617 100%)';
      }
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      if (appContainer) {
        appContainer.style.background = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #c026d3 70%, #2563eb 100%)';
      }
    }
  }, [isDarkMode]);

  return (
    <button
      onClick={() => setIsDarkMode(!isDarkMode)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-700 bg-gray-800 text-gray-200 hover:bg-gray-700 transition text-sm font-medium cursor-pointer"
      aria-label="Toggle Dark Mode"
    >
      {isDarkMode ? (
        <>
          <span>☀️</span> Light
        </>
      ) : (
        <>
          <span>🌙</span> Dark
        </>
      )}
    </button>
  );
}