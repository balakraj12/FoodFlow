import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setFranchise } from '../store/index.js';
import { MapPin, Navigation, Clock, Phone, Mail, Check, AlertTriangle, Sparkles, Building2 } from 'lucide-react';

// Distance helper (Haversine Formula) in km
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

export default function FranchisePickerModal({ onClose }) {
  const dispatch = useDispatch();
  const selectedFranchiseId = useSelector((state) => state.cart.selectedFranchiseId);
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Simulated customer coordinate inputs
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Sample quick delhi sectors list for nearest calculation
  const searchPresets = [
    { label: 'Connaught Place', lat: 28.6139, lng: 77.2090 },
    { label: 'Noida Sector 62', lat: 28.6273, lng: 77.3727 },
    { label: 'Saket, South Delhi', lat: 28.5244, lng: 77.2100 },
    { label: 'IIT Delhi Core Block', lat: 28.5450, lng: 77.1930 },
  ];

  useEffect(() => {
    fetch('/api/franchises')
      .then(res => res.json())
      .then(data => {
        setFranchises(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching franchises', err);
        setLoading(false);
      });
  }, []);

  const handleSelectFranchise = (fran) => {
    dispatch(setFranchise(fran));
    onClose();
  };

  const handleLocationPresetSelect = (preset) => {
    setUserLocation({ lat: preset.lat, lng: preset.lng });
    setSearchQuery(preset.label);
    setErrorMessage('');
  };

  const handleDetectCoordinates = () => {
    // Geolocate browser emulation hook
    const defaultCoords = { lat: 28.6200, lng: 77.2300 }; // Centered around central Delhi NCR
    setUserLocation(defaultCoords);
    setSearchQuery('Detected Coordinates (Central Delhi, NCR)');
    setErrorMessage('');
  };

  // Find nearest store logic
  const handleAutoAssignNearest = () => {
    if (!userLocation) {
      setErrorMessage('Please type an address, or choose a sector preset first to locate nearest!');
      return;
    }

    if (franchises.length === 0) return;

    // Calculate distances to all open franchises
    const distancesMap = franchises
      .filter(f => f.isActive)
      .map(f => ({
        franchise: f,
        dist: getDistance(userLocation.lat, userLocation.lng, f.location.lat, f.location.lng)
      }))
      .sort((a, b) => a.dist - b.dist);

    const nearest = distancesMap[0];
    if (nearest) {
      if (nearest.dist > nearest.franchise.deliveryRadius) {
        // Outside official coverage but still nearest
        setErrorMessage(`Nearest store is "${nearest.franchise.name}" at ${nearest.dist.toFixed(1)} km, which exceeds its official ${nearest.franchise.deliveryRadius} km delivery zone. Proceeding anyway!`);
      }
      dispatch(setFranchise(nearest.franchise));
      setTimeout(() => onClose(), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white max-w-2xl w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer"
          >
            ✕
          </button>
          
          <div className="flex items-center space-x-3 text-left">
            <div className="p-3 bg-blue-600 rounded-2xl">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black tracking-widest text-blue-400 block mb-1">Domino's Style Multi-Franchise</span>
              <h3 className="font-extrabold text-xl text-white">Select Local Pizza Branch</h3>
            </div>
          </div>
        </div>

        {/* Search & Location Tools Block */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/70 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                readOnly
                placeholder="Select sector or click detect to trace closest..."
                value={searchQuery}
                className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs text-slate-800 focus:outline-none"
              />
            </div>
            
            <button
              onClick={handleDetectCoordinates}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center justify-center cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 mr-1.5" /> Detect Location
            </button>
          </div>

          {/* Quick presets */}
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Simulate Customer Address Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {searchPresets.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handleLocationPresetSelect(preset)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    searchQuery === preset.label
                      ? 'bg-blue-50 border-blue-400 text-blue-700 font-extrabold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  📍 {preset.label}
                </button>
              ))}
            </div>
          </div>

          {userLocation && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200 p-3 rounded-xl text-xs text-slate-500">
              <span className="font-medium">Selected Location Coordinates: Lat: <strong className="font-mono text-slate-800">{userLocation.lat.toFixed(4)}</strong>, Lng: <strong className="font-mono text-slate-800">{userLocation.lng.toFixed(4)}</strong></span>
              <button
                onClick={handleAutoAssignNearest}
                className="text-xs font-black text-blue-600 hover:text-blue-550 flex items-center mt-2 sm:mt-0 tracking-tight"
              >
                <Sparkles className="w-4 h-4 mr-1 text-yellow-500 animate-spin" /> Auto-select Closest Store
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="bg-amber-50 border border-amber-200 text-amber-805 p-3 rounded-lg text-xs font-bold text-left flex items-start">
              <AlertTriangle className="w-4 h-4 mr-2 shrink-0 text-amber-500 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Franchise cards collection */}
        <div className="p-6 overflow-y-auto max-h-[45vh] bg-slate-100/40 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(s => (
                <div key={s} className="bg-white p-4 rounded-2xl shadow-xs border animate-pulse h-32 w-full"></div>
              ))}
            </div>
          ) : franchises.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500 font-bold">No registered franchises found.</p>
            </div>
          ) : (
            franchises.map(fran => {
              const matchesSelected = selectedFranchiseId === fran.id;
              
              // Calculate distance if coordinates are defined
              let distanceText = '';
              let isWithinRadius = true;
              if (userLocation) {
                const distanceVal = getDistance(userLocation.lat, userLocation.lng, fran.location.lat, fran.location.lng);
                distanceText = `${distanceVal.toFixed(1)} km away`;
                isWithinRadius = distanceVal <= fran.deliveryRadius;
              }

              return (
                <div
                  key={fran.id}
                  className={`bg-white border rounded-3xl p-5 shadow-sm hover:shadow-md transition-all text-left flex flex-col md:flex-row items-start justify-between gap-4 ${
                    matchesSelected
                      ? 'border-blue-500 bg-blue-50/5 ring-1 ring-blue-400/30'
                      : 'border-slate-150'
                  } ${!fran.isOpen && 'opacity-75'}`}
                >
                  {/* Left info column */}
                  <div className="flex items-start space-x-4 flex-1">
                    <img
                      src={fran.logo}
                      alt={fran.name}
                      className="w-16 h-16 object-cover rounded-xl border border-slate-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="space-y-2">
                      <div className="flex items-center flex-wrap gap-2">
                        <h4 className="font-extrabold text-slate-900 tracking-tight text-sm">
                          {fran.name}
                        </h4>
                        
                        {/* Open/closed visual tags */}
                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                          fran.isOpen
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : 'bg-red-50 text-red-700 border border-red-300'
                        }`}>
                          {fran.isOpen ? '🟢 Open Now' : '🔴 Closed'}
                        </span>

                        {fran.isActive === false && (
                          <span className="bg-slate-100 text-slate-500 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
                            Suspended
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{fran.address}</p>

                      {/* Technical requirements display grid: operating hours, manager and coverage radius */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-450 pt-1.5 border-t border-slate-50">
                        <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1 text-slate-400" /> Hours: <strong className="text-slate-700 ml-1">{fran.operatingHours}</strong></span>
                        <span className="flex items-center"><Navigation className="w-3.5 h-3.5 mr-1 text-slate-400" /> Radius: <strong className="text-slate-700 ml-1">{fran.deliveryRadius} km Zone</strong></span>
                        <span className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1 text-slate-400" /> Main: <strong className="text-slate-700 ml-1">{fran.contactNumber}</strong></span>
                        <span className="flex items-center"><Mail className="w-3.5 h-3.5 mr-1 text-slate-400" /> Email: <strong className="text-slate-700 ml-1 truncate">{fran.email}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Right select column */}
                  <div className="flex flex-col items-end justify-between shrink-0 h-full self-stretch select-none">
                    {distanceText && (
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-800 block">{distanceText}</span>
                        <span className={`text-[10px] font-bold ${isWithinRadius ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {isWithinRadius ? '✓ Within delivery radius' : '⚠️ Outside official radius'}
                        </span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleSelectFranchise(fran)}
                      disabled={!fran.isActive}
                      className={`mt-4 md:mt-auto px-5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${
                        matchesSelected
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md'
                          : fran.isOpen
                            ? 'bg-slate-900 hover:bg-blue-600 text-white'
                            : 'bg-slate-150 text-slate-500 hover:bg-slate-205'
                      }`}
                    >
                      {matchesSelected ? (
                        <>Selected <Check className="w-3.5 h-3.5 ml-1 text-white" /></>
                      ) : fran.isOpen ? (
                        'Select Store'
                      ) : (
                        'Store is Closed'
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-450 text-center">
          Note: Changing your selected branch will auto-refresh your active shopping cart to keep branch products consistent.
        </div>
        
      </div>
    </div>
  );
}
