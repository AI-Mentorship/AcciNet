'use client';

import React from 'react';
import maplibregl from 'maplibre-gl';

type Props = {
  map: maplibregl.Map;
  enabled: boolean;
  radiusPx: number;
};

export default class HeatmapRiskLayer extends React.Component<Props> {
  private uid = Math.random().toString(36).slice(2, 8);
  private sourceId = `risk-heat-src-${this.uid}`;
  private layerId = `risk-heat-${this.uid}`;
  private raf?: number;

  private onMoveEnd = () => this.scheduleUpdate();
  private onZoomEnd = () => this.scheduleUpdate();
  private onStyleLoad = () => this.scheduleUpdate(true);

  componentDidMount() {
    const { map } = this.props;
    map.on('load', this.onStyleLoad);
    map.on('style.load', this.onStyleLoad);
    map.on('moveend', this.onMoveEnd);
    map.on('zoomend', this.onZoomEnd);
    this.scheduleUpdate(true);
  }

  componentDidUpdate(prev: Props) {
    const { enabled, radiusPx, map } = this.props;
    if (!enabled) {
      this.teardown();
      return;
    }
    if (prev.enabled !== enabled) this.scheduleUpdate(true);
    if (prev.radiusPx !== radiusPx && map.getLayer(this.layerId)) {
      map.setPaintProperty(this.layerId, 'heatmap-radius', radiusPx);
      this.scheduleUpdate();
    }
  }

  componentWillUnmount() {
    const { map } = this.props;
    map.off('load', this.onStyleLoad);
    map.off('style.load', this.onStyleLoad);
    map.off('moveend', this.onMoveEnd);
    map.off('zoomend', this.onZoomEnd);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.teardown();
  }

  render() {
    return null;
  }

  private scheduleUpdate(immediate = false) {
    if (this.raf) cancelAnimationFrame(this.raf);
    if (immediate) {
      this.update();
      return;
    }
    this.raf = requestAnimationFrame(() => this.update());
  }

  private update() {
    this.raf = undefined;
    const { map, enabled } = this.props;
    if (!enabled || !map.isStyleLoaded()) return;

    this.ensureLayer();

    const src = map.getSource(this.sourceId) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    const features = this.buildViewportSamples();
    src.setData({ type: 'FeatureCollection', features });

    if (map.getLayer(this.layerId)) map.moveLayer(this.layerId);
  }

  private ensureLayer() {
    const { map, radiusPx } = this.props;

    if (!map.getSource(this.sourceId)) {
      map.addSource(this.sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer(this.layerId)) {
      const normRisk: any = ['min', 1, ['max', 0, ['to-number', ['get', 'risk'], 0]]];

      map.addLayer({
        id: this.layerId,
        type: 'heatmap',
        source: this.sourceId,
        paint: {
          'heatmap-weight': normRisk,
          'heatmap-radius': radiusPx,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.9, 10, 1.2, 14, 1.6],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0.55, 10, 0.65, 14, 0.75],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0.0,
            'rgba(0,0,0,0)',
            0.15,
            '#0ea5e9',
            0.35,
            '#22d3ee',
            0.55,
            '#facc15',
            0.75,
            '#f97316',
            1.0,
            '#ef4444',
          ],
        },
      });
    }
  }

  private teardown() {
    const { map } = this.props;
    try {
      if (map.getLayer(this.layerId)) map.removeLayer(this.layerId);
    } catch {}
    try {
      if (map.getSource(this.sourceId)) map.removeSource(this.sourceId);
    } catch {}
  }

  private buildViewportSamples() {
    const { map, radiusPx } = this.props;
    const canvas = map.getCanvas();
    const w = canvas.width;
    const h = canvas.height;

    const step = Math.max(4, radiusPx * 0.75);

    const feats: any[] = [];
    let row = 0;
    for (let py = 0; py <= h + step; py += step, row++) {
      const offset = row & 1 ? step / 2 : 0;
      for (let px = offset; px <= w + step; px += step) {
        const { lng, lat } = map.unproject([px, py] as [number, number]);
        feats.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [lng, lat] },
          properties: { risk: this.sampleRisk(lng, lat) },
        });
      }
    }
    return feats;
  }

  private sampleRisk(lng: number, lat: number) {
    const seed = Math.sin(lng * 37.21 + lat * 19.17);
    return seed - Math.floor(seed);
  }
}


