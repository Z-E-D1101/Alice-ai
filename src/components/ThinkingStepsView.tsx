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
    <div className="mb-2 bg-slate-900/60 border border-slate-800 rounded font-mono text-[10px] text-slate-300 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-slate-800/40 transition-all text-slate-400 font-bold"
      >
        <div className="flex items-center space-x-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          <span className="uppercase tracking-wider">Hermes Thinking Process</span>
          {timeSec !== undefined && (
            <span className="text-[9px] font-normal text-slate-500 bg-slate-950 px-1.5 py-0.2 rounded shrink-0">
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
        <div className="border-t border-slate-900 p-2.5 space-y-2 bg-slate-950/40">
          {steps.map((step, idx) => (
            <div key={step.id || idx} className="flex items-start space-x-2 animate-fadeIn">
              <span className="text-xs select-none">{step.icon || '⚙️'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200 uppercase text-[9px] tracking-wide">
                    {step.title}
                  </span>
                  {step.duration && (
                    <span className="text-[8px] text-emerald-400 font-mono">
                      {step.duration}
                    </span>
                  )}
                </div>
                {step.detail && (
                  <div className="mt-0.5 text-[9px] text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded-sm overflow-x-auto truncate max-w-full">
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
