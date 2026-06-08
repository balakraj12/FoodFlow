import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '../store/index.js';
import { MapPin, Compass, Check, AlertCircle } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';

// Create a safe, custom leaflet marker icon to avoid broken default resource path URLs
const customIcon = L.divIcon({
  html: `<div style="font-size:36px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15)); transform: translate(-10px, -24px);">📍</div>`,
  className: 'custom-leaflet-marker',
  iconSize: [24, 40],
  iconAnchor: [12, 40]
});

// Helper component to programmatically pan/zoom the map view to match react state coordinates
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Helper component to handle interactive click events on Leaflet map
function MapEventsHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      if (e.latlng) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

export default function LocationPickerModal({ onClose }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [lat, setLat] = useState(28.6139); // Connaught Place New Delhi default
  const [lng, setLng] = useState(77.2090);
  const [zoom, setZoom] = useState(13);
  
  const [label, setLabel] = useState('Home'); // Home, Work, Other
  const [fullAddress, setFullAddress] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [state, setState] = useState('Delhi');
  const [pincode, setPincode] = useState('110001');

  const [loadingGeo, setLoadingGeo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorHeader, setErrorHeader] = useState('');

  const markerRef = useRef(null);

  // Automatically reverse-geocode coordinates using open-source OpenStreetMap Nominatim API
  const handleReverseGeocode = async (latitude, longitude) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'FoodFlow-App-OSM'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          setFullAddress(data.display_name || 'Near Coordinates Lat: ' + latitude.toFixed(5) + ', Lng: ' + longitude.toFixed(5));
          setCity(addr.city || addr.town || addr.village || addr.suburb || 'New Delhi');
          setState(addr.state || 'Delhi');
          setPincode(addr.postcode || '110001');
        }
      }
    } catch (err) {
      console.warn('Nominatim reverse geocoding error:', err);
    }
  };

  // Fetch current geolocation on startup
  useEffect(() => {
    handleFetchCurrentLocation();
  }, []);

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorHeader('Geolocation is not supported by your browser.');
      return;
    }
    
    setLoadingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLat(latitude);
        setLng(longitude);
        setZoom(15);
        setErrorHeader('');
        setLoadingGeo(false);
        handleReverseGeocode(latitude, longitude);
      },
      (error) => {
        console.warn('Geolocation access declined or error:', error.message);
        setErrorHeader('Unable to retrieve automatic location. Please adjust address manually on the map.');
        setLoadingGeo(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleMapClick = (clickLat, clickLng) => {
    setLat(clickLat);
    setLng(clickLng);
    setZoom(15);
    handleReverseGeocode(clickLat, clickLng);
  };

  // Drag handler for leaflet marker pin
  const markerEventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latLng = marker.getLatLng();
        setLat(latLng.lat);
        setLng(latLng.lng);
        setZoom(15);
        handleReverseGeocode(latLng.lat, latLng.lng);
      }
    }
  }), []);

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!fullAddress) {
      setErrorHeader('Full delivery address is required.');
      return;
    }

    setSubmitting(true);
    setErrorHeader('');

    try {
      const token = localStorage.getItem('foodflow_token');
      const res = await fetch('/api/auth/save-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          label,
          fullAddress,
          city,
          state,
          pincode,
          lat,
          lng,
          isDefault: true
        })
      });

      const data = await res.json();
      if (data.success) {
        dispatch(setUser(data.user));
        if (onClose) onClose();
      } else {
        setErrorHeader(data.error || 'Failed to save address.');
      }
    } catch {
      setErrorHeader('Connection error saving details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border text-left border-slate-100 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-auto md:h-[650px]">
        
        {/* OpenStreetMap Tile Layer Frame */}
        <div className="w-full md:w-1/2 relative bg-slate-100 h-[280px] md:h-full z-10">
          <div className="w-full h-full relative" style={{ height: '100%', minHeight: '100%' }}>
            <MapContainer
              center={[lat, lng]}
              zoom={zoom}
              className="w-full h-full"
              style={{ width: '100%', height: '100%', zIndex: 1 }}
            >
              <ChangeMapView center={[lat, lng]} zoom={zoom} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapEventsHandler onMapClick={handleMapClick} />
              <Marker
                ref={markerRef}
                position={[lat, lng]}
                draggable={true}
                eventHandlers={markerEventHandlers}
                icon={customIcon}
              />
            </MapContainer>
            
            <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-xs text-white p-3 rounded-xl border border-slate-800 text-[11px] font-medium leading-relaxed shadow-lg z-99">
              📍 <strong>Interactive OpenStreetMap Enabled:</strong> Click anywhere or drag the custom marker pin to instantly auto-fill your delivery coordinates!
            </div>
          </div>

          {/* Quick fetch float button */}
          <button
            type="button"
            onClick={handleFetchCurrentLocation}
            disabled={loadingGeo}
            className="absolute top-4 right-4 bg-white hover:bg-slate-50 text-slate-800 p-2.5 rounded-xl shadow-lg border border-slate-200 flex items-center text-xs font-semibold space-x-1.5 transition-all cursor-pointer z-99"
            title="Auto-detect current location"
          >
            <Compass className={`w-4 h-4 text-blue-600 ${loadingGeo ? 'animate-spin' : ''}`} />
            <span>{loadingGeo ? 'Detecting...' : 'Use GPS Location'}</span>
          </button>
        </div>

        {/* Setting Address Details Form Frame */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between overflow-y-auto h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 uppercase">
                  Step 2: Onboarding
                </span>
                <h3 className="text-xl font-black text-slate-9 tracking-tight mt-1">Set Delivery Location</h3>
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-900 text-sm cursor-pointer"
                >
                  Skip
                </button>
              )}
            </div>

            {errorHeader && (
              <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 text-[11px] font-medium flex items-start leading-normal">
                <AlertCircle className="w-4 h-4 mr-1.5 shrink-0 text-red-500 mt-0.5" />
                <span>{errorHeader}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-4">
              {/* Address Label Selectors */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Address Label
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Home', 'Work', 'Other'].map((l) => (
                    <button
                      type="button"
                      key={l}
                      onClick={() => setLabel(l)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        label === l
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-500/10'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {l === 'Home' ? '🏠 Home' : l === 'Work' ? '💼 Work' : '📍 Other'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coordinates display read-only */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] font-semibold text-slate-500">
                <div>Latitude: <span className="text-slate-800 font-mono">{lat.toFixed(5)}</span></div>
                <div>Longitude: <span className="text-slate-800 font-mono">{lng.toFixed(5)}</span></div>
              </div>

              {/* Full address input */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Full Street Address
                </label>
                <textarea
                  required
                  placeholder="Flat No, Wing, Building Name, Sector details..."
                  rows={2}
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all leading-normal"
                />
              </div>

              {/* Location parts city, state, pin */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    City / Area
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    State
                  </label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Pincode
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{submitting ? 'Saving address...' : 'Confirm Location & Start Ordering'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
