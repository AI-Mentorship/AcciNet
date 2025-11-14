'use client';

import React from 'react';
import maplibregl from 'maplibre-gl';
import type { FeatureCollection, LineString, Position } from 'geojson';

type Props = {
  map: maplibregl.Map;
  routeCoords: [number, number][];
  probs: number[];
  idBase?: string;
  highlight?: boolean;
  theme?: 'safe' | 'moderate' | 'risky';
};

export default class RouteGradientLayer extends React.Component<Props> {
  private ids = { src: '', halo: '', grad: '' };
  private onStyleData = () => {
    if (!this.props.map.getSource(this.ids.src)) this.ensure();
  };

  constructor(props: Props) {
    super(props);
    const id = props.idBase ?? `route-${Math.random().toString(36).slice(2, 8)}`;
    this.ids = { src: `${id}-src`, halo: `${id}-halo`, grad: `${id}-grad` };
  }

  private buildGradient(): maplibregl.ExpressionSpecification {
    const stops = 10;
    const expr: any[] = ['interpolate', ['linear'], ['line-progress']];
    for (let i = 0; i <= stops; i++) {
      const t = i / stops;
      const hue = 120 * t;
      expr.push(t, `hsl(${hue}, 80%, 60%)`);
    }
    return expr as maplibregl.ExpressionSpecification;
  }

  private keyOf(coords: [number, number][]) {
    if (!coords || coords.length === 0) return '0';
    const a = coords[0];
    const b = coords[coords.length - 1];
    return `${coords.length}|${a[0]}:${a[1]}|${b[0]}:${b[1]}`;
  }

  private normalizeLngLat(coords: [number, number][]) {
    // Coordinates should already be in [lng, lat] format from routes.ts
    // No transformation needed
    return coords;
  }

  private ensure = () => {
    const { map } = this.props;
    const { src, halo, grad } = this.ids;

    const coords = this.normalizeLngLat(this.props.routeCoords);
    console.log(`[RouteGradientLayer] Ensuring route ${this.ids.src} with ${coords?.length || 0} coordinates`, coords?.[0]);
    if (!coords || coords.length < 2) {
      console.warn(`[RouteGradientLayer] Not enough coordinates for ${this.ids.src}`);
      if (map.getLayer(grad)) map.removeLayer(grad);
      if (map.getLayer(halo)) map.removeLayer(halo);
      if (map.getSource(src)) map.removeSource(src);
      return;
    }

    const fc: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords as Position[] },
        },
      ],
    };

    const s = map.getSource(src) as maplibregl.GeoJSONSource | undefined;
    if (!s) {
      console.log(`[RouteGradientLayer] Adding source ${src}`);
      map.addSource(src, { type: 'geojson', data: fc, lineMetrics: true });
    } else {
      console.log(`[RouteGradientLayer] Updating source ${src}`);
      s.setData(fc);
    }

    if (!map.getLayer(halo)) {
      console.log(`[RouteGradientLayer] Adding halo layer ${halo}`);
      map.addLayer({
        id: halo,
        type: 'line',
        source: src,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#000',
          'line-opacity': 0.25,
          'line-width': 2.2,
        },
      });
    }
    if (!map.getLayer(grad)) {
      console.log(`[RouteGradientLayer] Adding gradient layer ${grad}`);
      map.addLayer({
        id: grad,
        type: 'line',
        source: src,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': 3,
          'line-opacity': 0.9,
          'line-gradient': this.buildGradient(),
        },
      });
    } else {
      console.log(`[RouteGradientLayer] Updating gradient layer ${grad}`);
      map.setPaintProperty(grad, 'line-gradient', this.buildGradient());
    }

    console.log(`[RouteGradientLayer] Moving layers to top`);
    map.moveLayer(halo);
    map.moveLayer(grad);
  };

  componentDidMount() {
    const { map } = this.props;
    const boot = () => this.ensure();
    map.isStyleLoaded() ? boot() : map.once('load', boot);

    this.onStyleData = () => {
      if (!this.props.map.getSource(this.ids.src)) {
        this.ensure();
      } else {
        if (this.props.map.getLayer(this.ids.halo))
          this.props.map.moveLayer(this.ids.halo);
        if (this.props.map.getLayer(this.ids.grad))
          this.props.map.moveLayer(this.ids.grad);
      }
    };
    map.on('styledata', this.onStyleData);
  }

  componentDidUpdate(prev: Props) {
    const prevKey = this.keyOf(prev.routeCoords);
    const nextKey = this.keyOf(this.props.routeCoords);
    const probsChanged =
      prev.probs.length !== this.props.probs.length ||
      prev.probs.some((v, i) => v !== this.props.probs[i]);
    if (prevKey !== nextKey || probsChanged || prev.theme !== this.props.theme) {
      this.ensure();
    }
  }

  componentWillUnmount() {
    const { map } = this.props;
    map.off('styledata', this.onStyleData);
    const { grad, halo, src } = this.ids;
    if (map.getLayer(grad)) map.removeLayer(grad);
    if (map.getLayer(halo)) map.removeLayer(halo);
    if (map.getSource(src)) map.removeSource(src);
  }

  render() {
    return null;
  }
}


