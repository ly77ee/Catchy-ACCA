import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-[#1e1e24] rounded-xl border border-dashed border-[#2a2a34] ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-red-950/40 text-acca-red flex items-center justify-center border border-red-800/40 mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-acca-red hover:bg-acca-red-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-acca-red transition-colors shadow-xs"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
