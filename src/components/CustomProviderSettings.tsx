import React from 'react';
import { RefreshCw, Play, AlertCircle, Check } from 'lucide-react';

interface CustomProviderSettingsProps {
  customEndpoint: string;
  setCustomEndpoint: (val: string) => void;
  customApiKey: string;
  setCustomApiKey: (val: string) => void;
  customModels: string[];
  fetchingModels: boolean;
  modelsError: string;
  onCheckModels: () => void;
  modelName: string;
  setModelName: (val: string) => void;
}

export function CustomProviderSettings({
  customEndpoint,
  setCustomEndpoint,
  customApiKey,
  setCustomApiKey,
  customModels,
  fetchingModels,
  modelsError,
  onCheckModels,
  modelName,
  setModelName
}: CustomProviderSettingsProps) {
  return (
    <div className="p-3.5 bg-[#17120e] border border-[#2d231d] rounded-md space-y-3 font-mono text-[11px] text-stone-300">
      <div className="flex items-center space-x-2 border-b border-[#2d231d] pb-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ea580c] animate-pulse"></span>
        <h4 className="font-bold text-[10px] text-[#f5f5f4] uppercase">Custom Endpoint Settings</h4>
      </div>

      <div className="space-y-2.5">
        {/* Endpoint Input */}
        <div>
          <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">API Endpoint Base URL</span>
          <input
            type="text"
            value={customEndpoint}
            onChange={(e) => setCustomEndpoint(e.target.value)}
            placeholder="e.g., http://localhost:11434/v1 or https://api.openrouter.ai/v1"
            className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2 py-1.5 text-stone-200 focus:outline-none focus:border-[#ea580c]/60 font-sans text-xs"
          />
        </div>

        {/* API Key Input */}
        <div>
          <span className="text-stone-500 text-[9px] block mb-0.5 uppercase">Custom API Key (Optional)</span>
          <input
            type="password"
            value={customApiKey}
            onChange={(e) => setCustomApiKey(e.target.value)}
            placeholder="Paste endpoint authorization token..."
            className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2.5 py-1.5 text-stone-200 focus:outline-none focus:border-[#ea580c]/60 font-sans text-xs"
          />
        </div>

        {/* Action Button */}
        <div className="pt-1 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onCheckModels}
            disabled={fetchingModels}
            className="flex-1 py-1.5 bg-[#251d18] hover:bg-[#2d221b] border border-[#3e3026] hover:border-[#ea580c]/40 text-[#f5f5f4] rounded font-bold cursor-pointer transition-all flex items-center justify-center space-x-1.5 text-[9px] uppercase"
          >
            {fetchingModels ? (
              <RefreshCw className="animate-spin" size={10} />
            ) : (
              <Play size={10} />
            )}
            <span>{fetchingModels ? 'Scanning models...' : 'Scan Available Models'}</span>
          </button>
        </div>

        {/* Error Boundary Output */}
        {modelsError && (
          <div className="p-2 bg-rose-950/40 border border-rose-900/40 rounded flex items-start space-x-1.5 text-[9px] text-rose-400">
            <AlertCircle size={12} className="shrink-0 mt-0.5" />
            <span className="break-all">{modelsError}</span>
          </div>
        )}

        {/* Registered Models Dropdown Selector */}
        {customModels.length > 0 && (
          <div className="p-2.5 bg-[#140f0c] rounded border border-[#2d231d] animate-fadeIn">
            <div className="flex items-center space-x-1 text-[9px] text-amber-500 font-bold uppercase mb-1.5">
              <Check size={11} />
              <span>Discovered {customModels.length} compatible models:</span>
            </div>
            
            <span className="text-stone-500 text-[8px] block mb-0.5 uppercase">Select Model Name</span>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full bg-[#1c1410] border border-[#2d231d] rounded px-2 py-1 text-stone-200 focus:outline-none focus:border-[#ea580c]/60 text-[10px]"
            >
              {customModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
