'use client';

import { useEffect } from 'react';
import { Sun, Cloud, Hexagon, Layers, Map, Eye } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  showHex: boolean;
  onToggleHex: (v: boolean) => void;
  showGlow: boolean;
  onToggleGlow: (v: boolean) => void;
  showRoadRisk: boolean;
  onToggleRoadRisk: (v: boolean) => void;
  showTraffic: boolean;
  onToggleTraffic: (v: boolean) => void;
  cityGlowRadius: number;
  onCityGlowRadiusChange: (value: number) => void;
  viewMode: 'historical' | 'predictive';
  selectType: 'segment' | 'points';
  onModeChange: (m: 'historical' | 'predictive') => void;
  onSelectTypeChange: (s: 'segment' | 'points') => void;
};

export default function Sidebar({
  open,
  onClose,
  showHex,
  onToggleHex,
  showGlow,
  onToggleGlow,
  showRoadRisk,
  onToggleRoadRisk,
  showTraffic,
  onToggleTraffic,
  cityGlowRadius,
  onCityGlowRadiusChange,
  viewMode,
  selectType,
  onModeChange,
  onSelectTypeChange,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const SwitchIndicator = ({ active }: { active: boolean }) => (
    <div className={`relative w-[42px] h-[22px] rounded-full border border-white/18 transition-all duration-150 ${active ? 'bg-indigo-600/90' : 'bg-white/10'}`}>
      <span
        className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-all duration-150 ${active ? 'left-[22px]' : 'left-[2px]'}`}
      />
    </div>
  );

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/35 backdrop-blur-sm transition-opacity duration-200 z-[2147483646] ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed top-0 right-0 h-screen w-[360px] max-w-[90vw] glass-panel glass-panel--strong text-gray-200 border-l border-white/10 flex flex-col font-sans z-[2147483647] transition-transform duration-[260ms] ease-[cubic-bezier(.22,.61,.36,1)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-between items-center p-3.5 px-4.5 border-b border-white/10 bg-[rgba(18,20,26,.85)] backdrop-blur-xl">
          <div className="font-semibold text-[17px] text-white flex items-center gap-2">
            <Layers size={16} /> AcciNet Settings
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/15 bg-white/6 text-gray-400 w-[26px] h-[26px] flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 p-4 px-4.5 overflow-y-auto animate-[fadein_.3s_ease]">
          {/* Map appearance */}
          <div className="mt-5.5">
            <h3 className="text-[13px] font-semibold tracking-[.6px] uppercase opacity-75 m-0 mb-2 flex items-center gap-1.5">
              <Map size={13} /> Map Appearance
            </h3>
            <div
              className="bg-white/4 border border-white/8 rounded-xl p-2.5 px-3 mb-2.5 flex items-center justify-between px-2.5 py-2 rounded-[10px] bg-white/5 border border-white/10 cursor-pointer transition-colors hover:bg-white/8"
              onClick={() => onToggleHex(!showHex)}
            >
              <span>Hex Risk Grid</span>
              <SwitchIndicator active={showHex} />
            </div>
            <div
              className="bg-white/4 border border-white/8 rounded-xl p-2.5 px-3 mb-2.5 flex items-center justify-between px-2.5 py-2 rounded-[10px] bg-white/5 border border-white/10 cursor-pointer transition-colors hover:bg-white/8"
              onClick={() => onToggleGlow(!showGlow)}
            >
              <span>Circular Risk Gradients</span>
              <SwitchIndicator active={showGlow} />
            </div>
            <div
              className="bg-white/4 border border-white/8 rounded-xl p-2.5 px-3 mb-2.5 flex items-center justify-between px-2.5 py-2 rounded-[10px] bg-white/5 border border-white/10 cursor-pointer transition-colors hover:bg-white/8"
              onClick={() => onToggleRoadRisk(!showRoadRisk)}
            >
              <span className="flex items-center gap-1.5">
                <Eye size={14} /> Interactive Road Risk
              </span>
              <SwitchIndicator active={showRoadRisk} />
            </div>
            <div
              className="bg-white/4 border border-white/8 rounded-xl p-2.5 px-3 mb-2.5 flex items-center justify-between px-2.5 py-2 rounded-[10px] bg-white/5 border border-white/10 cursor-pointer transition-colors hover:bg-white/8"
              onClick={() => onToggleTraffic(!showTraffic)}
            >
              <span className="flex items-center gap-1.5">
                <Cloud size={14} /> Live Traffic Overlay
              </span>
              <SwitchIndicator active={showTraffic} />
            </div>
            <div className="bg-white/4 border border-white/8 rounded-xl p-2.5 px-3 mb-2.5">
              <div className="flex justify-between">
                <span>Circular Glow Radius</span>
                <span className="text-xs opacity-75">{cityGlowRadius}px</span>
              </div>
              <input
                type="range"
                min={40}
                max={220}
                step={5}
                value={cityGlowRadius}
                onChange={(e) => onCityGlowRadiusChange(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>
          </div>

          {/* View modes */}
          <div className="mt-5.5">
            <h3 className="text-[13px] font-semibold tracking-[.6px] uppercase opacity-75 m-0 mb-2 flex items-center gap-1.5">
              <Hexagon size={13} /> View Modes
            </h3>
            <div className="bg-white/4 border border-white/8 rounded-xl p-2.5 px-3 mb-2.5">
              <div className="text-[13px] opacity-85 mb-1">View Type</div>
              <div className="flex gap-1.5 mt-2">
                {['predictive', 'historical'].map((m) => (
                  <button
                    key={m}
                    className={`flex-1 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/7 text-white cursor-pointer font-medium transition-all hover:bg-white/12 ${
                      viewMode === m ? 'bg-indigo-600 border-white/25' : ''
                    }`}
                    onClick={() => onModeChange(m as any)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white/4 border border-white/8 rounded-xl p-2.5 px-3 mb-2.5">
              <div className="text-[13px] opacity-85 mb-1">Selection Mode</div>
              <div className="flex gap-1.5 mt-2">
                {['segment', 'points'].map((s) => (
                  <button
                    key={s}
                    className={`flex-1 px-2.5 py-1.5 rounded-lg border border-white/15 bg-white/7 text-white cursor-pointer font-medium transition-all hover:bg-white/12 ${
                      selectType === s ? 'bg-indigo-600 border-white/25' : ''
                    }`}
                    onClick={() => onSelectTypeChange(s as any)}
                  >
                    {s === 'segment' ? 'Road Segments' : 'Free Points'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Global options */}
          <div className="mt-5.5">
            <h3 className="text-[13px] font-semibold tracking-[.6px] uppercase opacity-75 m-0 mb-2 flex items-center gap-1.5">
              <Sun size={13} /> Global Options
            </h3>
            <div className="bg-white/4 border border-white/8 rounded-xl p-2.5 px-3 mb-2.5">
              <div>Theme</div>
              <select className="w-full mt-2 bg-white/5 border border-white/10 rounded-lg p-2 text-white" defaultValue="dark">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="auto">Auto</option>
              </select>
              <div className="text-xs opacity-65 mt-1">Matches glass UI. Auto follows system.</div>
            </div>
            <div className="bg-white/4 border border-white/8 rounded-xl p-2.5 px-3 mb-2.5">
              <div>Route Opacity</div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                className="w-full mt-1.5"
              />
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400 p-2.5 px-4 border-t border-white/8 text-center opacity-75">
          AcciNet v2 • Build 2025-11
        </div>
      </aside>
    </>
  );
}

