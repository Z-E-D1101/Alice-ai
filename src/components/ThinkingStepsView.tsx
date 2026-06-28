import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ThinkingStep } from '../types.js';

interface ThinkingStepsProps {
  steps: ThinkingStep[];
  timeSec?: number;
  isStreaming?: boolean;
  streamingContent?: string;
}

export function ThinkingStepsView({ steps, timeSec, isStreaming, streamingContent }: ThinkingStepsProps) {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamingContent, isStreaming]);

  if (!steps || steps.length === 0) return null;

  const label = isStreaming
    ? 'Thinking...'
    : timeSec !== undefined
      ? `Thought for ${timeSec}s`
      : 'Thought';

  return (
    <div className="mb-3 rounded-xl border border-[#2a2018] overflow-hidden bg-[#0d0b09] text-xs">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-[#161210] transition-all text-stone-400"
      >
        <div className="flex items-center space-x-2">
          {isStreaming && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ea580c] opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ea580c]"></span>
            </span>
          )}
          <span className="font-medium text-stone-300">{label}</span>
        </div>
        <div className="flex items-center space-x-1 text-stone-600">
          <span className="text-[10px]">{isOpen ? 'hide' : 'show'}</span>
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-[#2a2018]">
          {/* Streaming thinking content (DeepSeek style) */}
          {(isStreaming || streamingContent) && (
            <div
              ref={contentRef}
              className="px-4 py-3 max-h-52 overflow-y-auto custom-scrollbar"
            >
              <p className="font-mono text-[11px] text-stone-500 italic leading-relaxed whitespace-pre-wrap">
                {streamingContent || (isStreaming ? '' : '')}
                {isStreaming && (
                  <span className="inline-block w-1 h-3 bg-stone-600 animate-pulse align-middle ml-0.5" />
                )}
              </p>
            </div>
          )}

          {/* Step list */}
          {!streamingContent && steps.length > 0 && (
            <div className="px-3.5 py-3 space-y-2">
              {steps.map((step, idx) => (
                <div key={step.id || idx} className="flex items-start space-x-2.5">
                  <span className="text-xs mt-0.5 select-none shrink-0">{step.icon || '⚙️'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-stone-300 text-[11px]">{step.title}</span>
                      {step.duration && (
                        <span className="text-[10px] text-amber-600 font-mono shrink-0">{step.duration}</span>
                      )}
                    </div>
                    {step.detail && (
                      <div className="mt-0.5 text-[10px] text-stone-600 font-mono truncate max-w-full">{step.detail}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
