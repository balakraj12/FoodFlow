import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';
import { Truck, Navigation, Info, Play, RefreshCw } from 'lucide-react';

export default function DeliveryAgentSection() {
  const { user } = useSelector((state) => state.auth);
  const riderId = user?.id || 'agent-1';
  const riderName = user?.name || 'Rohan Sharma';
  const riderFranchiseId = user?.franchiseId || 'connaught';

  const [orders, setOrders] = useState([]);
  const [simulatStatus, setSimulatStatus] = useState('Ready');
  const [gpsLogs, setGpsLogs] = useState(['GPS device booted okay.', `Awaiting branch [${riderFranchiseId.toUpperCase()}] order route assignments`]);
  
  const socketRef = useRef(null);

  // Franchise coordinate lookup dictionary
  const branchCoords = {
    connaught: { lat: 28.6289, lng: 77.2190 },
    noida: { lat: 28.6273, lng: 77.3727 },
    gurgaon: { lat: 28.5244, lng: 77.0625 },
    dwarka: { lat: 28.5921, lng: 77.0622 }
  };

  const startLoc = branchCoords[riderFranchiseId] || { lat: 28.6289, lng: 77.2190 };

  const loadAgentJobs = () => {
    fetch(`/api/orders?role=delivery&userId=${riderId}&franchiseId=${riderFranchiseId}`)
      .then((res) => res.json())
      .then((data) => {
        // Find orders assigned to this agent or preparing in their branch
        const activeJob = data.filter((o) => o.deliveryAgentId === riderId || (o.status === 'preparing' && o.franchiseId === riderFranchiseId));
        setOrders(activeJob);
      })
      .catch((err) => console.error('Error loading rider cargo list:', err));
  };

  useEffect(() => {
    loadAgentJobs();
  }, []);

  // Initialize socket connections to emit locations prompt
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;
    
    socket.emit('join-agent', riderId);

    return () => {
      socket.close();
    };
  }, []);

  const handleUpdateStage = async (orderId, nextStatus) => {
    setGpsLogs((prev) => [...prev, `Updating order status index to [${nextStatus.toUpperCase()}]`]);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus, deliveryAgentId: riderId }),
      });
      if (res.ok) {
        loadAgentJobs();
      }
    } catch (err) {
      console.error('Failed to shift order status:', err);
    }
  };

  // Emitters representing live courier progress movement along target vector
  const triggerGPSCoordinateSync = (orderId) => {
    if (!socketRef.current) return;
    const targetOrder = orders.find(o => o.id === orderId);
    
    // Safety check for user coordinates
    const destLoc = targetOrder?.customerLocation || targetOrder?.location || { lat: 28.6273, lng: 77.3727 }; // Noida Sector 62 fallback

    setSimulatStatus('Transiting...');
    setGpsLogs((prev) => [...prev, `In-house dispatch: GPS Transceiver active. Syncing live coordinates...`]);

    let step = 0;
    const totalSteps = 10;
    
    const interval = setInterval(() => {
      if (step >= totalSteps) {
        clearInterval(interval);
        setSimulatStatus('Finished Destination');
        setGpsLogs((prev) => [...prev, `Arrived at customer's delivery gate! Dispatch marked completed.`]);
        handleUpdateStage(orderId, 'delivered');
        return;
      }

      // Interpolate progress percentage (0.1 -> 1.0)
      const ratio = (step + 1) / totalSteps;
      const calculatedLat = startLoc.lat + (destLoc.lat - startLoc.lat) * ratio;
      const calculatedLng = startLoc.lng + (destLoc.lng - startLoc.lng) * ratio;

      // Mathematical distance remaining to destination (Haversine formula in km)
      const R = 6371; // Earth radius in km
      const dLat = (destLoc.lat - calculatedLat) * Math.PI / 180;
      const dLon = (destLoc.lng - calculatedLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(calculatedLat * Math.PI / 180) * Math.cos(destLoc.lat * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distanceRemaining = Number((R * c).toFixed(2));

      // Assume courier speed of 1.5 minutes per km transit remaining
      const estimatedDeliveryTime = Math.max(1, Math.ceil(distanceRemaining * 1.5));

      const coordinatePayload = {
        agentId: riderId,
        orderId: orderId,
        location: { lat: calculatedLat, lng: calculatedLng },
        distanceRemaining,
        estimatedDeliveryTime,
        riderStatus: 'in_transit'
      };

      // Emit live coordinate updates to socket to sync customer Tracker tab visually!
      socketRef.current?.emit('update-agent-location', coordinatePayload);
      
      setGpsLogs((prev) => [
        ...prev,
        `EMIT: Lat ${calculatedLat.toFixed(5)}, Lng ${calculatedLng.toFixed(5)} | Rem: ${distanceRemaining}km (~${estimatedDeliveryTime} mins)`
      ]);

      step++;
    }, 2000); // Emits every 2 seconds for active map simulation triggers!
  };

  const assignedOrders = orders.filter((o) => o.deliveryAgentId === riderId);
  const pendingCollection = orders.filter((o) => !o.deliveryAgentId && o.status === 'preparing');

  return (
    <div className="my-6 text-slate-800 text-left">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Rider Dispatch Terminal</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Assigned profile: <strong className="font-bold text-slate-800">{riderName} ({riderId})</strong> | 
          Branch Area: <strong className="font-extrabold text-blue-600 uppercase font-mono">{riderFranchiseId} Store</strong>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column grid lists assigned transit jobs */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center justify-between">
              <span>📚 Your Assigned Deliveries ({assignedOrders.length})</span>
              <button
                onClick={loadAgentJobs}
                className="p-1.5 hover:bg-slate-50 border rounded-lg hover:text-blue-500 transition-all cursor-pointer"
                title="Reload assignments list"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </h4>

            {assignedOrders.length === 0 ? (
              <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400">
                <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="font-bold text-slate-705">No Active Deliveries Scheduled</p>
                <p className="text-xs text-slate-500 mt-1">Accept pending pizza boxes from kitchen backlog to shift operations.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignedOrders.map((o) => (
                  <div
                    key={o.id}
                    className="bg-slate-50/50 border border-slate-150 p-5 rounded-2xl space-y-4 text-left"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-150 text-[10px] uppercase font-bold text-slate-500">
                      <span>OrderID: <strong className="font-mono text-xs text-slate-905">{o.id}</strong></span>
                      <span className="bg-slate-200/80 text-slate-800 font-extrabold px-2.5 py-1 rounded">
                        Stage: {o.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-650">
                      <p className="font-bold">Recipient: <span className="text-slate-900">{o.name}</span></p>
                      <p>Phone: <span className="font-mono">{o.phone}</span></p>
                      <p>Location: <span className="text-slate-905">{o.address}</span></p>
                      
                       <div className="bg-white p-2.5 border rounded-xl space-y-1 text-[11px] mt-2">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider leading-none block">Items to deliver</span>
                        {o.items.map((it) => (
                          <p key={it.id} className="font-medium">
                            <strong className="text-blue-600 font-extrabold">{it.quantity}x</strong> {it.product.name} ({it.size} size base)
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Operational controls */}
                    <div className="pt-2 border-t border-slate-150 flex flex-wrap gap-2">
                      {o.status === 'preparing' && (
                        <button
                          onClick={() => handleUpdateStage(o.id, 'out_for_delivery')}
                          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black shadow cursor-pointer"
                        >
                          Mark Collected & Ship 🏍
                        </button>
                      )}

                      {o.status === 'out_for_delivery' && (
                        <div className="flex space-x-2 w-full">
                          <button
                            onClick={() => triggerGPSCoordinateSync(o.id)}
                            className="bg-orange-550 hover:bg-orange-600 text-white rounded-xl py-2.5 px-4 text-xs font-black shadow flex items-center justify-center space-x-1 flex-1 cursor-pointer animate-pulse"
                          >
                            <Play className="w-3.5 h-3.5 shrink-0 text-white fill-white" />
                            <span>Emit GPS Route Motion Simulator</span>
                          </button>
                          
                          <button
                            onClick={() => handleUpdateStage(o.id, 'delivered')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-2.5 px-4 text-xs font-bold shadow flex-1 cursor-pointer"
                          >
                            Confirm Quick Delivery ✔
                          </button>
                        </div>
                      )}

                      {o.status === 'delivered' && (
                        <span className="text-emerald-600 text-xs font-black flex items-center">
                          ✔ Job finished. Pizza box successfully handed over.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Kitchen backlog collection */}
          <div className="bg-white border rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest block text-left">
              📦 Kitchen Collection Box backlog ({pendingCollection.length})
            </h4>

            {pendingCollection.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 border border-dashed rounded-xl">No pending boxes waiting for rider acceptance right now.</p>
            ) : (
              <div className="divide-y divide-slate-100 bg-slate-50 rounded-2xl border p-2">
                {pendingCollection.map((o) => (
                  <div key={o.id} className="p-3 flex items-center justify-between">
                    <div className="text-left space-y-1">
                      <strong className="text-xs font-bold text-slate-800">OrderID: {o.id}</strong>
                      <p className="text-[10px] text-slate-400 leading-none">{o.address.substr(0, 30)}...</p>
                    </div>
                    <button
                      onClick={() => handleUpdateStage(o.id, 'preparing')}
                      className="inline-flex items-center px-3.5 py-2 text-[11px] font-bold leading-none bg-blue-600 hover:bg-blue-500 border border-blue-500/20 text-white rounded-xl transition-colors cursor-pointer"
                    >
                      Accept order
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column GPS logs showing coordination progress */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-sm text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Navigation className="w-4 h-4 text-blue-400 animate-pulse" />
                <h4 className="text-xs font-black text-white uppercase tracking-wider">EMULATED GPS RECEIVER LOGS</h4>
              </div>
              <span className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                simulatStatus === 'Ready' ? 'bg-zinc-800' : 'bg-orange-600 text-white animate-pulse'
              }`}>
                {simulatStatus}
              </span>
            </div>

            <div className="bg-slate-950 p-4 border border-slate-900 rounded-2xl h-[280px] overflow-y-auto font-mono text-[10px] text-slate-300 mt-4 space-y-2 select-text">
              {gpsLogs.map((log, i) => (
                <div key={i} className="flex items-start">
                  <span className="text-slate-600 mr-2">[{new Date().toLocaleTimeString()}]</span>
                  <p className="flex-1 whitespace-pre-line leading-relaxed text-slate-300">{log}</p>
                </div>
              ))}
            </div>

            <div className="bg-slate-950 px-3.5 py-3 border border-slate-850 rounded-xl mt-4 flex items-center space-x-2 text-[10px] text-slate-400">
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>GPS integration:</strong> Click the <strong>Route Motion Simulator</strong> on an assigned parcel to automatically emit linear coordinates over standard WebSocket rooms.
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
