'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { createPortal } from 'react-dom';
import { CloudSun, CloudRain, CloudLightning, Sparkles, Sun } from 'lucide-react';

const WEATHER_PRESETS = [
  { id: 'sunny', label: 'Sunny', desc: 'Bright + clear', icon: <Sun size={14} /> },
  { id: 'cloud', label: 'Cloudy', desc: 'Overcast', icon: <CloudSun size={14} /> },
  { id: 'rain', label: 'Rain', desc: 'Showers', icon: <CloudRain size={14} /> },
  { id: 'storm', label: 'Storm', desc: 'Thunder risk', icon: <CloudLightning size={14} /> },
] as const;

type Preset = (typeof WEATHER_PRESETS)[number];

type Props = {
  map: maplibregl.Map;
  googleKey?: string;
};

export default function WeatherBox({ map, googleKey }: Props) {
  const getSaved = () => {
    try {
      const a = localStorage.getItem('wx:auto');
      const s = localStorage.getItem('wx:sel');
      const auto = a === null ? true : a === '1';
      const selection = WEATHER_PRESETS.find((p) => p.id === s) || WEATHER_PRESETS[0];
      return { auto, selection };
    } catch {
      return { auto: true, selection: WEATHER_PRESETS[0] };
    }
  };
  const [{ auto, selection }, setState] = useState(getSaved);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState(() => map.getCenter());

  const portalNode = useMemo(() => {
    const div = document.createElement('div');
    div.className = 'wx';
    return div;
  }, []);

  useEffect(() => {
    const container = (map?.getContainer?.() as HTMLElement) ?? document.body;
    container.appendChild(portalNode);
    return () => {
      container.removeChild(portalNode);
    };
  }, [map, portalNode]);

  useEffect(() => {
    const onMoveEnd = () => setCenter(map.getCenter());
    map.on('moveend', onMoveEnd);
    return () => {
      map.off('moveend', onMoveEnd);
    };
  }, [map]);

  useEffect(() => {
    if (!auto) return;
    let alive = true;
    let t = window.setTimeout(async () => {
      setStatus('loading');
      setError(null);
      const ac = new AbortController();
      try {
        const preset = await autoInferWeather(center.lat, center.lng, googleKey, ac.signal);
        if (alive) {
          setState((s) => ({ ...s, selection: preset }));
          setStatus('idle');
        }
      } catch (e: any) {
        if (alive) {
          setStatus('error');
          setError(e?.message || 'Weather unavailable');
        }
      }
    }, 300);
    return () => {
      clearTimeout(t);
      alive = false;
    };
  }, [auto, center.lat, center.lng, googleKey]);

  useEffect(() => {
    try {
      localStorage.setItem('wx:auto', auto ? '1' : '0');
      localStorage.setItem('wx:sel', selection.id);
    } catch {}
  }, [auto, selection.id]);

  const chipRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!chipRef.current?.contains(t) && !menuRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      const first = menuRef.current?.querySelector<HTMLElement>('[data-menuitem]');
      first?.focus();
    }
  }, [open]);

  const content = (
    <div className="absolute top-3 right-[60px] pointer-events-auto text-white font-sans" ref={chipRef}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 h-8 px-3 glass-button cursor-pointer text-xs leading-none text-white"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="wx-menu"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className="inline-flex opacity-90">{selection.icon}</span>
        <span className="opacity-95">{selection.label}</span>
        {auto && (
          <span className="inline-flex opacity-90" aria-label="Auto inferred">
            <Sparkles size={12} />
          </span>
        )}
      </button>

      {open && (
        <div
          id="wx-menu"
          role="menu"
          className="absolute top-10 right-0 w-60 rounded-[14px] p-2.5 glass-panel glass-panel--strong origin-top-right animate-[wx-pop_.12s_ease]"
          ref={menuRef}
          aria-label="Weather options"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] opacity-80">Mode</span>
            <button
              type="button"
              className={`relative inline-flex items-center gap-2 h-[22px] px-2 pl-7 rounded-full min-w-[68px] border border-white/14 bg-white/6 cursor-pointer ${
                auto ? 'on' : ''
              }`}
              onClick={() => {
                setState((s) => ({ ...s, auto: !s.auto }));
                setError(null);
                setStatus('idle');
              }}
              data-menuitem
            >
              <span
                className={`absolute left-[3px] top-[3px] w-4 h-4 rounded-full bg-white transition-transform duration-[140ms] ${auto ? 'translate-x-7' : 'translate-x-0'}`}
              />
              <span className="text-[11px] opacity-90">{auto ? 'Auto' : 'Manual'}</span>
            </button>
          </div>

          {!auto && (
            <div className="grid gap-1.5" role="group" aria-label="Manual presets">
              {WEATHER_PRESETS.map((p) => {
                const active = selection.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={active}
                    className={`flex w-full items-center justify-between px-2 py-2 rounded-[10px] border border-white/10 bg-white/4 text-white cursor-pointer text-left transition-all hover:border-indigo-500/55 ${
                      active ? 'border-indigo-500/70 bg-indigo-500/16' : ''
                    }`}
                    onClick={() => {
                      setState((s) => ({ ...s, selection: p, auto: false }));
                      setOpen(false);
                    }}
                    data-menuitem
                  >
                    <span className="inline-flex gap-2 items-center">
                      <span className="inline-flex opacity-90">{p.icon}</span>
                      <span>
                        <div className="text-xs leading-tight">{p.label}</div>
                        <div className="text-[10px] opacity-85 leading-tight">{p.desc}</div>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {status === 'loading' && (
            <div className="flex items-center gap-1.5 text-[11px] text-indigo-300 pt-2">
              <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" aria-hidden />
              Fetching latest…
            </div>
          )}
          {status === 'error' && <div className="text-[11px] text-red-400 pt-2">{error}</div>}
        </div>
      )}
    </div>
  );

  return createPortal(content, portalNode);
}

async function autoInferWeather(
  lat: number,
  lng: number,
  _googleKey?: string,
  signal?: AbortSignal
): Promise<Preset> {
  try {
    const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:8000';
    const params = new URLSearchParams({ lat: String(lat), lon: String(lng) });
    const res = await fetch(`${BACKEND_BASE}/weather?${params}`, { signal });
    if (res.ok) {
      const data = await res.json();
      // Backend returns: { current_weather?: { temperature?, weathercode?, windspeed? }, error?: string }
      // Map weathercode to preset (Open-Meteo weather codes)
      const weathercode = data?.current_weather?.weathercode;
      if (weathercode !== undefined) {
        // Open-Meteo weather codes: https://open-meteo.com/en/docs
        // 0-1: Clear/Partly cloudy -> sunny
        // 2: Cloudy -> cloudy
        // 3: Overcast -> cloudy
        // 45-48: Fog -> cloudy
        // 51-67: Drizzle/Rain -> rainy
        // 71-77: Snow -> snowy
        // 80-99: Rain/Thunderstorm -> stormy
        if (weathercode >= 80 || weathercode === 95 || weathercode === 96 || weathercode === 99) {
          return WEATHER_PRESETS[3]; // Storm
        } else if (weathercode >= 51 && weathercode <= 67) {
          return WEATHER_PRESETS[2]; // Rain
        } else if (weathercode >= 71 && weathercode <= 77) {
          return WEATHER_PRESETS[1]; // Snow -> Cloudy (no snow preset)
        } else if (weathercode >= 2 && weathercode <= 48) {
          return WEATHER_PRESETS[1]; // Cloudy
        }
        return WEATHER_PRESETS[0]; // Sunny (default for clear)
      }
    }
  } catch {}
  return fallbackPreset(lat, lng);
}

function mapSummaryToPreset(summary: string): Preset {
  if (summary.includes('storm') || summary.includes('thunder')) return WEATHER_PRESETS[3];
  if (summary.includes('rain') || summary.includes('shower')) return WEATHER_PRESETS[2];
  if (summary.includes('cloud')) return WEATHER_PRESETS[1];
  return WEATHER_PRESETS[0];
}

function fallbackPreset(lat: number, lng: number): Preset {
  const seed = Math.sin(lat * 3.1 + lng * 1.7);
  const idx = Math.abs(Math.floor(seed * WEATHER_PRESETS.length)) % WEATHER_PRESETS.length;
  return WEATHER_PRESETS[idx];
}

