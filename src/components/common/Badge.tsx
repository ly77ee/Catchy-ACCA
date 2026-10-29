import React from 'react';
import { PaperStatus, QuestionStatus } from '../../types';

interface BadgeProps {
  status?: PaperStatus | QuestionStatus | 'doubt';
  text?: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, text, className = '' }) => {
  let colorStyles = 'bg-gray-100 text-gray-700 border-gray-200';
  let defaultLabel = text || 'Status';

  switch (status) {
    case 'passed':
      colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      defaultLabel = text || 'Passed';
      break;
    case 'in_progress':
      colorStyles = 'bg-amber-50 text-amber-800 border-amber-300';
      defaultLabel = text || 'In Progress';
      break;
    case 'exempt':
      colorStyles = 'bg-blue-50 text-blue-800 border-blue-300';
      defaultLabel = text || 'Exempt';
      break;
    case 'not_started':
      colorStyles = 'bg-gray-100 text-gray-600 border-gray-300';
      defaultLabel = text || 'Not Started';
      break;
    case 'attempted':
      colorStyles = 'bg-indigo-50 text-indigo-800 border-indigo-300';
      defaultLabel = text || 'Attempted';
      break;
    case 'completed':
      colorStyles = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      defaultLabel = text || 'Completed';
      break;
    case 'needs_review':
      colorStyles = 'bg-orange-50 text-orange-800 border-orange-300';
      defaultLabel = text || 'Needs Review';
      break;
    case 'doubt':
      colorStyles = 'bg-red-50 text-red-700 border-red-300 font-semibold';
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
