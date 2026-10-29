import React from 'react';
import { PaperStatus, QuestionStatus } from '../../types';

interface BadgeProps {
  status?: PaperStatus | QuestionStatus | 'doubt';
  text?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, text, className = '' }) => {
  let colorStyles = 'bg-[#141419] text-gray-400 border-[#2a2a34]';
  let defaultLabel = text || 'Status';

  switch (status) {
    case 'passed':
      colorStyles = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50';
      defaultLabel = text || 'Passed';
      break;
    case 'in_progress':
      colorStyles = 'bg-amber-950/40 text-amber-300 border-amber-800/50';
      defaultLabel = text || 'In Progress';
      break;
    case 'exempt':
      colorStyles = 'bg-blue-950/40 text-blue-300 border-blue-800/50';
      defaultLabel = text || 'Exempt';
      break;
    case 'not_started':
      colorStyles = 'bg-[#141419] text-gray-400 border-[#2a2a34]';
      defaultLabel = text || 'Not Started';
      break;
    case 'attempted':
      colorStyles = 'bg-indigo-950/40 text-indigo-300 border-indigo-800/50';
      defaultLabel = text || 'Attempted';
      break;
    case 'completed':
      colorStyles = 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50';
      defaultLabel = text || 'Completed';
      break;
    case 'needs_review':
      colorStyles = 'bg-orange-950/40 text-orange-300 border-orange-800/50';
      defaultLabel = text || 'Needs Review';
      break;
    case 'doubt':
      colorStyles = 'bg-red-950/50 text-red-300 border-red-800/50 font-semibold';
      defaultLabel = text || 'Doubt';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorStyles} ${className}`}
    >
      {defaultLabel}
    </span>
  );
};
