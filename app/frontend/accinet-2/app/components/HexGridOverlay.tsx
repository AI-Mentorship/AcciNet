'use client';

import React from 'react';
import maplibregl from 'maplibre-gl';

type Props = {
  map: maplibregl.Map;
  enabled: boolean;
  cellMeters?: number;
  opacity?: number;
  mask?: any;
  extentScale?: number;
  clipToMask?: boolean;
};

export default class HexRiskLayer extends React.Component<Props> {
  private srcId = 'hex-risk-src';
  private fillId = 'hex-risk-fill';
  private lineId = 'hex-risk-line';
  private boundSync = () => this.sync();

  componentDidMount() {
    this.sync();
    this.props.map.on('moveend', this.boundSync);
    this.props.map.on('zoomend', this.boundSync);
  }

  componentDidUpdate(prev: Props) {
    if (
      prev.enabled !== this.props.enabled ||
      prev.cellMeters !== this.props.cellMeters ||
      prev.opacity !== this.props.opacity
    ) {
      this.sync();
    }
  }

  componentWillUnmount() {
    const { map } = this.props;
    map.off('moveend', this.boundSync);
    map.off('zoomend', this.boundSync);
    this.teardown();
  }

  private teardown() {
    const { map } = this.props;
    if (map.getLayer(this.fillId)) map.removeLayer(this.fillId);
    if (map.getLayer(this.lineId)) map.removeLayer(this.lineId);
    if (map.getSource(this.srcId)) map.removeSource(this.srcId);
  }

  private sync() {
    const { map, enabled } = this.props;
    if (!map || !map.getStyle() || !map.isStyleLoaded()) return;

    if (!enabled || map.getZoom() < 5.5) {
      this.teardown();
      return;
    }

    // Placeholder implementation - can be enhanced later
    this.teardown();
  }

  render() {
    return null;
  }
}


