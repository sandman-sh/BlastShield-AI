import React from 'react';

interface VoxelBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export default function VoxelBadge({ status, className = '', size = 'md' }: VoxelBadgeProps) {
  const s = status.toUpperCase();

  let bg = 'bg-white text-black border-black';
  let dotColor = 'bg-black';

  if (s === 'HEALTHY' || s === 'PONG' || s === 'SUCCESS' || s === 'ACTIVE') {
    bg = 'bg-[#00FF66] text-black border-black font-extrabold';
    dotColor = 'bg-black';
  } else if (s === 'COMPROMISED' || s === 'CRITICAL' || s === 'FAIL') {
    bg = 'bg-[#ff3366] text-white border-black font-extrabold';
    dotColor = 'bg-white';
  } else if (s === 'AT_RISK' || s === 'HIGH' || s === 'WARNING') {
    bg = 'bg-[#ffb703] text-black border-black font-extrabold';
    dotColor = 'bg-black';
  } else if (s === 'QUARANTINED' || s === 'ISOLATED') {
    bg = 'bg-purple-600 text-white border-black font-extrabold';
    dotColor = 'bg-[#00FF66]';
  } else if (s === 'FAILOVER') {
    bg = 'bg-blue-500 text-white border-black font-extrabold';
    dotColor = 'bg-white';
  } else if (s === 'FALKORDB' || s === 'GRAPHBLAS') {
    bg = 'bg-black text-[#00FF66] border-[#00FF66] font-extrabold shadow-[2px_2px_0px_#00FF66]';
    dotColor = 'bg-[#00FF66]';
  }

  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span className={`voxel-badge ${bg} ${sizeClass} ${className}`}>
      <span className={`w-2 h-2 rounded-none ${dotColor} inline-block border border-current`} />
      {status}
    </span>
  );
}
