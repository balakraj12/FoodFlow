import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Clock, ShieldCheck, MapPin, Phone, Truck, ArrowLeft, ArrowUpRight, Flame, Map, Zap, Info, Star, Send, ShieldAlert, MessageSquare, RefreshCw } from 'lucide-react';

// Free OSM & Leaflet Routing Engine Container
function LeafletDeliveryMap({ startCoords, destCoords, riderCoords, orderId, orderStatus, onRouteCalculated }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [distanceRemaining, setDistanceRemaining] = useState(null);
  const [durationRemaining, setDurationRemaining] = useState(null);

  useEffect(() => {
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    const cssId = 'leaflet-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    const scriptId = 'leaflet-js';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => setLeafletLoaded(true);
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.L) {
          setLeafletLoaded(true);
          clearInterval(interval);
        }
      }, 100);
    }
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    const L = window.L;
    const store = startCoords || { lat: 28.6289, lng: 77.2190 };
    const destination = destCoords || { lat: 28.6273, lng: 77.3727 };

    const initialCenter = riderCoords || store;
    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true
    }).setView([initialCenter.lat, initialCenter.lng], 13);
    
    mapInstanceRef.current = map;

    // Load OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const storeIcon = L.divIcon({
      html: `<div style="font-size:30px; transform:translate(-4px,-10px);">🍕</div>`,
      className: 'clear-divicon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const destinationIcon = L.divIcon({
      html: `<div style="font-size:30px; transform:translate(-4px,-10px);">🏡</div>`,
      className: 'clear-divicon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const riderIcon = L.divIcon({
      html: `<div style="font-size:34px; animation: marker-bounce 0.8s infinite alternate; transform:translate(-6px,-12px);">🏍️</div>`,
      className: 'clear-divicon',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    L.marker([store.lat, store.lng], { icon: storeIcon }).addTo(map)
      .bindPopup('<b>FoodFlow Central Kitchen</b><br/>Prepping fresh dough.');

    L.marker([destination.lat, destination.lng], { icon: destinationIcon }).addTo(map)
      .bindPopup('<b>Your Delivery Address</b><br/>Hot pizza incoming!');

    const riderPos = orderStatus === 'out_for_delivery' ? (riderCoords || store) : store;
    const riderMarker = L.marker([riderPos.lat, riderPos.lng], { icon: riderIcon }).addTo(map);
    riderMarker.bindPopup('<b>FoodFlow Courier</b><br/>En-route to destination.');
    riderMarkerRef.current = riderMarker;

    // Dynamic routing query from OSRM Project Routing Engine
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${store.lng},${store.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    fetch(osrmUrl)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords = route.geometry.coordinates;
          const latLngs = coords.map(c => [c[1], c[0]]);

          const polyline = L.polyline(latLngs, {
            color: '#2563eb',
            weight: 6,
            opacity: 0.85,
            lineJoin: 'round'
          }).addTo(map);
          routePolylineRef.current = polyline;

          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

          const dist = Number((route.distance / 1000).toFixed(1));
          const duration = Math.ceil(route.duration / 60);

          setDistanceRemaining(dist);
          setDurationRemaining(duration);
          if (onRouteCalculated) {
            onRouteCalculated({ distance: dist, duration });
          }
        } else {
          throw new Error('OSRM empty route response');
        }
      })
      .catch(err => {
        console.warn('OSRM router offline, using line vector fallback:', err);
        const polyline = L.polyline([[store.lat, store.lng], [destination.lat, destination.lng]], {
          color: '#ef4444',
          weight: 4,
          opacity: 0.65,
          dashArray: '5,5'
        }).addTo(map);
        routePolylineRef.current = polyline;

        // Mathematical straight-line calculation
        const dist = Number((Math.sqrt(Math.pow(destination.lat - store.lat, 2) + Math.pow(destination.lng - store.lng, 2)) * 111).toFixed(1));
        const duration = Math.max(5, Math.ceil(dist * 1.5));
        setDistanceRemaining(dist);
        setDurationRemaining(duration);
        if (onRouteCalculated) {
          onRouteCalculated({ distance: dist, duration });
        }
        map.fitBounds([[store.lat, store.lng], [destination.lat, destination.lng]], { padding: [50, 50] });
      });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletLoaded, startCoords?.lat, startCoords?.lng, destCoords?.lat, destCoords?.lng]);

  useEffect(() => {
    if (!leafletLoaded || !riderMarkerRef.current || !riderCoords) return;
    riderMarkerRef.current.setLatLng([riderCoords.lat, riderCoords.lng]);
    if (mapInstanceRef.current && orderStatus === 'out_for_delivery') {
      mapInstanceRef.current.panTo([riderCoords.lat, riderCoords.lng]);
    }
  }, [riderCoords?.lat, riderCoords?.lng, leafletLoaded, orderStatus]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200">
      <style>{`
        @keyframes marker-bounce {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-6px) scale(1.05); }
        }
        .clear-divicon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      {!leafletLoaded ? (
        <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center text-slate-400 space-y-2 animate-pulse z-10">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold font-sans">Locating pizza dispatch route...</span>
        </div>
      ) : (
        <div ref={mapContainerRef} className="w-full h-full z-0 pointer-events-auto" style={{ background: '#cbd5e1' }} />
      )}

      {distanceRemaining !== null && (
        <div className="absolute top-4 left-4 right-4 bg-slate-950/95 border border-slate-800 p-3 rounded-xl flex items-center justify-between z-10 text-white font-sans text-xs shadow-xl animate-fade-in backdrop-blur-sm">
          <div className="text-left font-mono text-[10px] space-y-0.5">
            <span className="text-slate-500 block font-sans font-black uppercase tracking-wider text-[8px]">Live GPS Router</span>
            <span className="text-emerald-400 font-extrabold flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mr-1.5"></span>
              Distance: {distanceRemaining} km
            </span>
          </div>
          <div className="text-right text-[10px] space-y-0.5">
            <span className="text-slate-500 block font-sans font-black uppercase tracking-wider text-[8px]">Transit Duration</span>
            <span className="text-blue-400 font-extrabold">🏍️ ~{durationRemaining} mins</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveTrackerSection({ orderId, onBackToMenu }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agentLocation, setAgentLocation] = useState(null);
  const [riderMoveOffset, setRiderMoveOffset] = useState(0.3); // simulated rider position percentage (0.0 to 1.0)
  const [routeStats, setRouteStats] = useState({ distance: null, duration: null });

  // Smart complaint and rating states
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isRecovered, setIsRecovered] = useState(false);
  const [recoveryCoupon, setRecoveryCoupon] = useState(null);

  // Callback / technical help states
  const [supportSubmitted, setSupportSubmitted] = useState(false);
  const [supportPhone, setSupportPhone] = useState('');
  const [supportDetails, setSupportDetails] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportType, setSupportType] = useState('callback'); // 'callback' or 'escalation'
  
  const socketRef = useRef(null);

  const branchCoords = {
    connaught: { lat: 28.6289, lng: 77.2190 },
    noida: { lat: 28.6273, lng: 77.3727 },
    gurgaon: { lat: 28.5244, lng: 77.0625 },
    dwarka: { lat: 28.5921, lng: 77.0622 }
  };

  const storeCoordinates = (order && order.franchiseId && branchCoords[order.franchiseId]) || branchCoords.connaught;
  const targetCoordinates = order?.customerLocation || order?.location || { lat: 28.6273, lng: 77.3727 }; // defaults to Noida

  // Load initial order on boot
  useEffect(() => {
    let active = true;
    fetch(`/api/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          setOrder(data);
          setLoading(false);
          if (data.phone) {
            setSupportPhone(data.phone);
          }
          setAgentLocation(null); // let the real or initial state resolve
        }
      })
      .catch((err) => {
        console.error('Error fetching tracker details:', err);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId]);

  // Connect socket.io live channel updates
  useEffect(() => {
    // Establish client socket connection
    const socket = io();
    socketRef.current = socket;

    socket.emit('join-order', orderId);

    // Order status update event receiver
    socket.on('order-status-received', (updatedOrder) => {
      console.log('[SOCKET] Received order status upgrade:', updatedOrder.status);
      setOrder(updatedOrder);
    });

    // Real Rider live coordinates from GPS emitter
    socket.on('agent-location-received', (data) => {
      console.log('[SOCKET] Received live physical coordinate updates for Rider:', data.location);
      setAgentLocation(data.location);
    });

    return () => {
      socket.off('order-status-received');
      socket.off('agent-location-received');
      socket.close();
    };
  }, [orderId]);

  // Active rider motion simulation to make it beautifully interactive if they don't use another tab
  useEffect(() => {
    if (!order) return;
    if (order.status !== 'out_for_delivery') return;

    // Simulate steady moving line on fallback visual map
    const interval = setInterval(() => {
      setRiderMoveOffset((prev) => {
        if (prev >= 1.0) return 1.0;
        return Number((prev + 0.05).toFixed(2));
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [order?.status]);

  // Interpolate simulated coordinate values along linear delta
  const getInterpolatedLocation = () => {
    // If the rider has a real GPS coordinate, prioritize it
    if (order?.liveCoordinates) {
      return order.liveCoordinates;
    }
    if (agentLocation) {
      return agentLocation;
    }
    
    if (order?.status === 'out_for_delivery' && riderMoveOffset < 1.0) {
      // Calculate linear step between Shop and destination
      const startLat = storeCoordinates.lat;
      const startLng = storeCoordinates.lng;
      const endLat = targetCoordinates.lat;
      const endLng = targetCoordinates.lng;

      return {
        lat: startLat + (endLat - startLat) * riderMoveOffset,
        lng: startLng + (endLng - startLng) * riderMoveOffset,
      };
    }
    
    if (order?.status === 'delivered') {
      return targetCoordinates;
    }

    return storeCoordinates;
  };

  const currentRiderPos = getInterpolatedLocation();

  // Smart Delivery ETA Engine
  const getSmartETA = () => {
    if (order?.status === 'delivered') return 0;
    
    // 1. Kitchen prep remaining
    const prepRemaining = ['pending', 'preparing'].includes(order?.status || '')
      ? Math.max(2, (order?.estimatedPrepTime || 10) - Math.floor((new Date() - new Date(order?.createdAt || Date.now())) / 60000))
      : 0;

    // 2. Route duration (from live OSRM stats if loaded, fallback to estimates)
    let transitTime = routeStats.duration || order?.estimatedDeliveryTime || 7;

    // 3. Status/assign offsets, scaling transit time down as rider advances!
    if (order?.status === 'out_for_delivery') {
      const progressFactor = 1 - riderMoveOffset;
      transitTime = Math.max(1, Math.ceil(transitTime * progressFactor));
    } else if (!['rider_assigned', 'packed'].includes(order?.status || '')) {
      transitTime += 2; // rider matching delay buffer
    }

    return prepRemaining + transitTime;
  };

  const currentSmartETA = getSmartETA();

  if (loading) {
    return (
      <div className="bg-white border rounded-3xl p-12 text-center max-w-md mx-auto my-12 animate-pulse space-y-4 font-sans">
        <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto"></div>
        <div className="h-6 w-1/2 bg-slate-200 rounded mx-auto"></div>
        <div className="h-4 w-3/4 bg-slate-100 rounded mx-auto"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white border rounded-3xl p-8 text-center max-w-md mx-auto my-12 text-slate-800 space-y-4">
        <h4 className="font-extrabold text-slate-900 text-lg">Order Tracker Not Loaded</h4>
        <p className="text-xs text-slate-500">Could not find tracking record with reference card index.</p>
        <button
          onClick={onBackToMenu}
          className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-blue-600 transition-colors cursor-pointer"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  // Visual status milestone parameters
  const statusMilestones = [
    { key: 'pending', label: 'Order Confirmed', desc: 'Store accepted your custom pizza order', icon: '📝' },
    { key: 'preparing', label: 'Preparing Food', desc: 'Baking loaded toppings fresh on hand-tossed base', icon: '🍕' },
    { key: 'packed', label: 'Packed', desc: 'Pizza packed inside insulated thermal boxes', icon: '📦' },
    { key: 'rider_assigned', label: 'Rider Assigned', desc: 'Dedicated rider matched to dispatch routes', icon: '👷' },
    { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Rider motoring hot pizza direct to your door', icon: '🏍️' },
    { key: 'delivered', label: 'Pizza Delivered', desc: 'Piping hot order passed and signed successfully!', icon: '🎁' }
  ];

  const getMilestoneIndex = (st) => {
    const idx = statusMilestones.findIndex((m) => m.key === st);
    return idx === -1 ? 0 : idx;
  };

  const activeIndex = getMilestoneIndex(order.status);

  // Submit Feedback & Rating to smart recovery engine
  const submitFeedback = async () => {
    if (rating === 0) return;
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order.id,
          userId: order.userId,
          userName: order.name,
          phone: order.phone,
          rating,
          feedbackText
        })
      });
      const data = await response.json();
      if (data.success) {
        setFeedbackSubmitted(true);
        if (data.isRecovered) {
          setIsRecovered(true);
          setRecoveryCoupon(data.coupon);
        }
      }
    } catch (err) {
      console.error('Error submitting pizza review:', err);
    }
  };

  // Submit Support Desk Help tickets
  const submitSupportTicket = async (typeLabel) => {
    if (!supportPhone) return;
    setSupportLoading(true);
    try {
      const response = await fetch('/api/support-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: order.userId,
          orderId: order.id,
          userName: order.name,
          phone: supportPhone,
          type: typeLabel,
          details: supportDetails || `Customer marked poor ${rating} stars rating review. Compensation code generation completed. Escalation active.`
        })
      });
      const data = await response.json();
      if (data.success) {
        setSupportSubmitted(true);
      }
    } catch (err) {
      console.error('Error sending operations ticket:', err);
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <div className="my-6 max-w-5xl mx-auto text-slate-810 text-left">
      <div className="flex items-center space-x-2.5 mb-6 text-left">
        <button
          onClick={onBackToMenu}
          className="p-2 border border-slate-150 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700" />
        </button>
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Live Track Pizza Cargo</h3>
          <p className="text-xs text-slate-500 mt-0.5">OrderID: <strong className="font-mono text-zinc-900 text-xs">{order.id}</strong></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-left">
        
        {/* Left Column Delivery milestones */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start pb-3 border-b border-slate-50 text-left">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block leading-none">Smart ETA Tracker</span>
                <span className="text-emerald-600 font-extrabold text-xs flex items-center mt-1.5">
                  <Flame className="w-4 h-4 mr-1 text-orange-500 animate-pulse animate-duration-1000" /> 
                  Promise: 30-Min Fresh Delivery
                </span>
                {order.status !== 'delivered' && (
                  <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                    <p className="text-slate-800 font-extrabold flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-blue-500 mr-1" />
                      <span>Estimated ETA: <strong className="text-blue-600 font-black">{currentSmartETA} mins</strong></span>
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Kitchen: {order.estimatedPrepTime || 10} mins | Transit: {routeStats.duration || order.estimatedDeliveryTime || 7} mins
                    </p>
                  </div>
                )}
              </div>
              <span className="bg-blue-600/10 border border-blue-500/20 text-blue-700 font-black px-2.5 py-1.5 rounded-2xl text-[10px] uppercase tracking-wide shrink-0">
                {order.status.replace('_', ' ')}
              </span>
            </div>

            {/* Visual Milestones Stepper progress list */}
            <div className="space-y-6 relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {statusMilestones.map((milestone, i) => {
                const orderTimelineItem = order.trackingTimeline?.find(item => item.status === milestone.key);
                const isCompleted = orderTimelineItem ? orderTimelineItem.completed : (i <= activeIndex);
                const isCurrent = order.status === milestone.key;
                const completedAtStr = orderTimelineItem?.updatedAt 
                  ? new Date(orderTimelineItem.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div key={milestone.key} className="relative text-left flex items-start space-x-4">
                    
                    {/* Circle Indicator */}
                    <div className={`absolute -left-[22px] top-1 w-3 h-3 rounded-full border transition-all ${
                      isCompleted ? 'bg-blue-600 border-blue-500 shadow-sm' : 'bg-white border-slate-205'
                    }`}>
                      {isCurrent && <span className="absolute inset-0 bg-blue-400 rounded-full animate-ping"></span>}
                    </div>

                    <span className="text-2xl pt-0.5 block leading-none">{milestone.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-xs font-black ${isCompleted ? 'text-slate-900 font-extrabold' : 'text-slate-405'}`}>
                          {milestone.label}
                        </h4>
                        {completedAtStr && (
                          <span className="font-mono text-[9px] text-zinc-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            {completedAtStr}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{milestone.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Post-Delivery Experience & Smart Recovery Card */}
          {order.status === 'delivered' && (
            <div className={`rounded-3xl border p-5 shadow-sm transition-all text-left ${feedbackSubmitted && rating <= 2 ? 'bg-rose-50/50 border-rose-200/60' : 'bg-white border-slate-100'}`}>
              {!feedbackSubmitted ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-rose-500">
                    <Star className="w-5 h-5 fill-current text-rose-500" />
                    <h4 className="font-extrabold text-xs text-slate-850 uppercase tracking-wider">How was your FoodFlow pizza meal?</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">Please rate your dining experience. If everything was great, we will pass reviews to the chefs; or we will issue instant resolution!</p>
                  
                  {/* Interactive Star Buttons */}
                  <div className="flex items-center space-x-1.5 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-0.5 focus:outline-none transition-transform active:scale-95 cursor-pointer text-slate-200"
                      >
                        <Star
                          className={`w-7 h-7 ${(hoverRating || rating) >= star ? 'text-yellow-405 fill-yellow-405' : 'text-slate-200'}`}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="text-xs font-black text-slate-600 ml-2">
                        {rating === 5 ? 'Excellent! 😍' : rating === 4 ? 'Good! 🙂' : rating === 3 ? 'Neutral 😐' : rating === 2 ? 'Bad 😞' : 'Terrible 😡'}
                      </span>
                    )}
                  </div>

                  <textarea
                    rows={2}
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Describe toppings, cooking, cheese stretch, or courier speeds here..."
                    className="w-full text-xs p-3 border border-slate-205 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-550"
                  />

                  <button
                    onClick={submitFeedback}
                    disabled={rating === 0}
                    className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-850 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-2 disabled:opacity-40 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Review Feedback</span>
                  </button>
                </div>
              ) : (
                /* Post submission states */
                <div className="space-y-4">
                  {/* High rating success */}
                  {rating >= 3 ? (
                    <div className="text-center py-2.5 space-y-2">
                      <div className="w-10 h-10 bg-emerald-100/80 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">✓</div>
                      <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-850">Thank you for rating us!</h4>
                      <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">We are thrilled you had a positive experience. Our kitchen team will continue to bake fresh pizza loaded with taste just for you!</p>
                    </div>
                  ) : (
                    /* Low rating complaint automatic trigger flow (smart recovery) */
                    <div className="space-y-4 font-sans text-left">
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start space-x-2.5">
                        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-red-650" />
                        <div>
                          <h5 className="font-black text-xs text-red-800">We Are Extremely Sorry!</h5>
                          <p className="text-[11px] leading-relaxed mt-0.5">Your star rating automatically opened a <strong>Ticket at our Complaint Management Recovery Desk</strong>.</p>
                        </div>
                      </div>

                      {/* Display generated dynamic coupon compensation */}
                      {isRecovered && recoveryCoupon && (
                        <div className="bg-white border-2 border-dashed border-red-300 rounded-2xl p-4 text-center space-y-2 bg-gradient-to-br from-yellow-50/20 to-red-50/20">
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block leading-none">Instant Compensation Coupon</span>
                          <p className="text-xs font-extrabold text-slate-700 leading-normal">{recoveryCoupon.description}</p>
                          <div className="py-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center space-x-1.5 max-w-[220px] mx-auto select-all">
                            <span className="font-mono text-sm font-black text-red-600">{recoveryCoupon.code}</span>
                          </div>
                          <span className="text-[9px] text-zinc-400 block">Copy and apply discount in your cart drawer on next pizza meal!</span>
                        </div>
                      )}

                      {/* Choice of recovery scheduling priority support callback option */}
                      {!supportSubmitted ? (
                        <div className="border border-red-150 rounded-2xl p-4 space-y-3 bg-white shadow-sm">
                          <div className="flex items-center space-x-2">
                            <h5 className="font-black text-xs text-slate-850">Request Priority Incident Action:</h5>
                          </div>
                          
                          <p className="text-[10px] text-slate-400 leading-normal">Request our Operations support center dynamic callback, or submit a formal escalation report to the active franchise branch manager.</p>
                          
                          <div className="flex border-b border-slate-100 text-[10px] uppercase tracking-wide font-extrabold space-x-4">
                            <button 
                              onClick={() => setSupportType('callback')} 
                              className={`pb-1 border-b-2 text-[10px] font-black ${supportType === 'callback' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-400'}`}
                            >
                              📞 Operations Callback
                            </button>
                            <button 
                              onClick={() => setSupportType('escalation')} 
                              className={`pb-1 border-b-2 text-[10px] font-black ${supportType === 'escalation' ? 'border-red-650 text-red-650' : 'border-transparent text-slate-400'}`}
                            >
                              ⚡ Franchise Escalation
                            </button>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-[9px] text-zinc-400 uppercase font-extrabold block mb-1">Callback Contact Mobile:</span>
                              <input
                                type="tel"
                                value={supportPhone}
                                onChange={(e) => setSupportPhone(e.target.value)}
                                placeholder="E.g. +91 99999 11111"
                                className="w-full text-xs p-2 border border-slate-205 rounded-xl block bg-slate-50/50 focus:bg-white"
                              />
                            </div>
                            <div>
                              <span className="text-[9px] text-zinc-400 uppercase font-extrabold block mb-1">Details & Requests:</span>
                              <textarea
                                rows={2}
                                value={supportDetails}
                                onChange={(e) => setSupportDetails(e.target.value)}
                                placeholder={supportType === 'callback' ? "Request specific callback hour or issue..." : "Franchise partner explanation..."}
                                className="w-full text-[11px] p-2 border border-slate-205 rounded-xl block bg-slate-50/50 focus:bg-white"
                              />
                            </div>
                            
                            <button
                              onClick={() => submitSupportTicket(supportType === 'callback' ? 'Operations Callback Requested' : 'Franchise Partner Escalation')}
                              disabled={supportLoading || !supportPhone}
                              className="w-full py-2 bg-red-650 hover:bg-red-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40"
                            >
                              {supportLoading ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <span>Schedule Resolution Ticket</span>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-1 bg-gradient-to-br from-emerald-50 to-teal-50">
                          <div className="text-xl">✅</div>
                          <h6 className="font-extrabold text-[11px] text-emerald-900 leading-normal">Priority Incident Scheduled!</h6>
                          <p className="text-[10px] leading-relaxed text-emerald-700 max-w-xs mx-auto">Operations desk has queued this item. We will dial contact phone <strong>{supportPhone}</strong> shortly. Thank you!</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Active Assigned Rider Card */}
          {order.deliveryAgentId && (
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-850 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 bg-white/10 text-yellow-400 rounded-2xl border border-white/10 flex items-center justify-center font-bold text-xl">
                  🏍️
                </div>
                <div className="text-left">
                  <span className="text-[9px] text-slate-400 uppercase font-bold tracking-widest block leading-none">Dedicated Rider</span>
                  <h4 className="font-extrabold text-white text-sm mt-1">{order.deliveryAgentName || 'Rohan Sharma'}</h4>
                  <p className="text-[10px] text-slate-405 flex items-center mt-1">
                    <Phone className="w-3 h-3 mr-1 text-blue-400 shrink-0 animate-pulse" /> {order.deliveryAgentPhone || '+919999911111'}
                  </p>
                </div>
              </div>
              <a
                href={`tel:${order.deliveryAgentPhone || '+919999911111'}`}
                className="px-3 py-2 bg-slate-800 hover:bg-zinc-800 rounded-xl text-xs font-bold border border-slate-700 text-slate-105 transition-colors"
              >
                Call Rider
              </a>
            </div>
          )}

          {/* Item details */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm text-left font-sans">
            <h5 className="font-bold text-slate-850 text-xs uppercase tracking-wider mb-2">Order Cart Items</h5>
            <div className="space-y-1.5 text-xs text-slate-600">
              {order.items.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <span>{it.quantity}x {it.product.name} ({it.size})</span>
                  <strong className="text-slate-800">₹{it.totalPrice}</strong>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-50 flex justify-between font-black text-slate-905">
                <span>Total amount paid</span>
                <span className="text-blue-600 font-mono">₹{order.totalAmount}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column Grid styled Local interactive Vector Map Fallback representation */}
        <div className="lg:col-span-7 space-y-4">
          
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-inner">
            <div className="flex items-center justify-between mb-3 text-left">
              <div className="flex items-center space-x-2">
                <Map className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-black uppercase text-slate-605 tracking-wider">Live Route Telemetry Map</h4>
              </div>
              <span className="text-[9px] bg-emerald-50 border border-emerald-250 text-emerald-600 px-2.5 py-0.5 rounded-full font-bold flex items-center font-sans tracking-wide">
                <Zap className="w-3 h-3 mr-1 text-emerald-500 animate-pulse" /> Live Satellite Link
              </span>
            </div>

            {/* True Leaflet OpenStreetMap Container */}
            <div className="w-full h-[380px] bg-slate-100 rounded-2xl relative overflow-hidden flex items-center justify-center border border-slate-200">
              <LeafletDeliveryMap
                startCoords={storeCoordinates}
                destCoords={targetCoordinates}
                riderCoords={currentRiderPos}
                orderId={order.id}
                orderStatus={order.status}
                onRouteCalculated={(stats) => setRouteStats(stats)}
              />
            </div>
          </div>

          <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-2xl text-left text-xs text-slate-500 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Your pizza order is connected dynamically to the FoodFlow dispatch network. The live map displays the courier moto track, delivery destination, and physical route coordinates calculated using real-time OpenStreetMap routing telemetry.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
