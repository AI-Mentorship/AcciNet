'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import { geocodeAddress, getCurrentLocation, fetchRoutesGoogle, type GoogleRoute } from '../lib/routes';

type Props = {
  map: maplibregl.Map;
  googleKey: string;
  onRoutes: (routes: GoogleRoute[]) => void;
  maptilerKey?: string;
  onResetRoutes?: () => void;
};

type Place = {
  label: string;
  coords: [number, number];
  bbox?: [number, number, number, number];
};

type State = {
  originText: string;
  destText: string;
  originResults: Place[];
  destResults: Place[];
  originSel?: Place | null;
  destSel?: Place | null;
  openField?: 'origin' | 'dest';
  originIdx: number;
  destIdx: number;
  usingMyLocation: boolean;
  loading: boolean;
  searching: boolean;
  collapsed: boolean;
  error?: string;
};

const createDefaultState = (): State => ({
  originText: '',
  destText: '',
  originResults: [],
  destResults: [],
  originSel: null,
  destSel: null,
  openField: undefined,
  originIdx: -1,
  destIdx: -1,
  usingMyLocation: true,
  loading: false,
  searching: false,
  collapsed: false,
});

export default class RouteBox extends React.Component<Props, State> {
  private originMarker?: maplibregl.Marker;
  private destMarker?: maplibregl.Marker;

  state: State = createDefaultState();

  private debounceOrigin?: number;
  private debounceDest?: number;

