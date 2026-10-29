import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  phase: string;
  description: string;
  plannedFeatures: string[];
  icon: LucideIcon;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({
  title,
  phase,
  description,
  plannedFeatures,
  icon: Icon,
}) => {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <div className="bg-[#1e1e24] rounded-2xl border border-[#2a2a34] p-8 shadow-xs">
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-red-950/40 text-acca-red rounded-xl border border-red-800/40">
            <Icon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/40 text-acca-red border border-red-800/40">
                {phase}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              Part of the official Catchy ACCA modular development roadmap
            </p>
          </div>
        </div>

        <p className="text-gray-300 leading-relaxed text-base mb-6">
          {description}
        </p>

        <div className="border-t border-[#2a2a34] pt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-acca-red" />
            <span>Planned Capabilities</span>
          </h4>
          <ul className="space-y-2.5">
            {plannedFeatures.map((item, idx) => (
              <li key={idx} className="flex items-start text-sm text-gray-300">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-acca-red mt-2 mr-2.5 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 bg-[#141419] rounded-xl p-4 border border-[#2a2a34] flex items-center justify-between text-xs text-gray-400">
          <span>In accordance with master project guidelines, no placeholder mock functionality is simulated.</span>
          <span className="font-semibold text-gray-300">Catchy ACCA · by ly77ee</span>
        </div>
      </div>
    </div>
  );
};
