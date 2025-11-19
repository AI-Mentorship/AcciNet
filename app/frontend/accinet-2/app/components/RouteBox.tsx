'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import Draggable from 'react-draggable';
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import { getCurrentLocation, fetchRoutesGoogle, type GoogleRoute } from '../lib/routes';

type Props = {
  map: maplibregl.Map;
  googleKey: string;
  onRoutes: (routes: GoogleRoute[]) => void;
  maptilerKey?: string;
  onResetRoutes?: () => void;
};

type State = {
  originText: string;
  destText: string;
  originCoords: { lat: number; lng: number } | null;
  destCoords: { lat: number; lng: number } | null;
  usingMyLocation: boolean;
  loading: boolean;
  collapsed: boolean;
  error?: string;
};

const createDefaultState = (): State => ({
  originText: '',
  destText: '',
  originCoords: null,
  destCoords: null,
  usingMyLocation: true,
  loading: false,
  collapsed: false,
});

export default class RouteBox extends React.Component<Props, State> {
  private originMarker?: maplibregl.Marker;
  private destMarker?: maplibregl.Marker;
  private routeDrag = React.createRef<HTMLDivElement>();

  state: State = createDefaultState();

  private async markCurrentLocation() {
    try {
      const { map } = this.props;
      const loc = await getCurrentLocation();
      this.originMarker?.remove();
      this.originMarker = new maplibregl.Marker({ color: '#60a5fa' })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);
      this.setState({ originCoords: loc });
      map.flyTo({ center: [loc.lng, loc.lat], zoom: 12 });
    } catch {
      /* ignore */
    }
  }

  componentDidMount() {
    if (this.state.usingMyLocation) this.markCurrentLocation();
  }

  componentWillUnmount() {
    this.originMarker?.remove();
    this.destMarker?.remove();
  }

  private handleOriginSelect = async (address: string) => {
    try {
      const results = await geocodeByAddress(address);
      const latLng = await getLatLng(results[0]);
      
      this.setState({ originText: address, originCoords: latLng, usingMyLocation: false });
      
      this.originMarker?.remove();
      this.originMarker = new maplibregl.Marker({ color: '#60a5fa' })
        .setLngLat([latLng.lng, latLng.lat])
        .addTo(this.props.map);
      
      this.props.map.flyTo({ center: [latLng.lng, latLng.lat], zoom: 14, duration: 600 });
    } catch (error) {
      console.error('Error selecting origin:', error);
    }
  };

  private handleDestSelect = async (address: string) => {
    try {
      const results = await geocodeByAddress(address);
      const latLng = await getLatLng(results[0]);
      
      this.setState({ destText: address, destCoords: latLng });
      
      this.destMarker?.remove();
      this.destMarker = new maplibregl.Marker({ color: '#f87171' })
        .setLngLat([latLng.lng, latLng.lat])
        .addTo(this.props.map);
      
      this.props.map.flyTo({ center: [latLng.lng, latLng.lat], zoom: 14, duration: 600 });
    } catch (error) {
      console.error('Error selecting destination:', error);
    }
  };

  private async compute() {
    const { onRoutes } = this.props;
    const { usingMyLocation, originCoords, destCoords } = this.state;

    try {
      this.setState({ loading: true, error: undefined });

      let originLL: { lat: number; lng: number } | null = originCoords;
      
      if (usingMyLocation && !originCoords) {
        try {
          originLL = await getCurrentLocation();
          this.setState({ originCoords: originLL });
        } catch (err: any) {
          this.setState({
            usingMyLocation: false,
            error: 'Chrome requires HTTPS for location. Enter an origin manually or run over HTTPS.',
            loading: false,
          });
          return;
        }
      }

      if (!originLL) throw new Error('Please select an origin');
      if (!destCoords) throw new Error('Please select a destination');

      if (usingMyLocation && originLL) {
        this.originMarker?.remove();
        this.originMarker = new maplibregl.Marker({ color: '#60a5fa' })
          .setLngLat([originLL.lng, originLL.lat])
          .addTo(this.props.map);
      }

      const routes = await fetchRoutesGoogle(originLL, destCoords, this.props.googleKey);
      if (!routes.length) throw new Error('No routes found');
      onRoutes(routes);
      this.setState({ error: undefined });
    } catch (e: any) {
      this.setState({ error: e?.message || 'Failed to get routes' });
    } finally {
      this.setState({ loading: false });
    }
  }

  private toggleCollapsed = () => {
    this.setState((s) => ({ collapsed: !s.collapsed }));
  };

  private toggleMyLocation = () => {
    this.setState((s) => {
      const next = !s.usingMyLocation;
      if (next) this.markCurrentLocation();
      else {
        this.originMarker?.remove();
        this.setState({ originCoords: null, originText: '' });
      }
      return { usingMyLocation: next };
    });
  };

  private reset = () => {
    this.originMarker?.remove();
    this.destMarker?.remove();
    this.setState(createDefaultState());
    this.props.onResetRoutes?.();
    if (this.state.usingMyLocation) this.markCurrentLocation();
  };

  render() {
    const { originText, destText, usingMyLocation, loading, collapsed, error } = this.state;

    const content = (
      <Draggable handle=".drag-handle" nodeRef={this.routeDrag}>
        <div
          ref={this.routeDrag}
          id="rbx-wrap"
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            width: 340,
            maxWidth: 'calc(100vw - 32px)',
            backgroundColor: 'rgba(12, 18, 32, 0.95)',
            backdropFilter: 'blur(12px)',
            borderRadius: 16,
            border: '1px solid rgba(56, 189, 248, 0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            className="drag-handle"
            style={{
              cursor: 'move',
              padding: '12px 16px',
              borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 600, color: '#f0f3ff' }}>Route Planner</span>
            <button
              onClick={this.toggleCollapsed}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                fontSize: 20,
                padding: 4,
              }}
              aria-label={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? '▼' : '▲'}
            </button>
          </div>

          {!collapsed && (
            <div style={{ padding: 16 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <label style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>Origin</label>
                  <button
                    onClick={this.toggleMyLocation}
                    style={{
                      background: usingMyLocation ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${usingMyLocation ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 11,
                      color: usingMyLocation ? '#38bdf8' : '#94a3b8',
                      cursor: 'pointer',
                    }}
                  >
                    📍 My Location
                  </button>
                </div>
                
                {!usingMyLocation && (
                  <PlacesAutocomplete
                    value={originText}
                    onChange={(value) => this.setState({ originText: value })}
                    onSelect={this.handleOriginSelect}
                    searchOptions={{
                      componentRestrictions: { country: 'us' }
                    }}
                  >
                    {({ getInputProps, suggestions, getSuggestionItemProps, loading: searching }) => (
                      <div style={{ position: 'relative' }}>
                        <input
                          {...getInputProps({
                            placeholder: 'Enter origin address...',
                            style: {
                              width: '100%',
                              padding: '10px 12px',
                              backgroundColor: 'rgba(15, 23, 42, 0.8)',
                              border: '1px solid rgba(148, 163, 184, 0.3)',
                              borderRadius: 8,
                              color: '#f0f3ff',
                              fontSize: 14,
                              outline: 'none',
                            },
                          })}
                        />
                        {(suggestions.length > 0 || searching) && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              marginTop: 4,
                              backgroundColor: 'rgba(15, 23, 42, 0.98)',
                              border: '1px solid rgba(148, 163, 184, 0.3)',
                              borderRadius: 8,
                              maxHeight: 200,
                              overflowY: 'auto',
                              zIndex: 1000,
                            }}
                          >
                            {searching && (
                              <div style={{ padding: 12, color: '#94a3b8', fontSize: 13 }}>Loading...</div>
                            )}
                            {suggestions.map((suggestion) => (
                              <div
                                {...getSuggestionItemProps(suggestion, {
                                  style: {
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                    backgroundColor: suggestion.active ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                    color: '#f0f3ff',
                                    fontSize: 13,
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  },
                                })}
                              >
                                {suggestion.description}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </PlacesAutocomplete>
                )}
                {usingMyLocation && (
                  <div
                    style={{
                      padding: '10px 12px',
                      backgroundColor: 'rgba(56, 189, 248, 0.1)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: 8,
                      color: '#38bdf8',
                      fontSize: 13,
                    }}
                  >
                    Using current location
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, marginBottom: 6, display: 'block' }}>
                  Destination
                </label>
                <PlacesAutocomplete
                  value={destText}
                  onChange={(value) => this.setState({ destText: value })}
                  onSelect={this.handleDestSelect}
                  searchOptions={{
                    componentRestrictions: { country: 'us' }
                  }}
                >
                  {({ getInputProps, suggestions, getSuggestionItemProps, loading: searching }) => (
                    <div style={{ position: 'relative' }}>
                      <input
                        {...getInputProps({
                          placeholder: 'Enter destination address...',
                          style: {
                            width: '100%',
                            padding: '10px 12px',
                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            borderRadius: 8,
                            color: '#f0f3ff',
                            fontSize: 14,
                            outline: 'none',
                          },
                        })}
                      />
                      {(suggestions.length > 0 || searching) && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: 4,
                            backgroundColor: 'rgba(15, 23, 42, 0.98)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            borderRadius: 8,
                            maxHeight: 200,
                            overflowY: 'auto',
                            zIndex: 1000,
                          }}
                        >
                          {searching && (
                            <div style={{ padding: 12, color: '#94a3b8', fontSize: 13 }}>Loading...</div>
                          )}
                          {suggestions.map((suggestion) => (
                            <div
                              {...getSuggestionItemProps(suggestion, {
                                style: {
                                  padding: '10px 12px',
                                  cursor: 'pointer',
                                  backgroundColor: suggestion.active ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                                  color: '#f0f3ff',
                                  fontSize: 13,
                                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                                },
                              })}
                            >
                              {suggestion.description}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </PlacesAutocomplete>
              </div>

              {error && (
                <div
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    borderRadius: 8,
                    color: '#fca5a5',
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => this.compute()}
                  disabled={loading || (!usingMyLocation && !originText) || !destText}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: loading ? 'rgba(148, 163, 184, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    borderRadius: 8,
                    color: loading ? '#94a3b8' : '#38bdf8',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: loading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loading ? 'Routing...' : 'Get routes'}
                </button>
                <button
                  onClick={this.reset}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                    borderRadius: 8,
                    color: '#f87171',
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          )}
        </div>
      </Draggable>
    );

    return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
  }
}