  private async markCurrentLocation() {
    try {
      const { map } = this.props;
      const loc = await getCurrentLocation();
      this.originMarker?.remove();
      this.originMarker = new maplibregl.Marker({ color: '#60a5fa' })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);
      map.flyTo({ center: [loc.lng, loc.lat], zoom: 12 });
    } catch {
      /* ignore */
    }
  }

  componentDidMount() {
    document.addEventListener('click', this.onDocClick, true);
    if (this.state.usingMyLocation) this.markCurrentLocation();
  }
  componentWillUnmount() {
    if (this.debounceOrigin) clearTimeout(this.debounceOrigin);
    if (this.debounceDest) clearTimeout(this.debounceDest);
    document.removeEventListener('click', this.onDocClick, true);
    this.originMarker?.remove();
    this.destMarker?.remove();
  }

  private onDocClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const wrap = document.getElementById('rbx-wrap');
    if (wrap && target && !wrap.contains(target)) {
      this.setState({ openField: undefined, originIdx: -1, destIdx: -1 });
    }
  };

  private scheduleSearch(field: 'origin' | 'dest', q: string) {
    const updates: Partial<State> =
      field === 'origin'
        ? { originText: q, originSel: null, openField: 'origin', originIdx: -1 }
        : { destText: q, destSel: null, openField: 'dest', destIdx: -1 };
    this.setState({ ...updates, searching: !!q.trim() } as any);

    if (!q.trim()) {
      this.setState((field === 'origin' ? { originResults: [] } : { destResults: [] }) as any);
      return;
    }
    const run = () => this.search(field, q);
    if (field === 'origin') {
      if (this.debounceOrigin) clearTimeout(this.debounceOrigin);
      this.debounceOrigin = window.setTimeout(run, 300);
    } else {
      if (this.debounceDest) clearTimeout(this.debounceDest);
      this.debounceDest = window.setTimeout(run, 300);
    }
  }

  private async search(field: 'origin' | 'dest', q: string) {
    const key = this.props.maptilerKey;
    if (!key || !q.trim()) return;

    try {
      const c = this.props.map.getCenter();
      const params = new URLSearchParams({
        key: key!,
        limit: '6',
        proximity: `${c.lng},${c.lat}`,
        country: 'us',
      });
      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const results: Place[] = (data.features ?? []).map((f: any) => ({
        label: f.place_name || f.text || f.properties?.name || 'Unknown place',
        coords: (f.center as [number, number]) ?? (f.geometry?.coordinates as [number, number]) ?? [0, 0],
        bbox: f.bbox,
      }));

      if (field === 'origin') {
        this.setState({ originResults: results, openField: 'origin', searching: false });
      } else {
        this.setState({ destResults: results, openField: 'dest', searching: false });
      }
    } catch {
      /* ignore */
    } finally {
      this.setState({ searching: false });
    }
  }

  private selectPlace(field: 'origin' | 'dest', p: Place) {
    const { map } = this.props;
    if (!map.isStyleLoaded()) {
      map.once('load', () => this.selectPlace(field, p));
      return;
    }

    if (field === 'origin') {
      this.originMarker?.remove();
      this.originMarker = new maplibregl.Marker({ color: '#60a5fa' }).setLngLat(p.coords).addTo(map);
    } else {
      this.destMarker?.remove();
      this.destMarker = new maplibregl.Marker({ color: '#f87171' }).setLngLat(p.coords).addTo(map);
    }

    if (p.bbox) {
      const b = new maplibregl.LngLatBounds([p.bbox[0], p.bbox[1]], [p.bbox[2], p.bbox[3]]);
      map.fitBounds(b, { padding: 60, duration: 600 });
    } else {
      map.flyTo({ center: p.coords, zoom: 12, duration: 600 });
    }

    this.setState((prev) => ({
      ...prev,
      ...(field === 'origin'
        ? { originText: p.label, originSel: p, originResults: [], openField: undefined }
        : { destText: p.label, destSel: p, destResults: [], openField: undefined }),
    }));
  }

  private onKeyDown(field: 'origin' | 'dest', e: React.KeyboardEvent<HTMLInputElement>) {
    const list = field === 'origin' ? this.state.originResults : this.state.destResults;
    const idxKey = field === 'origin' ? 'originIdx' : 'destIdx';
    const idx = field === 'origin' ? this.state.originIdx : this.state.destIdx;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = list.length ? (idx + 1 + list.length) % list.length : -1;
      this.setState({ [idxKey]: next } as any);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = list.length ? (idx - 1 + list.length) % list.length : -1;
      this.setState({ [idxKey]: prev } as any);
    } else if (e.key === 'Enter') {
      if (idx >= 0 && list[idx]) this.selectPlace(field, list[idx]);
      else this.search(field, field === 'origin' ? this.state.originText : this.state.destText);
    } else if (e.key === 'Escape') {
      this.setState({ openField: undefined, [idxKey]: -1 } as any);
    }
  }

  private async compute() {
    const { googleKey, onRoutes } = this.props;
    const { usingMyLocation, originText, destText, originSel, destSel } = this.state;

    try {
      this.setState({ loading: true, error: undefined });

      let originLL: { lat: number; lng: number } | null = null;
      if (usingMyLocation) {
        try {
          originLL = await getCurrentLocation();
        } catch (err: any) {
          this.setState({
            usingMyLocation: false,
            error: 'Chrome requires HTTPS for location. Enter an origin manually or run over HTTPS.',
            loading: false,
          });
          return;
        }
      } else {
        originLL = originSel
          ? { lat: originSel.coords[1], lng: originSel.coords[0] }
          : await geocodeAddress(originText, googleKey);
      }

      if (!originLL) throw new Error(usingMyLocation ? 'Location blocked' : 'Origin not found');

      if (usingMyLocation) {
        this.originMarker?.remove();
        this.originMarker = new maplibregl.Marker({ color: '#60a5fa' })
          .setLngLat([originLL.lng, originLL.lat])
          .addTo(this.props.map);
      }

      const destLL = destSel
        ? { lat: destSel.coords[1], lng: destSel.coords[0] }
        : await geocodeAddress(destText, googleKey);

      if (!destLL) throw new Error('Destination not found');

      const routes = await fetchRoutesGoogle(originLL, destLL, googleKey);
      if (!routes.length) throw new Error('No routes found');
      onRoutes(routes);
    } catch (e: any) {
      this.setState({ error: e?.message || 'Failed' });
    } finally {
      this.setState({ loading: false });
    }
  }

  private toggleCollapsed = () => {
    this.setState((s) => ({
      collapsed: !s.collapsed,
      openField: undefined,
      originIdx: -1,
      destIdx: -1,
    }));
  };

  private resetRoutes = () => {
    this.props.onResetRoutes?.();
    if (this.debounceOrigin) {
      clearTimeout(this.debounceOrigin);
      this.debounceOrigin = undefined;
    }
    if (this.debounceDest) {
      clearTimeout(this.debounceDest);
      this.debounceDest = undefined;
    }
    this.originMarker?.remove();
    this.destMarker?.remove();
    this.originMarker = undefined;
    this.destMarker = undefined;
    this.setState(createDefaultState(), () => {
      if (this.state.usingMyLocation) this.markCurrentLocation();
    });
  };

  render() {
    const {
      originText,
      destText,
      originResults,
      destResults,
      usingMyLocation,
      loading,
      searching,
      openField,
      originIdx,
      destIdx,
      collapsed,
    } = this.state;

    const ui = (
      <div
        id="rbx-wrap"
        className="fixed top-4 left-4 w-[440px] z-[2147483647] pointer-events-none font-sans"
      >
        {/* FAB when collapsed */}
        <button
          type="button"
          className={`fixed top-4 left-4 inline-flex items-center gap-2 px-3 py-2 glass-button pointer-events-auto text-sm font-medium transition-all duration-[220ms] ${
            collapsed ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[.96] opacity-0 pointer-events-none'
          }`}
          onClick={this.toggleCollapsed}
          aria-label="Expand search"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <span className="font-semibold">Search</span>
        </button>

        {/* Main box */}
        <div
          className={`pointer-events-auto glass-panel glass-panel--strong rounded-[20px] p-2.5 px-3 flex flex-col gap-2 w-[420px] text-gray-100 relative transition-all duration-[220ms] ${
            collapsed ? 'translate-y-[-8px] scale-[.96] opacity-0 pointer-events-none' : 'translate-y-0 scale-100 opacity-100'
          }`}
          role="group"
          aria-label="AcciNet routing"
        >
          <div className="flex items-center justify-between px-0.5 pb-1">
            <h3 className="text-sm font-semibold m-0 text-white opacity-95">Route</h3>
            <div className="flex gap-1.5">
              <button
                type="button"
                className="w-[26px] h-[26px] flex items-center justify-center rounded-full border border-red-500/45 bg-transparent text-red-400 cursor-pointer transition-all hover:bg-red-500/12 hover:text-white hover:border-red-500/70 active:translate-y-[1px]"
                onClick={this.resetRoutes}
                aria-label="Clear routes"
              >
                ✕
              </button>
              <button
                type="button"
                className="w-[26px] h-[26px] flex items-center justify-center rounded-full border border-white/16 bg-white/6 text-gray-400 cursor-pointer transition-all hover:bg-white/12 hover:text-white hover:border-white/22 active:translate-y-[1px]"
                onClick={this.toggleCollapsed}
                aria-label="Minimize"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="6" y1="12" x2="18" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Origin */}
          <div className="relative flex items-center">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] z-[2] pointer-events-auto cursor-pointer"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill={usingMyLocation ? '#60a5fa' : 'none'}
              stroke={usingMyLocation ? '#60a5fa' : '#cbd5e1'}
              strokeWidth={2}
              onClick={() =>
                this.setState(
                  (s) => ({
                    usingMyLocation: !s.usingMyLocation,
                    openField: !s.usingMyLocation ? undefined : 'origin',
                    originResults: !s.usingMyLocation ? [] : s.originResults,
                    originIdx: -1,
                  }),
                  async () => {
                    if (this.state.usingMyLocation) await this.markCurrentLocation();
                    else this.originMarker?.remove();
                  }
                )
              }
            >
              <circle cx="12" cy="12" r="2" />
              <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.535-7.535-1.414 1.414M6.879 17.121l-1.414 1.414m0-12.97 1.414 1.414m10.242 10.242 1.414 1.414" />
            </svg>

            <input
              className={`relative z-[1] w-full box-border border border-white/16 outline-none text-[15px] py-2.5 px-10 rounded-xl bg-white/6 transition-colors placeholder:text-white/55 focus:border-indigo-500/60 focus:bg-white/8 disabled:opacity-50 ${
                usingMyLocation ? 'text-blue-300 cursor-default' : 'text-gray-100 cursor-text'
              }`}
              placeholder="Start or search location"
              value={usingMyLocation ? 'My location' : originText}
              onChange={(e) => this.scheduleSearch('origin', e.target.value)}
              onFocus={() => !usingMyLocation && this.setState({ openField: 'origin' })}
              onKeyDown={(e) => this.onKeyDown('origin', e)}
              disabled={usingMyLocation}
            />

            {(usingMyLocation || originText) && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-white/6 border border-white/16 text-gray-400 cursor-pointer hover:text-white hover:bg-white/12 z-[2]"
                onClick={() => {
                  if (usingMyLocation) {
                    this.originMarker?.remove();
                    this.setState({
                      usingMyLocation: false,
                      originText: '',
                      originResults: [],
                      openField: 'origin',
                      originIdx: -1,
                    });
                  } else {
                    this.setState({
                      originText: '',
                      originResults: [],
                      openField: undefined,
                      originIdx: -1,
                    });
                  }
                }}
                aria-label="Clear origin"
              >
                <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            {openField === 'origin' && originResults.length > 0 && !usingMyLocation && (
              <div className="absolute z-[3] top-[calc(100%+6px)] left-0 right-0 bg-[rgba(10,12,16,.98)] border border-white/12 rounded-xl shadow-[0_18px_48px_rgba(0,0,0,.5)] max-h-[280px] overflow-y-auto no-scrollbar" onMouseDown={(e) => e.preventDefault()}>
                {originResults.map((r, i) => (
                  <div
                    key={i}
                    className={`px-3 py-2.5 cursor-pointer text-sm text-gray-200 hover:bg-indigo-500/14 hover:text-white ${
                      i === originIdx ? 'bg-indigo-500/14 text-white' : ''
                    }`}
                    onClick={() => this.selectPlace('origin', r)}
                  >
                    {r.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Destination */}
          <div className="relative flex items-center">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] z-[2]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>

            <input
              className="relative z-[1] w-full box-border border border-white/16 outline-none text-[15px] py-2.5 px-10 rounded-xl bg-white/6 text-gray-100 transition-colors placeholder:text-white/55 focus:border-indigo-500/60 focus:bg-white/8"
              placeholder="Destination"
              value={destText}
              onChange={(e) => this.scheduleSearch('dest', e.target.value)}
              onFocus={() => this.setState({ openField: 'dest' })}
              onKeyDown={(e) => this.onKeyDown('dest', e)}
            />

            {destText && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-white/6 border border-white/16 text-gray-400 cursor-pointer hover:text-white hover:bg-white/12 z-[2]"
                onClick={() =>
                  this.setState({
                    destText: '',
                    destResults: [],
                    openField: undefined,
                    destIdx: -1,
                  })
                }
                aria-label="Clear destination"
              >
                <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" width="16" height="16">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}

            {openField === 'dest' && (
              <div className="absolute z-[3] top-[calc(100%+6px)] left-0 right-0 bg-[rgba(10,12,16,.98)] border border-white/12 rounded-xl shadow-[0_18px_48px_rgba(0,0,0,.5)] max-h-[280px] overflow-y-auto no-scrollbar" onMouseDown={(e) => e.preventDefault()}>
                {destResults.length > 0 ? (
                  destResults.map((r, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2.5 cursor-pointer text-sm text-gray-200 hover:bg-indigo-500/14 hover:text-white ${
                        i === destIdx ? 'bg-indigo-500/14 text-white' : ''
                      }`}
                      onClick={() => this.selectPlace('dest', r)}
                    >
                      {r.label}
                    </div>
                  ))
                ) : searching ? (
                  <div className="px-3 py-2.5 flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/16 border-t-indigo-400 rounded-full animate-spin" />
                    Searching…
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <button
            className="self-start px-4 py-2.5 rounded-xl border border-white/16 bg-indigo-500/18 text-white cursor-pointer text-sm transition-all hover:bg-indigo-500/26 hover:border-white/22 active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => this.compute()}
            disabled={loading || (!usingMyLocation && !originText) || !destText}
          >
            {loading ? 'Routing...' : 'Get routes'}
          </button>
        </div>
      </div>
    );

    const body = typeof document !== 'undefined' ? document.body : null;
    return body ? createPortal(ui, body) : ui;
  }
}

