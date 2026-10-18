import React from 'react';

interface VoxelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export default function VoxelButton({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: VoxelButtonProps) {
  let variantClass = 'voxel-btn-primary';
  if (variant === 'secondary') {
    variantClass = 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[#00FF66]/10';
  } else if (variant === 'danger') {
    variantClass = 'voxel-btn-danger';
  } else if (variant === 'outline') {
    variantClass = 'bg-transparent text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-main)]';
  }

  let sizeClass = 'text-xs px-3 py-1.5';
  if (size === 'md') sizeClass = 'text-sm px-4 py-2';
  if (size === 'lg') sizeClass = 'text-base px-6 py-3';

  return (
    <button
      className={`voxel-btn ${variantClass} ${sizeClass} ${className} disabled:opacity-50 disabled:cursor-not-allowed`}
      {...props}
    >
      {children}
    </button>
  );
}
