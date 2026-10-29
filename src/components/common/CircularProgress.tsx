import React from 'react';

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  showText?: boolean;
  subLabel?: string;
  customText?: string;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 64,
  strokeWidth = 6,
  color = '#C00000',
  trackColor = '#E5E7EB',
  showText = true,
  subLabel,
  customText,
  className = '',
}) => {
  const normalizedPercentage = Math.min(100, Math.max(0, Math.round(percentage)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedPercentage / 100) * circumference;

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={normalizedPercentage}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 origin-center"
      >
        {/* Background Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {showText && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
          <span
            className="font-bold leading-none text-gray-900"
            style={{ fontSize: Math.max(10, Math.floor(size * 0.22)) }}
          >
            {customText !== undefined ? customText : `${normalizedPercentage}%`}
          </span>
          {subLabel && (
            <span
              className="text-gray-500 font-medium tracking-tight mt-0.5 uppercase"
              style={{ fontSize: Math.max(8, Math.floor(size * 0.1)) }}
            >
              {subLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
