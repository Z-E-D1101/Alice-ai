import React, { useEffect, useRef } from 'react';
import { Brain, Sparkles, RefreshCw } from 'lucide-react';
import { NeuronEvent } from '../types.js';

interface NeuronLiveProps {
  events: NeuronEvent[];
  onClearLogs?: () => void;
}

export function NeuronLive({ events, onClearLogs }: NeuronLiveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eventsCount = events.length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      pulse: number;
      pulseSpeed: number;
    }> = [];

    // Create particles (neurons)
    const particleCount = 30;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 2 + 1.2,
        pulse: Math.random() * Math.PI,
        pulseSpeed: 0.015 + Math.random() * 0.02
      });
    }

    let highEnergyPulse = 0;

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = canvas.offsetWidth;
        height = canvas.height = canvas.offsetHeight;
      }
    };

    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw connection lines
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 90) {
            const alpha = (1 - dist / 90) * (0.12 + (highEnergyPulse * 0.25));
            ctx.strokeStyle = `rgba(234, 88, 12, ${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw particle points
      particles.forEach(p => {
        p.x += p.vx * (1 + highEnergyPulse * 2.5);
        p.y += p.vy * (1 + highEnergyPulse * 2.5);

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        p.pulse += p.pulseSpeed;
        const radius = p.radius + Math.sin(p.pulse) * 0.5;

        ctx.fillStyle = highEnergyPulse > 0.05 ? 'rgba(245, 158, 11, 0.85)' : 'rgba(234, 88, 12, 0.75)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = highEnergyPulse > 0.05 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(234, 88, 12, 0.05)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      if (highEnergyPulse > 0) {
        highEnergyPulse -= 0.01;
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    // Trigger high energy splash when events change
    highEnergyPulse = 1.0;

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
    };
  }, [eventsCount]);

  return (
    <div className="col-span-12 bg-[#17120e] border border-[#2d231d] rounded-md p-4 mb-4 relative overflow-hidden flex flex-col md:flex-row gap-4 h-64 md:h-52 shadow-md">
      {/* Canvas column */}
      <div className="flex-1 relative bg-[#100b08]/50 rounded border border-[#2d231d]/40 overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        
        <div className="absolute top-2.5 left-3 flex items-center space-x-1.5 z-10">
          <Brain size={14} className="text-amber-500 animate-pulse" />
          <span className="font-mono text-[9px] font-bold text-stone-300 tracking-wide uppercase">NEURAL_LEARNING_GRID</span>
        </div>

        <div className="absolute bottom-2.5 left-3 flex items-center space-x-1 z-10">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
          <span className="font-mono text-[8px] text-amber-500 font-medium">● ACTIVE_SYNAPSE_MONITOR</span>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 pointer-events-none">
          <p className="text-[10px] font-mono text-stone-400 text-center uppercase tracking-wider bg-[#100b08]/80 px-2 py-1 rounded border border-[#2d231d]/30">
            {eventsCount === 0 
              ? "Autonomous engine is monitoring dialogues to generate permanent memories & reusable skills..." 
              : `ALICE SYNAPTIC ACTIVITY: ${eventsCount} LEARNING MILESTONES`
            }
          </p>
        </div>
      </div>

      {/* Activity Log list */}
      <div className="w-full md:w-80 flex flex-col h-full min-h-0 bg-[#100b08] rounded border border-[#2d231d] p-2.5 font-mono text-[10px]">
        <div className="flex items-center justify-between border-b border-[#2d231d] pb-1.5 mb-2">
          <span className="font-bold text-stone-400 uppercase tracking-wide">Autonomous Milestones</span>
          {onClearLogs && eventsCount > 0 && (
            <button 
              onClick={onClearLogs}
              className="text-[8px] text-stone-500 hover:text-rose-400 transition-all uppercase cursor-pointer"
            >
              Clear Logs
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {eventsCount === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-600 italic">
              No learning cycles triggered yet.
            </div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="p-1.5 rounded bg-[#1c1410] border border-[#2d231d] flex items-start space-x-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${
                  ev.type === 'memory' ? 'bg-[#ea580c]' :
                  ev.type === 'skill_create' ? 'bg-amber-500' : 'bg-orange-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[8px] text-stone-500 mb-0.5">
                    <span className="font-semibold uppercase truncate mr-2">{ev.type.replace('_', ' ')}</span>
                    <span className="shrink-0">{ev.timestamp.slice(11, 19)}</span>
                  </div>
                  <h4 className="font-bold text-stone-300 truncate">{ev.title}</h4>
                  <p className="text-[9px] text-stone-400 line-clamp-2 leading-relaxed font-sans">{ev.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
