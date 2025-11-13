'use client';

import React from 'react';
import maplibregl from 'maplibre-gl';
import type { HistoricalCellRecord } from '../lib/historicalData';

type Props = {
  map: maplibregl.Map;
  enabled: boolean;
  data: HistoricalCellRecord[];
  radiusPx?: number;
  opacity?: number;
};

type State = {
  maxDensity: number;
};

export default class HistoricalCrashDensityLayer extends React.Component<Props, State> {
  private uid = Math.random().toString(36).slice(2, 8);
  private sourceId = `historical-crash-heat-src-${this.uid}`;
  private layerId = `historical-crash-heat-${this.uid}`;
  private raf?: number;

  state: State = {
    maxDensity: 1,
  };

  private onMoveEnd = () => this.scheduleUpdate();
  private onZoomEnd = () => this.scheduleUpdate();
  private onStyleLoad = () => this.scheduleUpdate(true);


  componentDidUpdate(prev: Props) {
    const { enabled, data, map } = this.props;
    if (!enabled) {
      this.teardown();
      return;
    }
    if (prev.enabled !== enabled || prev.data !== data) {
      // Recalculate max density when data changes using reduce to avoid stack overflow
      const maxDensity =
        data.length > 0
          ? data.reduce((max, r) => Math.max(max, r.crash_density), data[0].crash_density)
          : 1;
      if (maxDensity !== this.state.maxDensity) {
        this.setState({ maxDensity }, () => this.scheduleUpdate(true));
      } else {
        this.scheduleUpdate(true);
      }
    }
  }

  componentDidMount() {
    const { data } = this.props;
    // Use reduce to avoid stack overflow with large datasets
    const maxDensity =
      data.length > 0
        ? data.reduce((max, r) => Math.max(max, r.crash_density), data[0].crash_density)
        : 1;
    if (maxDensity !== this.state.maxDensity) {
      this.setState({ maxDensity });
    }

    const { map } = this.props;
    map.on('load', this.onStyleLoad);
    map.on('style.load', this.onStyleLoad);
    map.on('moveend', this.onMoveEnd);
    map.on('zoomend', this.onZoomEnd);
    this.scheduleUpdate(true);
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
    const { map, enabled, data } = this.props;
    if (!enabled || !map.isStyleLoaded() || !data.length) return;

    this.ensureLayer();

    const src = map.getSource(this.sourceId) as maplibregl.GeoJSONSource | undefined;
    if (!src) return;

    const features = this.buildFeatures();
    src.setData({ type: 'FeatureCollection', features });

    if (map.getLayer(this.layerId)) map.moveLayer(this.layerId);
  }

  private ensureLayer() {
    const { map, radiusPx = 50, opacity = 0.7 } = this.props;

    if (!map.getSource(this.sourceId)) {
      map.addSource(this.sourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }

    if (!map.getLayer(this.layerId)) {
      // Normalize density to 0-1 range for heatmap weight
      const maxDensity = this.state.maxDensity || 1;
      const normDensity: any = [
        'min',
        1,
        [
          'max',
          0,
          [
            '/',
            ['to-number', ['get', 'density'], 0],
            maxDensity,
          ],
        ],
      ];

      map.addLayer({
        id: this.layerId,
        type: 'heatmap',
        source: this.sourceId,
        paint: {
          'heatmap-weight': normDensity,
          'heatmap-radius': radiusPx,
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, 0.8, 10, 1.1, 14, 1.5],
          'heatmap-opacity': opacity,
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0.0,
            'rgba(0,0,0,0)',
            0.1,
            '#0ea5e9',
            0.25,
            '#22d3ee',
            0.4,
            '#60a5fa',
            0.55,
            '#facc15',
            0.7,
            '#f97316',
            0.85,
            '#ef4444',
            1.0,
            '#dc2626',
          ],
        },
      });
    } else {
      // Update opacity and radius if changed
      map.setPaintProperty(this.layerId, 'heatmap-opacity', opacity);
      if (radiusPx !== undefined) {
        map.setPaintProperty(this.layerId, 'heatmap-radius', radiusPx);
      }
      // Update heatmap weight if max density changed
      const maxDensity = this.state.maxDensity || 1;
      const normDensity: any = [
        'min',
        1,
        [
          'max',
          0,
          [
            '/',
            ['to-number', ['get', 'density'], 0],
            maxDensity,
          ],
        ],
      ];
      map.setPaintProperty(this.layerId, 'heatmap-weight', normDensity);
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

  private buildFeatures() {
    const { data } = this.props;
    if (!data.length) return [];

    return data.map((record) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [record.cell_center_lon, record.cell_center_lat] as [number, number],
      },
      properties: {
        density: record.crash_density,
        cell_id: record.cell_id,
        year: record.year,
      },
    }));
  }
}

