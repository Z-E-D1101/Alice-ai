import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, Terminal } from 'lucide-react';
import { ThinkingStep } from '../types.js';

interface ThinkingStepsProps {
  steps: ThinkingStep[];
  timeSec?: number;
}

export function ThinkingStepsView({ steps, timeSec }: ThinkingStepsProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  if (!steps || steps.length === 0) return null;

  return (
    <div className="mb-2 bg-[#1c1410]/60 border border-[#2d231d] rounded font-mono text-[10px] text-stone-300 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-[#251d18] transition-all text-stone-400 font-bold"
      >
        <div className="flex items-center space-x-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ea580c] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ea580c]"></span>
          </span>
          <span className="uppercase tracking-wider">Alice Thinking</span>
          {timeSec !== undefined && (
            <span className="text-[9px] font-normal text-stone-500 bg-[#100b08] px-1.5 py-0.2 rounded shrink-0">
              Thinking for {timeSec}s
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[8px] uppercase font-normal">{isOpen ? 'Hide Detail' : 'Expand Detail'}</span>
          {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </div>
      </button>

      {/* Expanded Step Listing */}
      {isOpen && (
        <div className="border-t border-[#2d231d] p-2.5 space-y-2 bg-[#100b08]/40">
          {steps.map((step, idx) => (
            <div key={step.id || idx} className="flex items-start space-x-2 animate-fadeIn">
              <span className="text-xs select-none">{step.icon || '⚙️'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-stone-200 uppercase text-[9px] tracking-wide">
                    {step.title}
                  </span>
                  {step.duration && (
                    <span className="text-[8px] text-amber-500 font-mono">
                      {step.duration}
                    </span>
                  )}
                </div>
                {step.detail && (
                  <div className="mt-0.5 text-[9px] text-stone-500 bg-[#100b08]/60 px-1.5 py-0.5 rounded-sm overflow-x-auto truncate max-w-full">
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
