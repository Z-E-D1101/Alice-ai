import React, { useEffect, useRef, useState } from 'react';
import { SelfLearningItem, MemoryItem } from '../types.js';

interface InteractiveNeuronNetworkProps {
  learnings: SelfLearningItem[];
  memories: MemoryItem[];
}

interface NeuronNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  label: string;
  type: 'learning' | 'memory' | 'latent';
  glowIntensity: number;
  pulsePhase: number;
}

export function InteractiveNeuronNetwork({ learnings = [], memories = [] }: InteractiveNeuronNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<NeuronNode | null>(null);
  
  // Track high-level pulse trigger when learnings or memories grow
  const prevLearningsCount = useRef(learnings.length);
  const prevMemoriesCount = useRef(memories.length);
  const brainPulse = useRef(0.0); // 0.0 to 1.0 peak decay

  // Keep track of mouse coordinates
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = canvas.width = canvas.offsetWidth || 500;
    let height = canvas.height = canvas.offsetHeight || 300;

    // Handle size adjustments cleanly
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          width = canvas.width = entry.contentRect.width;
          height = canvas.height = entry.contentRect.height;
        }
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initialize 30 nodes (neurons)
    const nodes: NeuronNode[] = [];
    
    // Mix actual items + latent background nodes
    const maxItems = 15;
    const itemsToShow: { label: string; type: 'learning' | 'memory' }[] = [];
    
    learnings.slice(0, 8).forEach(l => {
      itemsToShow.push({ label: l.title, type: 'learning' });
    });
    memories.slice(0, 7).forEach(m => {
      itemsToShow.push({ label: m.text.slice(0, 24) + (m.text.length > 24 ? '...' : ''), type: 'memory' });
    });

    const nodeCount = 35;
    for (let i = 0; i < nodeCount; i++) {
      let label = '';
      let type: 'learning' | 'memory' | 'latent' = 'latent';
      
      if (i < itemsToShow.length) {
        label = itemsToShow[i].label;
        type = itemsToShow[i].type;
      } else {
        // Latent cognitive nodes
        const latentLabels = [
          'Synaptic Router', 'NLP Parser', 'Core VM Kernel', 
          'Scheduler Cron', 'Discord Gateway', 'Telegram Port', 
          'Hermes Logic Interface', 'Memory Ledger', 'Drizzle ORM Hook',
          'Context Buffer'
        ];
        label = latentLabels[i % latentLabels.length] + ' #' + i;
        type = 'latent';
      }

      nodes.push({
        id: `neu-node-${i}`,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: type === 'latent' ? 3 : type === 'learning' ? 6 : 5,
        label,
        type,
        glowIntensity: type === 'latent' ? 0.3 : 0.8,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }

    // Handle pulse propagation on database update
    if (learnings.length > prevLearningsCount.current || memories.length > prevMemoriesCount.current) {
      brainPulse.current = 1.0; // trigger full glowing wave
      prevLearningsCount.current = learnings.length;
      prevMemoriesCount.current = memories.length;
    }

    // Mouse events
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
      mouseRef.current.active = false;
      setHoveredNode(null);
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    // Animation Tick
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Decelerate general brain pulse
      if (brainPulse.current > 0.01) {
        brainPulse.current *= 0.96;
      } else {
        brainPulse.current = 0;
      }

      const mouse = mouseRef.current;
      let currentHovered: NeuronNode | null = null;
      const hoverThreshold = 15;

      // 1. Move and update Nodes
      nodes.forEach(node => {
        // Gentle oscillation
        node.pulsePhase += 0.02;
        
        // Base drift
        node.x += node.vx;
        node.y += node.vy;

        // Interaction with mouse (Gravitational / Spring Pull)
        if (mouse.active) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 160) {
            // Pull nodes gently toward the mouse
            const force = (160 - dist) / 160;
            node.x += (dx / dist) * force * 1.5;
            node.y += (dy / dist) * force * 1.5;

            if (dist < hoverThreshold && node.type !== 'latent') {
              currentHovered = node;
            }
          }
        }

        // Bouncing on boundaries
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
        
        // Clamping to screen safety padding
        node.x = Math.max(10, Math.min(width - 10, node.x));
        node.y = Math.max(10, Math.min(height - 10, node.y));
      });

      if (currentHovered !== hoveredNode) {
        setHoveredNode(currentHovered);
      }

      // 2. Draw Connections (Synaptic lines)
      const maxDistance = 110;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.15;
            
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            
            // Highlight connections if any node is high energy (e.g. learning)
            if (n1.type === 'learning' || n2.type === 'learning' || brainPulse.current > 0) {
              const orangeAlpha = alpha * (1 + brainPulse.current * 4);
              ctx.strokeStyle = `rgba(234, 88, 12, ${orangeAlpha})`;
              ctx.lineWidth = 1.2;
            } else {
              ctx.strokeStyle = `rgba(139, 92, 26, ${alpha})`;
              ctx.lineWidth = 0.8;
            }
            ctx.stroke();
          }
        }
      }

      // 3. Draw connection lines from mouse position
      if (mouse.active) {
        nodes.forEach(node => {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.25;
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(node.x, node.y);
            ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        });
      }

      // 4. Draw Nodes
      nodes.forEach(node => {
        const sizeFactor = 1 + Math.sin(node.pulsePhase) * 0.15;
        const radius = node.radius * sizeFactor;

        // Outer Glow/Pulse Ring
        if (node.type === 'learning' || brainPulse.current > 0) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * (1.6 + brainPulse.current * 2), 0, Math.PI * 2);
          ctx.fillStyle = node.type === 'learning' 
            ? `rgba(234, 88, 12, ${0.15 + brainPulse.current * 0.4})` 
            : `rgba(245, 158, 11, ${0.1 + brainPulse.current * 0.3})`;
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);

        // Styling based on node type
        if (node.type === 'learning') {
          ctx.fillStyle = '#ea580c'; // Bright Orange
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ea580c';
        } else if (node.type === 'memory') {
          ctx.fillStyle = '#f59e0b'; // Amber
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#f59e0b';
        } else {
          ctx.fillStyle = '#45352c'; // Dim Latent node
          ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow

        // Render Labels for active knowledge points
        if (node.type !== 'latent') {
          ctx.fillStyle = 'rgba(214, 211, 209, 0.7)';
          ctx.font = '9px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(node.label, node.x, node.y - node.radius - 6);
        }
      });

      // 5. Draw mouse synapse point
      if (mouse.active) {
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ea580c';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ea580c';
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(234, 88, 12, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [learnings, memories]);

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[220px] bg-[#120c09] border border-[#2d231d] rounded-md overflow-hidden shadow-inner flex flex-col justify-between">
      {/* Absolute Header Overlay */}
      <div className="absolute top-3 left-3 bg-[#1a120e]/80 border border-[#2d231d] rounded px-2.5 py-1 text-[9px] font-mono text-amber-500/90 tracking-wider flex items-center space-x-1.5 backdrop-blur-sm z-10 pointer-events-none">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ea580c] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ea580c]"></span>
        </span>
        <span className="uppercase">Alice Cognitive Synapse Network</span>
      </div>

      <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

      {/* Floating details panel on hover */}
      {hoveredNode && (
        <div className="absolute bottom-3 right-3 left-3 md:left-auto bg-[#17110e]/95 border border-amber-600/30 rounded p-2.5 max-w-sm text-[10px] font-mono text-stone-300 shadow-xl backdrop-blur-sm animate-fadeIn z-20">
          <div className="flex items-center justify-between mb-1">
            <span className={`px-1 py-0.2 rounded font-bold uppercase text-[8px] ${
              hoveredNode.type === 'learning' ? 'bg-orange-950/60 text-orange-400 border border-orange-500/20' : 'bg-amber-950/60 text-amber-400 border border-amber-500/20'
            }`}>
              {hoveredNode.type}
            </span>
            <span className="text-stone-500">Live Node Sync</span>
          </div>
          <p className="font-semibold text-stone-100 mb-0.5">{hoveredNode.label}</p>
          <p className="text-stone-400 leading-normal text-[9px]">
            {hoveredNode.type === 'learning' 
              ? 'Self-generated concept processed from recent conversation and task parameters.' 
              : 'User profile preference extracted during dialog evaluation.'}
          </p>
        </div>
      )}

      {/* Empty notification when no items exist */}
      {learnings.length === 0 && memories.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#120c09]/80 pointer-events-none">
          <p className="text-[10px] font-mono text-stone-600 text-center uppercase tracking-wider animate-pulse">
            Initializing Synaptic Projections...<br />
            <span className="text-[8px] font-normal lowercase italic text-stone-700">Chat with Alice to formulate synapses</span>
          </p>
        </div>
      )}
    </div>
  );
}
