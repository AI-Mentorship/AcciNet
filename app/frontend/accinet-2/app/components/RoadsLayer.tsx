'use client';

import React from 'react';
import maplibregl from 'maplibre-gl';

type Props = { map: maplibregl.Map };

type RoadFeature = GeoJSON.Feature<GeoJSON.LineString | GeoJSON.MultiLineString, GeoJSON.GeoJsonProperties>;
type FeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.LineString | GeoJSON.MultiLineString,
  GeoJSON.GeoJsonProperties
>;

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://127.0.0.1:8000';

export default class RoadsLayer extends React.Component<Props> {
  private sourceId = 'accinet-roads';
  private layerId = 'accinet-roads-line';
  private highlightSourceId = 'accinet-roads-highlight';
  private highlightLayerId = 'accinet-roads-highlight-line';
  private abortController?: AbortController;
  private popup?: maplibregl.Popup;
  private updateTimer?: number;

  componentDidMount() {
    const { map } = this.props;
    if (!map) return;

    this.ensureSources();
    // Disabled: /roads/bbox endpoint no longer exists in new architecture
    // this.updateRoads();

    // Disabled: No longer listening to map movements to fetch roads
    // map.on('moveend', this.updateRoadsThrottled);
    map.on('click', this.layerId, this.onRoadClick);
    map.on('mouseenter', this.layerId, this.onMouseEnter);
    map.on('mouseleave', this.layerId, this.onMouseLeave);
  }

  componentWillUnmount() {
    const { map } = this.props;
    if (!map) return;

    // map.off('moveend', this.updateRoadsThrottled); // Disabled
    map.off('click', this.layerId, this.onRoadClick);
    map.off('mouseenter', this.layerId, this.onMouseEnter);
    map.off('mouseleave', this.layerId, this.onMouseLeave);

    if (this.abortController) {
      this.abortController.abort();
    }

    this.popup?.remove();

    if (map.getLayer(this.highlightLayerId)) map.removeLayer(this.highlightLayerId);
    if (map.getSource(this.highlightSourceId)) map.removeSource(this.highlightSourceId);
    if (map.getLayer(this.layerId)) map.removeLayer(this.layerId);
    if (map.getSource(this.sourceId)) map.removeSource(this.sourceId);
  }

