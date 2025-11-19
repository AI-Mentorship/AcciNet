'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import Draggable from 'react-draggable';
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import { MapPin, Navigation, RotateCcw } from 'lucide-react';
import { getCurrentLocation, fetchRoutesGoogle, type GoogleRoute } from '../lib/routes';

type Props = {
  map: maplibregl.Map;
  googleKey: string;
  onRoutes: (routes: GoogleRoute[], origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => void;
  maptilerKey?: string;
  onResetRoutes?: () => void;
  initialOrigin?: string;
  initialDestination?: string;
  autoSearch?: boolean;
};

type State = {
  originText: string;
  destText: string;
  originCoords: { lat: number; lng: number } | null;
  destCoords: { lat: number; lng: number } | null;
  usingMyLocation: boolean;
  loading: boolean;
  error?: string;
};

const createDefaultState = (): State => ({
  originText: '',
  destText: '',
  originCoords: null,
  destCoords: null,
  usingMyLocation: true,
  loading: false,
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

  async componentDidMount() {
    const { initialOrigin, initialDestination, autoSearch } = this.props;
    
    // Handle initial values from natural language search
    if (initialDestination) {
      this.setState({ destText: initialDestination });
      
      // Geocode destination
      try {
        const destResults = await geocodeByAddress(initialDestination);
        const destLatLng = await getLatLng(destResults[0]);
        this.setState({ destCoords: destLatLng });
        
        this.destMarker?.remove();
        this.destMarker = new maplibregl.Marker({ color: '#f87171' })
          .setLngLat([destLatLng.lng, destLatLng.lat])
          .addTo(this.props.map);
      } catch (error) {
        console.error('Error geocoding initial destination:', error);
        this.setState({ error: `Could not find location: ${initialDestination}` });
      }
    }
    
    if (initialOrigin) {
      this.setState({ originText: initialOrigin, usingMyLocation: false });
      
      // Geocode origin
      try {
        const originResults = await geocodeByAddress(initialOrigin);
        const originLatLng = await getLatLng(originResults[0]);
        this.setState({ originCoords: originLatLng });
        
        this.originMarker?.remove();
        this.originMarker = new maplibregl.Marker({ color: '#60a5fa' })
          .setLngLat([originLatLng.lng, originLatLng.lat])
          .addTo(this.props.map);
      } catch (error) {
        console.error('Error geocoding initial origin:', error);
        this.setState({ error: `Could not find location: ${initialOrigin}` });
      }
    } else if (this.state.usingMyLocation) {
      this.markCurrentLocation();
    }
    
    // Auto-trigger search if requested
    if (autoSearch && initialDestination) {
      // Wait a bit for geocoding to complete
      setTimeout(() => {
        this.compute();
      }, 1000);
    }
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
      onRoutes(routes, originLL, destCoords);
      this.setState({ error: undefined });
    } catch (e: any) {
      this.setState({ error: e?.message || 'Failed to get routes' });
    } finally {
      this.setState({ loading: false });
    }
  }

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
    const { originText, destText, usingMyLocation, loading, error } = this.state;

    const content = (
      <Draggable nodeRef={this.routeDrag}>
        <div
          ref={this.routeDrag}
          id="rbx-wrap"
          className="glass-panel glass-panel--strong"
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            zIndex: 10,
            width: 300,
            maxWidth: 'calc(100vw - 32px)',
            borderRadius: 12,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            fontFamily: 'system-ui, sans-serif',
            cursor: 'move',
          }}
        >
            <div style={{ padding: 10 }}>
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <label style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
                    Origin
                  </label>
                  <button
                    onClick={this.toggleMyLocation}
                    style={{
                      background: usingMyLocation ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${usingMyLocation ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.12)'}`,
                      borderRadius: 5,
                      padding: '3px 7px',
                      fontSize: 10,
                      color: usingMyLocation ? '#c7d2fe' : '#9ca3af',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      transition: 'all 0.2s ease',
                      boxShadow: usingMyLocation ? '0 0 12px rgba(99, 102, 241, 0.3)' : 'none',
                    }}
                    onMouseOver={(e) => {
                      if (!usingMyLocation) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                        e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 255, 255, 0.1)';
                      } else {
                        e.currentTarget.style.boxShadow = '0 0 16px rgba(99, 102, 241, 0.4)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!usingMyLocation) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                        e.currentTarget.style.boxShadow = 'none';
                      } else {
                        e.currentTarget.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.3)';
                      }
                    }}
                  >
                    <MapPin size={11} />
                    My Location
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
                            placeholder: 'Search origin...',
                            style: {
                              width: '100%',
                              padding: '8px 10px',
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              border: '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: 8,
                              color: '#e5e7eb',
                              fontSize: 13,
                              outline: 'none',
                              transition: 'all 0.25s ease',
                            },
                          })}
                          onFocus={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                            e.currentTarget.style.boxShadow = '0 0 16px rgba(99, 102, 241, 0.2), 0 0 4px rgba(99, 102, 241, 0.3)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                          onMouseEnter={(e) => {
                            if (document.activeElement !== e.currentTarget) {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (document.activeElement !== e.currentTarget) {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }
                          }}
                        />
                        {(suggestions.length > 0 || searching) && (
                          <div
                            className="glass-panel glass-panel--strong"
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              marginTop: 6,
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              borderRadius: 8,
                              maxHeight: 200,
                              overflowY: 'auto',
                              zIndex: 1000,
                              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                            }}
                          >
                            {searching && (
                              <div style={{ padding: 10, color: '#9ca3af', fontSize: 12 }}>Loading...</div>
                            )}
                            {suggestions.map((suggestion) => (
                              <div
                                {...getSuggestionItemProps(suggestion, {
                                  style: {
                                    padding: '8px 10px',
                                    cursor: 'pointer',
                                    backgroundColor: suggestion.active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                    color: '#e5e7eb',
                                    fontSize: 12,
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'all 0.15s ease',
                                    boxShadow: suggestion.active ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none',
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
                      padding: '8px 10px',
                      backgroundColor: 'rgba(99, 102, 241, 0.12)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      borderRadius: 8,
                      color: '#c7d2fe',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 0 12px rgba(99, 102, 241, 0.2)',
                    }}
                  >
                    <MapPin size={12} />
                    Using current location
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>
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
                          placeholder: 'Search destination...',
                          style: {
                            width: '100%',
                            padding: '8px 10px',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 8,
                            color: '#e5e7eb',
                            fontSize: 13,
                            outline: 'none',
                            transition: 'all 0.25s ease',
                          },
                        })}
                        onFocus={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                          e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                          e.currentTarget.style.boxShadow = '0 0 16px rgba(99, 102, 241, 0.2), 0 0 4px rgba(99, 102, 241, 0.3)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        onMouseEnter={(e) => {
                          if (document.activeElement !== e.currentTarget) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (document.activeElement !== e.currentTarget) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          }
                        }}
                      />
                      {(suggestions.length > 0 || searching) && (
                        <div
                          className="glass-panel glass-panel--strong"
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: 6,
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: 8,
                            maxHeight: 200,
                            overflowY: 'auto',
                            zIndex: 1000,
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                          }}
                        >
                          {searching && (
                            <div style={{ padding: 10, color: '#9ca3af', fontSize: 12 }}>Loading...</div>
                          )}
                          {suggestions.map((suggestion) => (
                            <div
                              {...getSuggestionItemProps(suggestion, {
                                style: {
                                  padding: '8px 10px',
                                  cursor: 'pointer',
                                  backgroundColor: suggestion.active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                  color: '#e5e7eb',
                                  fontSize: 12,
                                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                                  transition: 'all 0.15s ease',
                                  boxShadow: suggestion.active ? '0 0 12px rgba(99, 102, 241, 0.2)' : 'none',
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
                    padding: '6px 10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 8,
                    color: '#fca5a5',
                    fontSize: 11,
                    marginBottom: 8,
                    boxShadow: '0 0 12px rgba(239, 68, 68, 0.15)',
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => this.compute()}
                  disabled={loading || (!usingMyLocation && !originText) || !destText}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    backgroundColor: loading ? 'rgba(255, 255, 255, 0.05)' : 'rgba(99, 102, 241, 0.2)',
                    border: `1px solid ${loading ? 'rgba(255, 255, 255, 0.12)' : 'rgba(99, 102, 241, 0.4)'}`,
                    borderRadius: 8,
                    color: loading ? '#9ca3af' : '#c7d2fe',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: loading || (!usingMyLocation && !originText) || !destText ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'all 0.25s ease',
                    opacity: loading || (!usingMyLocation && !originText) || !destText ? 0.5 : 1,
                    boxShadow: (!loading && (usingMyLocation || originText) && destText) ? '0 0 0px rgba(99, 102, 241, 0.3)' : 'none',
                  }}
                  onMouseOver={(e) => {
                    if (!loading && (usingMyLocation || originText) && destText) {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.25)';
                      e.currentTarget.style.boxShadow = '0 0 16px rgba(99, 102, 241, 0.35), 0 0 4px rgba(99, 102, 241, 0.4)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!loading) {
                      e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)';
                      e.currentTarget.style.boxShadow = '0 0 0px rgba(99, 102, 241, 0.3)';
                    }
                  }}
                >
                  <Navigation size={13} />
                  {loading ? 'Routing...' : 'Get routes'}
                </button>
                <button
                  onClick={this.reset}
                  style={{
                    padding: '7px 10px',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 8,
                    color: '#fca5a5',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.25s ease',
                    boxShadow: '0 0 0px rgba(239, 68, 68, 0.2)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                    e.currentTarget.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.3), 0 0 4px rgba(239, 68, 68, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                    e.currentTarget.style.boxShadow = '0 0 0px rgba(239, 68, 68, 0.2)';
                  }}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
        </div>
      </Draggable>
    );

    return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
  }
}
