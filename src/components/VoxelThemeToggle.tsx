'use client';

import React from 'react';
import { useTheme } from '@/lib/theme-context';
import { Sun, Moon } from 'lucide-react';

export default function VoxelThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={`Switch to ${theme === 'light' ? 'Dark' : 'White'} Mode`}
      className="voxel-btn bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[#00FF66]/20 transition-colors px-3 py-1.5 flex items-center gap-2 text-xs font-bold"
    >
      {theme === 'light' ? (
        <>
          <div className="w-4 h-4 bg-black flex items-center justify-center border border-black shadow-[1px_1px_0px_#00FF66]">
            <Moon className="w-3 h-3 text-[#00FF66]" />
          </div>
          <span>DARK MODE</span>
        </>
      ) : (
        <>
          <div className="w-4 h-4 bg-[#00FF66] flex items-center justify-center border border-white shadow-[1px_1px_0px_#ffffff]">
            <Sun className="w-3 h-3 text-black" />
          </div>
          <span>WHITE MODE</span>
        </>
      )}
    </button>
  );
}
