import React from 'react';
import { DotId, AgentStatus } from '../types/swarm';

interface DotBlobAvatarProps {
  dotId: DotId;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: AgentStatus;
  accessory?: 'beret' | 'glasses' | 'headset' | 'monocle' | 'none';
  className?: string;
  onClick?: () => void;
}

export const DotBlobAvatar: React.FC<DotBlobAvatarProps> = ({
  dotId,
  size = 'md',
  status = 'idle',
  accessory,
  className = '',
  onClick,
}) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  // Color configurations matching OpenAI Dots palette
  const dotConfigs = {
    spark: {
      name: 'Spark',
      color: '#3b82f6', // OpenAI blue
      gradient: 'from-blue-400 to-blue-600',
      defaultAccessory: 'beret',
      glow: 'shadow-blue-500/20',
    },
    nova: {
      name: 'Nova',
      color: '#8b5cf6', // Soft purple
      gradient: 'from-violet-400 to-purple-600',
      defaultAccessory: 'headset',
      glow: 'shadow-purple-500/20',
    },
    aura: {
      name: 'Aura',
      color: '#10b981', // Clean sage / emerald
      gradient: 'from-emerald-400 to-teal-600',
      defaultAccessory: 'monocle',
      glow: 'shadow-emerald-500/20',
    },
    echo: {
      name: 'Alfred',
      color: '#f59e0b', // Warm amber / Alfred yellow from OpenAI screenshot
      gradient: 'from-amber-300 to-amber-500',
      defaultAccessory: 'glasses',
      glow: 'shadow-amber-500/20',
    },
  }[dotId] || {
    name: 'Dot',
    color: '#3b82f6',
    gradient: 'from-blue-400 to-blue-600',
    defaultAccessory: 'beret',
    glow: 'shadow-blue-500/20',
  };

  const finalAccessory = accessory || dotConfigs.defaultAccessory;
  const isExecuting = status === 'executing';

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center select-none ${sizeMap[size]} ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        className={`w-full h-full filter drop-shadow-md transition-transform duration-300 ${
          isExecuting ? 'animate-bounce' : 'hover:scale-105'
        }`}
      >
        <defs>
          <radialGradient id={`grad-${dotId}`} cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor={dotConfigs.color} stopOpacity="1" />
            <stop offset="100%" stopColor={dotConfigs.color} stopOpacity="0.8" />
          </radialGradient>
        </defs>

        {/* Organic soft clay/blob body like OpenAI Dots */}
        <path
          d="M 50,15 
             C 72,12 88,25 90,48 
             C 92,68 80,86 58,88 
             C 34,90 14,80 12,56 
             C 10,32 28,18 50,15 Z"
          fill={`url(#grad-${dotId})`}
        />

        {/* Highlight sheen on top-left for clay effect */}
        <path
          d="M 35,22 C 45,20 60,25 65,30 C 55,27 40,26 30,32 C 32,28 33,24 35,22 Z"
          fill="white"
          opacity="0.35"
        />

        {/* French Beret (OpenAI Blue Dot accessory) */}
        {finalAccessory === 'beret' && (
          <g transform="translate(18, -4)">
            {/* Beret body */}
            <path
              d="M 12,26 C 15,10 48,6 56,18 C 62,26 48,32 32,32 C 18,32 10,30 12,26 Z"
              fill="#18181b"
            />
            {/* Beret stem */}
            <path
              d="M 36,10 C 36,6 38,4 39,4 C 40,4 39,8 37,10 Z"
              stroke="#18181b"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        )}

        {/* Glasses (Alfred Yellow Dot accessory from OpenAI screenshot) */}
        {finalAccessory === 'glasses' && (
          <g stroke="#18181b" strokeWidth="3" fill="none">
            {/* Left lens */}
            <circle cx="38" cy="46" r="10" fill="white" fillOpacity="0.3" />
            {/* Right lens */}
            <circle cx="62" cy="46" r="10" fill="white" fillOpacity="0.3" />
            {/* Bridge */}
            <path d="M 48,46 L 52,46" strokeWidth="2.5" />
            {/* Left ear piece */}
            <path d="M 28,46 L 20,44" strokeWidth="2" />
            {/* Right ear piece */}
            <path d="M 72,46 L 80,44" strokeWidth="2" />
          </g>
        )}

        {/* Headset (Nova accessory) */}
        {finalAccessory === 'headset' && (
          <g>
            <path
              d="M 22,50 C 22,25 78,25 78,50"
              fill="none"
              stroke="#18181b"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <rect x="18" y="44" width="7" height="14" rx="3.5" fill="#18181b" />
            <rect x="75" y="44" width="7" height="14" rx="3.5" fill="#18181b" />
            <path d="M 77,54 Q 70,68 56,66" fill="none" stroke="#18181b" strokeWidth="2" />
            <circle cx="54" cy="66" r="3" fill="#18181b" />
          </g>
        )}

        {/* Monocle (Aura accessory) */}
        {finalAccessory === 'monocle' && (
          <g>
            <circle cx="62" cy="48" r="9" fill="white" fillOpacity="0.3" stroke="#18181b" strokeWidth="2.5" />
            <path d="M 71,48 L 78,65" stroke="#18181b" strokeWidth="1.5" />
          </g>
        )}

        {/* Clean minimal black dot eyes */}
        <circle
          cx="38"
          cy={finalAccessory === 'glasses' ? 46 : 48}
          r="3.5"
          fill="#18181b"
        />
        <circle
          cx="62"
          cy={finalAccessory === 'glasses' ? 46 : 48}
          r="3.5"
          fill="#18181b"
        />

        {/* Catchlight in eyes */}
        <circle cx="39.2" cy={finalAccessory === 'glasses' ? 45 : 47} r="1" fill="white" />
        <circle cx="63.2" cy={finalAccessory === 'glasses' ? 45 : 47} r="1" fill="white" />

        {/* Cute subtle smile when idle / listening */}
        <path
          d="M 46,58 Q 50,62 54,58"
          fill="none"
          stroke="#18181b"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {/* Real-time processing status dot */}
      {isExecuting && (
        <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
      )}
    </div>
  );
};