  private ensureSources() {
    const { map } = this.props;
    if (!map.getSource(this.sourceId)) {
      map.addSource(this.sourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        } satisfies FeatureCollection,
      });
    }

    if (!map.getLayer(this.layerId)) {
      map.addLayer({
        id: this.layerId,
        type: 'line',
        source: this.sourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': 'rgba(148, 163, 254, 0.75)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.7, 10, 1.4, 14, 2.5],
          'line-opacity': 0.9,
        },
      });
    }

    if (!map.getSource(this.highlightSourceId)) {
      map.addSource(this.highlightSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        } satisfies FeatureCollection,
      });
    }

    if (!map.getLayer(this.highlightLayerId)) {
      map.addLayer({
        id: this.highlightLayerId,
        type: 'line',
        source: this.highlightSourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': 'rgba(96, 165, 250, 0.95)',
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.4, 10, 2.1, 14, 4],
          'line-opacity': 0.95,
        },
      });
    }
  }

  private updateRoadsThrottled = () => {
    if (this.updateTimer) {
      window.clearTimeout(this.updateTimer);
    }
    this.updateTimer = window.setTimeout(() => {
      this.updateRoads();
      this.updateTimer = undefined;
    }, 250);
  };

  private updateRoads = async () => {
    const { map } = this.props;
    if (!map || !map.isStyleLoaded()) return;

    const bounds = map.getBounds();
    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();

    const params = new URLSearchParams({
      south: southWest.lat.toString(),
      west: southWest.lng.toString(),
      north: northEast.lat.toString(),
      east: northEast.lng.toString(),
    });

    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    try {
      const response = await fetch(`${BACKEND_BASE}/roads/bbox?${params.toString()}`, {
        signal: this.abortController.signal,
      });
      if (!response.ok) {
        // Endpoint no longer exists - silently handle 404
        if (response.status === 404) {
          // Clear any existing road data since endpoint is not available
          const source = map.getSource(this.sourceId) as maplibregl.GeoJSONSource | undefined;
          if (source) {
            source.setData({
              type: 'FeatureCollection',
              features: [],
            } satisfies FeatureCollection);
          }
          return;
        }
        // Log other errors
        console.error('Failed to fetch roads:', response.status, await response.text());
        return;
      }
      const data = (await response.json()) as FeatureCollection;
      const source = map.getSource(this.sourceId) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(data);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      // Network errors (fetch doesn't throw on 404, only network errors reach here)
      console.error('Error fetching roads:', error);
    }
  };

  private onRoadClick = async (event: maplibregl.MapLayerMouseEvent) => {
    const { map } = this.props;
    const feature = event.features?.[0];
    if (!map || !feature) return;

    const highlight: RoadFeature = {
      type: 'Feature',
      geometry: feature.geometry as RoadFeature['geometry'],
      properties: { ...(feature.properties ?? {}) },
    };

    const highlightSource = map.getSource(this.highlightSourceId) as maplibregl.GeoJSONSource | undefined;
    if (highlightSource) {
      highlightSource.setData({
        type: 'FeatureCollection',
        features: [highlight],
      } satisfies FeatureCollection);
    }

    await this.showPopup(event.lngLat, highlight);
  };

  private showPopup = async (lngLat: maplibregl.LngLat, feature: RoadFeature) => {
    const { map } = this.props;
    const props = feature.properties ?? {};

    let popupHtml = `
      <div class="text-sm">
        <div class="font-semibold text-base mb-1">${props.name ?? props.ref ?? 'Unnamed road'}</div>
        <div class="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 text-xs text-gray-300">
          <span class="uppercase tracking-wide text-[10px] text-gray-500">Type</span><span>${props.fclass ?? '—'}</span>
          <span class="uppercase tracking-wide text-[10px] text-gray-500">Speed</span><span>${props.maxspeed ?? '—'}</span>
          <span class="uppercase tracking-wide text-[10px] text-gray-500">Direction</span><span>${props.oneway ? 'One way' : 'Two way'}</span>
        </div>
        <div class="mt-2 text-xs text-gray-400">Loading live conditions…</div>
      </div>
    `;

    this.popup?.remove();
    this.popup = new maplibregl.Popup({ closeButton: true, maxWidth: '320px' })
      .setLngLat(lngLat)
      .setHTML(popupHtml)
      .addTo(map);

    try {
      const infoResponse = await fetch(
        `${BACKEND_BASE}/roads/info?lat=${lngLat.lat.toFixed(5)}&lon=${lngLat.lng.toFixed(5)}`
      );
      if (!infoResponse.ok) {
        console.error('Failed to fetch road info:', infoResponse.status, await infoResponse.text());
        return;
      }
      const infoData = await infoResponse.json();
      const road = infoData.road ?? {};
      const weather = infoData.weather ?? {};

      popupHtml = `
        <div class="text-sm">
          <div class="font-semibold text-base mb-1">${road.name ?? props.name ?? 'Unnamed road'}</div>
          <div class="grid grid-cols-[auto,1fr] gap-x-2 gap-y-1 text-xs text-gray-300">
            <span class="uppercase tracking-wide text-[10px] text-gray-500">Type</span><span>${road.road_type ?? props.fclass ?? '—'}</span>
            <span class="uppercase tracking-wide text-[10px] text-gray-500">Speed</span><span>${road.maxspeed ?? props.maxspeed ?? '—'}</span>
            <span class="uppercase tracking-wide text-[10px] text-gray-500">Direction</span><span>${road.oneway ? 'One way' : 'Two way'}</span>
            <span class="uppercase tracking-wide text-[10px] text-gray-500">Surface</span><span>${road.surface ?? '—'}</span>
            <span class="uppercase tracking-wide text-[10px] text-gray-500">Condition</span><span>${road.condition ?? '—'}</span>
          </div>
          <div class="mt-3">
            <p class="uppercase tracking-[0.15em] text-[10px] text-gray-500 mb-1">Weather</p>
            <div class="rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-gray-200">
              <div>${weather.summary ?? 'Unavailable'}</div>
              <div class="mt-1 grid grid-cols-2 gap-2">
                <div>Temp: ${weather.temperature !== undefined ? `${weather.temperature}°C` : '—'}</div>
                <div>Wind: ${
                  weather.windspeed !== undefined ? `${weather.windspeed} km/h` : '—'
                }</div>
              </div>
              ${
                weather.time
                  ? `<div class="mt-1 text-[10px] text-gray-500">Updated ${new Date(weather.time).toLocaleTimeString()}</div>`
                  : ''
              }
            </div>
          </div>
        </div>
      `;

      this.popup?.setHTML(popupHtml);
    } catch (error) {
      console.error('Failed to load road info:', error);
    }
  };

  private onMouseEnter = () => {
    this.props.map.getCanvas().style.cursor = 'pointer';
  };

  private onMouseLeave = () => {
    this.props.map.getCanvas().style.cursor = '';
  };

  render() {
    return null;
  }
}
