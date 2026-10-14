import React from 'react';
import { DotId, AgentStatus } from '../types/swarm';
import { DotBlobAvatar } from './DotBlobAvatar';

interface AgentBadgeProps {
  dotId: DotId;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: AgentStatus;
  isSpeaking?: boolean;
  className?: string;
  onClick?: () => void;
  showCallsign?: boolean;
}

export const AgentBadge: React.FC<AgentBadgeProps> = ({
  dotId,
  size = 'md',
  status = 'idle',
  isSpeaking = false,
  className = '',
  onClick,
  showCallsign = false,
}) => {
  const meta = {
    spark: { name: 'Spark', role: 'Architect & Code', callsign: 'ARC-01' },
    nova: { name: 'Nova', role: 'Security & Guardrails', callsign: 'SEC-02' },
    aura: { name: 'Aura', role: 'QA & Testing', callsign: 'QA-03' },
    echo: { name: 'Alfred', role: 'Executive Scribe', callsign: 'DOC-04' },
  }[dotId] || { name: 'Dot', role: 'Agent', callsign: 'AGT-00' };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2 select-none ${className}`}
    >
      <DotBlobAvatar
        dotId={dotId}
        size={size}
        status={status}
      />
      {showCallsign && (
        <div className="flex flex-col text-left">
          <span className="font-semibold text-xs text-zinc-900 leading-tight">
            {meta.name}
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">
            {meta.role}
          </span>
        </div>
      )}
    </div>
  );
};

export const CuteDotAvatar = AgentBadge;
