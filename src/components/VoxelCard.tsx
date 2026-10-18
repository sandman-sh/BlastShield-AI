import React from 'react';

interface VoxelCardProps {
  title?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  highlightGreen?: boolean;
}

export default function VoxelCard({
  title,
  badge,
  action,
  children,
  className = '',
  highlightGreen = false,
}: VoxelCardProps) {
  return (
    <div className={`voxel-box ${highlightGreen ? 'voxel-box-green' : ''} ${className}`}>
      {title && (
        <div className="border-b-3 border-[var(--border-color)] px-4 py-2.5 bg-[var(--bg-surface-elevated)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 bg-[#00FF66] border border-black shadow-[1px_1px_0px_#000]" />
            <h3 className="font-extrabold text-xs md:text-sm tracking-wider uppercase text-[var(--text-primary)]">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {badge}
            {action}
          </div>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
