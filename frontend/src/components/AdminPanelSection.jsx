import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Plus, Trash2, Edit2, Check, DollarSign, ShoppingBag, Truck, Clipboard, ShieldAlert, Image, Save, Building2, XCircle, TrendingUp, Sparkles, MessageSquare, Star, Trash, Eye, ThumbsUp, Flame, Play, Clock, Filter, AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminPanelSection() {
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = !user?.franchiseId || user.franchiseId === 'global';

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);

  // States for Manage active tab: 'orders' | 'inventory' | 'branches' | 'business'
  const [adminTab, setAdminTab] = useState('orders');

  // Business Intelligent features data states
  const [upsellStats, setUpsellStats] = useState({ totalClicks: 0, totalConversions: 0, conversionRate: '0.0%' });
  const [feedbackList, setFeedbackList] = useState([]);
  const [ticketList, setTicketList] = useState([]);
  const [recsList, setRecsList] = useState([]);

  // States for creating custom pairing recommendation rules
  const [triggerId, setTriggerId] = useState('');
  const [recommendedId, setRecommendedId] = useState('');
  const [reasonRule, setReasonRule] = useState('');
  const [ruleLoading, setRuleLoading] = useState(false);

  // Menu item Form State
  const [editingProduct, setEditingProduct] = useState(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: 'Pizza',
    description: '',
    basePrice: 149,
    image: '',
    isVeg: true,
  });

  // Franchise Form States (Super Admin Only)
  const [showFranchiseForm, setShowFranchiseForm] = useState(false);
  const [editingFranchise, setEditingFranchise] = useState(null);
  const [franchiseFormData, setFranchiseFormData] = useState({
    id: '',
    name: '',
    manager: '',
    phone: '',
    email: '',
    address: '',
    lat: 28.6139,
    lng: 77.2090,
    radius: 8,
    operatingHours: '11:00 AM - 11:30 PM',
    logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=200',
    isActive: true,
    isOpen: true
  });

  // Assign agent state map
  const [assignedAgentMap, setAssignedAgentMap] = useState({});

  const loadAdminMetadata = () => {
    setLoading(true);
    const franchiseIdQuery = user?.franchiseId && user.franchiseId !== 'global'
      ? `&franchiseId=${user.franchiseId}`
      : '';
    Promise.all([
      fetch(`/api/orders?role=admin${franchiseIdQuery}`).then((res) => res.json()),
      fetch('/api/menu').then((res) => res.json()),
      fetch('/api/delivery/agents').then((res) => res.json()),
      fetch('/api/franchises').then((res) => res.json()),
      fetch('/api/upsell/analytics').then((res) => res.json()).catch(() => ({})),
      fetch('/api/feedback').then((res) => res.json()).catch(() => ([])),
      fetch('/api/support-requests').then((res) => res.json()).catch(() => ([])),
      fetch('/api/recommendations').then((res) => res.json()).catch(() => ([])),
    ])
      .then(([ordersData, productsData, agentsData, franchisesData, upsellData, feedbackData, supportData, recommendationsData]) => {
        setOrders(ordersData);
        setProducts(productsData);
        
        // Filter agents by franchise for franchise admin
        if (user?.franchiseId && user.franchiseId !== 'global') {
          setAgents(agentsData.filter((a) => a.franchiseId === user.franchiseId));
        } else {
          setAgents(agentsData);
        }
        
        setFranchises(franchisesData);
        setUpsellStats(upsellData || { totalClicks: 0, totalConversions: 0, conversionRate: '0.0%' });
        setFeedbackList(feedbackData || []);
        setTicketList(supportData || []);
        setRecsList(recommendationsData || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading admin tables:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadAdminMetadata();
  }, [adminTab]);

  const handleUpdateOrderStatus = async (orderId, itemStatus) => {
    const agentId = assignedAgentMap[orderId];
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: itemStatus, deliveryAgentId: agentId || undefined }),
      });
      if (res.ok) {
        // Reload list directly
        loadAdminMetadata();
      }
    } catch (err) {
      console.error('Error shifting order status:', err);
    }
  };

  const handleDeleteProduct = async (prodId) => {
    if (!confirm('Are you absolutely sure you want to delete this menu item?')) return;
    try {
      const res = await fetch(`/api/menu/${prodId}`, { method: 'DELETE' });
      if (res.ok) {
        setProducts(products.filter((p) => p.id !== prodId));
      }
    } catch (err) {
      console.error('Error deleting product item:', err);
    }
  };

  const handleOpenProductForm = (prod) => {
    if (prod) {
      setEditingProduct(prod);
      setFormData({
        id: prod.id,
        name: prod.name,
        category: prod.category,
        description: prod.description,
        basePrice: prod.basePrice,
        image: prod.image,
        isVeg: prod.isVeg,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        id: `pizza-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        category: 'Pizza',
        description: '',
        basePrice: 149,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=600',
        isVeg: true,
      });
    }
    setShowProductForm(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    
    // Complete structured object with size increments and crust mappings
    const finalProduct = {
      id: formData.id,
      name: formData.name,
      category: formData.category,
      description: formData.description,
      basePrice: Number(formData.basePrice),
      image: formData.image,
      isVeg: formData.isVeg,
      sizes: {
        Regular: Number(formData.basePrice),
        Medium: Number(formData.basePrice) + 120,
        Large: Number(formData.basePrice) + 250,
      },
      crusts: {
        'Classic Hand Tossed': 0,
        'Cheese Burst': 75,
        'Wheat Thin Crust': 40,
      },
    };

    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalProduct),
      });

      if (res.ok) {
        setShowProductForm(false);
        setEditingProduct(null);
        loadAdminMetadata();
      }
    } catch (err) {
      console.error('Failed to write product record:', err);
    }
  };

  const handleToggleFranchiseOpen = async (franchise) => {
    const updated = { ...franchise, isOpen: !franchise.isOpen };
    try {
      const res = await fetch('/api/franchises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        setFranchises(franchises.map(f => f.id === franchise.id ? updated : f));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFranchiseActive = async (franchise) => {
    const updated = { ...franchise, isActive: !franchise.isActive };
    try {
      const res = await fetch('/api/franchises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (res.ok) {
        setFranchises(franchises.map(f => f.id === franchise.id ? updated : f));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenFranchiseForm = (fran) => {
    if (fran) {
      setEditingFranchise(fran);
      setFranchiseFormData({
        id: fran.id,
        name: fran.name,
        manager: fran.ownerName,
        phone: fran.contactNumber,
        email: fran.email,
        address: fran.address,
        lat: fran.location.lat,
        lng: fran.location.lng,
        radius: fran.deliveryRadius,
        operatingHours: fran.operatingHours,
        logo: fran.logo,
        isActive: fran.isActive,
        isOpen: fran.isOpen
      });
    } else {
      setEditingFranchise(null);
      setFranchiseFormData({
        id: `branch-${Math.floor(100 + Math.random() * 900)}`,
        name: '',
        manager: '',
        phone: '',
        email: '',
        address: '',
        lat: 28.6139,
        lng: 77.2090,
        radius: 8,
        operatingHours: '11:00 AM - 11:30 PM',
        logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=200',
        isActive: true,
        isOpen: true
      });
    }
    setShowFranchiseForm(true);
  };

  const handleSaveFranchise = async (e) => {
    e.preventDefault();
    const payload = {
      id: franchiseFormData.id,
      name: franchiseFormData.name,
      ownerName: franchiseFormData.manager,
      contactNumber: franchiseFormData.phone,
      email: franchiseFormData.email,
      address: franchiseFormData.address,
      location: {
        lat: Number(franchiseFormData.lat),
        lng: Number(franchiseFormData.lng)
      },
      deliveryRadius: Number(franchiseFormData.radius),
      operatingHours: franchiseFormData.operatingHours,
      logo: franchiseFormData.logo,
      isActive: franchiseFormData.isActive,
      isOpen: franchiseFormData.isOpen
    };

    try {
      const res = await fetch('/api/franchises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowFranchiseForm(false);
        setEditingFranchise(null);
        loadAdminMetadata();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteFranchise = async (franId) => {
    if (!confirm('Are you absolutely sure you want to delete this franchise branch? All associated orders tracking logs will remain preserved.')) return;
    try {
      const res = await fetch(`/api/franchises/${franId}`, { method: 'DELETE' });
      if (res.ok) {
        setFranchises(franchises.filter(f => f.id !== franId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePairingRule = async (e) => {
    e.preventDefault();
    if (!triggerId || !recommendedId || !reasonRule) return;
    setRuleLoading(true);
    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          triggerProductId: triggerId,
          recommendedProductIds: [recommendedId],
          reason: reasonRule
        })
      });
      const data = await response.json();
      if (data.success) {
        setTriggerId('');
        setRecommendedId('');
        setReasonRule('');
        loadAdminMetadata();
      }
    } catch (err) {
      console.error('Error adding recommend rules:', err);
    } finally {
      setRuleLoading(false);
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await fetch(`/api/recommendations/${ruleId}`, { method: 'DELETE' });
      loadAdminMetadata();
    } catch (e) {
      console.warn('Delete failed', e);
    }
  };

  const handleResolveTicket = async (ticketId) => {
    try {
      await fetch(`/api/support-requests/${ticketId}/resolve`, { method: 'PATCH' });
      loadAdminMetadata();
    } catch (err) {
      console.error('Resolve failed', err);
    }
  };

  // Helper metric sums
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const revenueAmount = deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const activePreparingCount = orders.filter((o) => o.status === 'preparing' || o.status === 'pending').length;

  return (
    <div className="my-6 text-slate-800 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Admin Operations Control Dashboard</h3>
          <p className="text-xs text-slate-500 mt-0.5">Control live order stages, assign transport riders, and update menu products.</p>
        </div>
        
        {/* Simple visual section switches */}
        <div className="flex mt-4 md:mt-0 space-x-2 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setAdminTab('orders')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              adminTab === 'orders' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Live Orders ({orders.length})
          </button>
          <button
            onClick={() => setAdminTab('inventory')}
            className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
              adminTab === 'inventory' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Manage Menu ({products.length})
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setAdminTab('branches')}
              className={`px-4 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                adminTab === 'branches' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Manage Branches ({franchises.length})
            </button>
          )}
          <button
            onClick={() => setAdminTab('business')}
            className={`px-4 py-2 rounded-lg font-black transition-all cursor-pointer flex items-center space-x-1 ${
              adminTab === 'business' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm' : 'text-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/50 border border-indigo-100/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Business Systems</span>
          </button>
        </div>
      </div>

      {/* Dynamic Branch Controller Panel */}
      {user?.franchiseId && user.franchiseId !== 'global' ? (
        (() => {
          const userBranch = franchises.find(f => f.id === user.franchiseId);
          return userBranch ? (
            <div className="bg-slate-900 text-white rounded-3xl p-5 mb-6 flex flex-col sm:flex-row items-center justify-between border border-slate-800 shadow text-left">
              <div className="flex items-center space-x-3 text-left">
                <img src={userBranch.logo} alt={userBranch.name} className="w-12 h-12 rounded-xl object-cover border border-slate-700/50" />
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-blue-400 block mb-0.5 animate-pulse">Active Store Branch Link</span>
                  <h4 className="text-base font-black text-white leading-tight">{userBranch.name}</h4>
                  <p className="text-[10px] text-slate-400">{userBranch.address} (Manager: {userBranch.ownerName})</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 mt-4 sm:mt-0 select-none shrink-0 border-l border-slate-800 pl-4">
                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                  userBranch.isOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-red-500/25 text-red-350 border-red-500/30'
                }`}>
                  {userBranch.isOpen ? '🟢 Open Now' : '🔴 Closed'}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleFranchiseOpen(userBranch)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-[10px] rounded-lg transition-all shadow cursor-pointer uppercase tracking-tight"
                >
                  {userBranch.isOpen ? 'Set Closed' : 'Set Open'}
                </button>
              </div>
            </div>
          ) : null;
        })()
      ) : (
        <div className="bg-blue-900 text-white rounded-3xl p-5 mb-6 flex flex-col sm:flex-row items-center justify-between border border-blue-800 shadow">
          <div className="flex items-center space-x-3 text-left">
            <div className="p-2.5 bg-blue-950/40 rounded-xl">👑</div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-blue-300 block mb-0.5">Central HQ Controls</span>
              <h4 className="text-base font-black text-white leading-tight">Super Administrative Portal</h4>
              <p className="text-[10px] text-blue-200">Global access mapping database, full operational logs visibility and franchises monitoring.</p>
            </div>
          </div>
          <span className="mt-3 sm:mt-0 px-3 py-1 bg-white/10 text-white rounded-full text-[10px] uppercase font-black border border-white/10">
            Global Admin
          </span>
        </div>
      )}

      {/* DASHBOARD METRICS SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 text-left">
        <div className="bg-white border rounded-2xl p-4 flex items-center space-x-4 shadow-sm">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Gross Sales Revenue</span>
            <span className="text-xl font-black text-slate-950 mt-1 block">₹{revenueAmount}</span>
            <span className="text-[9px] text-emerald-600 font-bold mt-1 block">✔ From CP area deliveries</span>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4 flex items-center space-x-4 shadow-sm text-left">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Delivered Pizza count</span>
            <span className="text-xl font-black text-slate-950 mt-1 block">{deliveredOrders.length} Completed</span>
            <span className="text-[9px] text-slate-400 block mt-1">Total in logs: {orders.length}</span>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4 flex items-center space-x-4 shadow-sm text-left">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Clipboard className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Live Kitchen Backlog</span>
            <span className="text-xl font-black text-slate-950 mt-1 block">{activePreparingCount} Active</span>
            <span className="text-[9px] text-orange-550 block mt-1">Pending setup reviews</span>
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4 flex items-center space-x-4 shadow-sm text-left font-sans">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">In-House Courier Pool</span>
            <span className="text-xl font-black text-slate-950 mt-1 block">{agents.filter(a => a.status === 'online' || a.status === 'delivering').length} Online</span>
            <span className="text-[9px] text-emerald-605 block mt-1">Active transit agents</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center animate-pulse">
          <p className="text-sm text-slate-500 font-bold">Retrieving operational metadata tables...</p>
        </div>
      ) : adminTab === 'orders' ? (
        
        // Tab : LIVE ORDERS LIST
        <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between text-left">
            <h4 className="font-extrabold text-sm text-slate-905">Active Order Pipeline</h4>
            <span className="text-[11px] text-slate-500 font-medium font-sans">Click state switches to update customer tracker in real time!</span>
          </div>

          {orders.length === 0 ? (
            <div className="p-12 text-center text-slate-405">
              <Clipboard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">No Orders in Database yet.</p>
              <p className="text-xs text-slate-500 mt-1 font-normal">When clients complete emulated checkouts, items pop up straight here!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-450 tracking-wider">
                    <th className="p-4">OrderID</th>
                    <th className="p-4 mr-4 text-left">Customer Info</th>
                    <th className="p-4">Pizza Items Ordered</th>
                    <th className="p-4">Total Price</th>
                    <th className="p-4">Assign Active Rider</th>
                    <th className="p-4 text-center">Update Order Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((o) => {
                    const selectAgentVal = assignedAgentMap[o.id] || o.deliveryAgentId || '';
                    return (
                      <tr key={o.id} className="hover:bg-slate-50/50 text-left">
                        <td className="p-4 font-mono font-bold text-slate-900">{o.id}</td>
                        <td className="p-4 text-left">
                          <p className="font-extrabold text-slate-800 leading-none">{o.name}</p>
                          <span className="text-[10px] text-slate-400 block mt-1">{o.phone}</span>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-1 max-w-[150px] truncate" title={o.address}>
                            {o.address}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="space-y-0.5">
                            {o.items.map((it) => (
                              <p key={it.id} className="text-slate-600 font-medium leading-none">
                                <strong className="text-blue-600 font-extrabold">{it.quantity}x</strong> {it.product.name} ({it.size})
                              </p>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-extrabold text-slate-900 leading-none">₹{o.totalAmount}</p>
                          <span className="text-[9px] inline-block px-1.5 py-0.5 rounded uppercase font-black tracking-wide mt-1 text-emerald-800 bg-emerald-50 leading-none">
                            {o.paymentMethod.toUpperCase()} - PAID ✔
                          </span>
                        </td>
                        <td className="p-4">
                          {o.status === 'delivered' ? (
                            <span className="text-[10px] font-bold text-emerald-600 flex items-center">
                              🏍 Delivered by {o.deliveryAgentName || 'Rider'}
                            </span>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <select
                                value={selectAgentVal}
                                onChange={(e) => setAssignedAgentMap({ ...assignedAgentMap, [o.id]: e.target.value })}
                                className="bg-slate-50 border border-slate-200 rounded p-1 text-[11px] focus:outline-none"
                              >
                                <option value="">Select Rider...</option>
                                {agents
                                  .filter((a) => a.status === 'online')
                                  .map((ag) => (
                                    <option key={ag.id} value={ag.id}>
                                      🏍 {ag.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col space-y-1 items-center">
                            <div className="inline-flex flex-wrap rounded-lg border border-slate-205 p-0.5 bg-slate-100/80 text-[9px] max-w-[280px]">
                              {['pending', 'preparing', 'packed', 'rider_assigned', 'out_for_delivery', 'delivered'].map((st) => {
                                const isCurrent = o.status === st;
                                return (
                                  <button
                                    key={st}
                                    onClick={() => handleUpdateOrderStatus(o.id, st)}
                                    className={`px-1.5 py-1 m-0.5 rounded font-extrabold uppercase tracking-wide leading-none transition-all cursor-pointer ${
                                      isCurrent
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                                    }`}
                                  >
                                    {st === 'pending' ? 'Conf' : st === 'preparing' ? 'Cook' : st === 'packed' ? 'Pack' : st === 'rider_assigned' ? 'Rider' : st === 'out_for_delivery' ? 'Ship' : 'Done'}
                                  </button>
                                );
                              })}
                            </div>
                            <span className="text-[9px] font-mono text-slate-450 uppercase tracking-wider block">Stage Status: {o.status}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : adminTab === 'inventory' ? (
        
        // Tab : PRODUCT INVENTORY CRUD GRID
        <div className="space-y-4 text-left font-sans">
          
          <div className="flex justify-between items-center text-left">
            <h4 className="font-extrabold text-slate-800 text-sm">Flowing Pizza Menu Inventory List</h4>
            <button
              onClick={() => handleOpenProductForm()}
              className="inline-flex items-center px-4 py-2.5 text-xs font-black leading-none bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 mr-1 text-white" /> Create New Pizza
            </button>
          </div>

          <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-black text-slate-450 tracking-wider">
                  <th className="p-4">Pizza Media</th>
                  <th className="p-4">Pizza Name</th>
                  <th className="p-4">Food Category</th>
                  <th className="p-4">Reg Cost</th>
                  <th className="p-4">Veg/Non-veg</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="p-4">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                        referrerPolicy="no-referrer"
                      />
                    </td>
                    <td className="p-4 text-left">
                      <strong className="text-slate-850 font-extrabold">{p.name}</strong>
                      <p className="text-[10px] text-slate-400 leading-tight mt-0.5 truncate max-w-xs">{p.description}</p>
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 border text-[10px] font-bold px-2 py-0.5 rounded">
                        {p.category}
                      </span>
                    </td>
                    <td className="p-4 font-black text-slate-900 font-mono">₹{p.basePrice}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${p.isVeg ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                        {p.isVeg ? 'Veg 🥬' : 'Non-veg 🍖'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleOpenProductForm(p)}
                          className="p-1.5 border border-slate-200 rounded text-slate-500 hover:text-blue-650 hover:bg-blue-50/55 cursor-pointer"
                          title="Edit meta details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 border border-slate-200 rounded text-slate-500 hover:text-red-650 hover:bg-red-50/55 cursor-pointer"
                          title="Delete permanently"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      ) : adminTab === 'branches' ? (
        // Tab: FRANCHISE BRANCHES LIST (Super Admin Only)
        <div className="space-y-4 text-left font-sans">
          <div className="flex justify-between items-center text-left">
            <h4 className="font-extrabold text-slate-800 text-sm">Franchise Outlets Registry ({franchises.length})</h4>
            <button
              onClick={() => handleOpenFranchiseForm()}
              className="inline-flex items-center px-4 py-2.5 text-xs font-black leading-none bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 mr-1 text-white" /> Register New Franchise
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {franchises.map((fran) => (
              <div key={fran.id} className="bg-white border rounded-3xl p-5 shadow-sm flex flex-col space-y-4 text-left">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3 text-left">
                    <img src={fran.logo} alt={fran.name} className="w-12 h-12 rounded-xl object-cover border" />
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 leading-tight">{fran.name}</h4>
                      <span className="text-[10px] text-blue-650 font-mono font-bold uppercase">{fran.id}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-1 shrink-0">
                    <span className={`px-2 py-0.5 text-[9px] font-black tracking-wider rounded uppercase ${
                      fran.isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {fran.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-black tracking-wider rounded uppercase ${
                      fran.isOpen ? 'bg-blue-50 text-blue-800 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {fran.isOpen ? 'Open Now 🟢' : 'Closed 🔴'}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <p>👤 <strong>Manager:</strong> {fran.ownerName}</p>
                  <p>📞 <strong>Phone:</strong> {fran.contactNumber}</p>
                  <p>📧 <strong>Email:</strong> {fran.email}</p>
                  <p>📍 <strong>Address:</strong> {fran.address}</p>
                  <p>⏰ <strong>Hours:</strong> {fran.operatingHours}</p>
                  <div className="flex items-center justify-between text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-100 mt-2 font-mono">
                    <span>🧭 Radius: <strong>{fran.deliveryRadius} km</strong></span>
                    <span>Coordinates: <strong>{fran.location.lat.toFixed(2)}, {fran.location.lng.toFixed(2)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-2 text-[10px]">
                  <div className="flex space-x-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleFranchiseOpen(fran)}
                      className="px-2.5 py-1 text-[10px] bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-slate-700 font-black cursor-pointer shadow-sm"
                    >
                      {fran.isOpen ? 'Set Closed 🔴' : 'Set Open 🟢'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleFranchiseActive(fran)}
                      className="px-2 py-1 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded text-slate-500 font-bold cursor-pointer"
                    >
                      {fran.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      type="button"
                      onClick={() => handleOpenFranchiseForm(fran)}
                      className="p-1.5 border border-slate-200 rounded text-slate-500 hover:text-blue-650 hover:bg-blue-50 cursor-pointer"
                      title="Edit Branch"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFranchise(fran.id)}
                      className="p-1.5 border border-slate-200 rounded text-slate-500 hover:text-red-650 hover:bg-red-50 cursor-pointer"
                      title="Delete Branch"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Tab : BUSINESS SYSTEMS, RECOMMENDATIONS AND COMPLAINT RECOVERY WORKSPACE
        <div className="space-y-8 text-left font-sans text-xs">
          {/* Smart Features KPI Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* KPI 1: Upsell Recommendation Conversions */}
            <div className="bg-white border border-blue-100 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider font-mono">Recommendation Analytics</span>
                <Sparkles className="w-5 h-5 text-blue-500 shrink-0" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900">{upsellStats.totalConversions || 0}</span>
                <span className="text-xs text-slate-400 font-medium font-sans">conversions</span>
              </div>
              <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-500">
                <span>Clicks logged: <strong>{upsellStats.totalClicks || 0}</strong></span>
                <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">Conv Rate: {upsellStats.conversionRate || '0.0%'}</span>
              </div>
            </div>

            {/* KPI 2: Complaint Recovery Score */}
            <div className="bg-white border border-rose-100 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider font-mono">Recovers Monitor</span>
                <MessageSquare className="w-5 h-5 text-rose-500 shrink-0" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900">
                  {feedbackList.length > 0 
                    ? (feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length).toFixed(1) 
                    : "5.0"}
                </span>
                <span className="text-xs text-slate-400 font-medium">Avg Rating out of {feedbackList.length} reviews</span>
              </div>
              <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-500">
                <span>Low Ratings: <strong>{feedbackList.filter(f => f.rating <= 2).length}</strong></span>
                <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">Auto Coup Generated: {feedbackList.filter(f => f.rating <= 2).length}</span>
              </div>
            </div>

            {/* KPI 3: Callback Queue Escalation */}
            <div className="bg-white border border-amber-100 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider font-mono">Operations Escalations</span>
                <TrendingUp className="w-5 h-5 text-amber-500 shrink-0" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-slate-900">{ticketList.filter(t => !t.resolved).length}</span>
                <span className="text-xs text-slate-400 font-medium">Active CRM callback tickets</span>
              </div>
              <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-500">
                <span>Handling: <strong>Priority Priority</strong></span>
                <span className="text-amber-750 bg-amber-50 px-1.5 py-0.5 rounded font-bold">System Status: Live</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left side: Intelligent Pairings configuration console */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm uppercase text-slate-850 flex items-center space-x-1">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Configure Recommendation Pairs</span>
                </h4>
                
                <form onSubmit={handleCreatePairingRule} className="space-y-3.5 text-left">
                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-black mb-1">Trigger Pizza ID</label>
                    <select
                      value={triggerId}
                      onChange={(e) => setTriggerId(e.target.value)}
                      required
                      className="bg-slate-50 border border-slate-200 p-2 w-full rounded-lg text-xs"
                    >
                      <option value="">Select Trigger Pizza...</option>
                      {products.filter(p => p.category === 'Pizza').map(prod => (
                        <option key={prod.id} value={prod.id}>{prod.name} ({prod.id})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-black mb-1">Recommended Side/Snack ID</label>
                    <select
                      value={recommendedId}
                      onChange={(e) => setRecommendedId(e.target.value)}
                      required
                      className="bg-slate-50 border border-slate-200 p-2 w-full rounded-lg text-xs"
                    >
                      <option value="">Select side/dessert product...</option>
                      {products.filter(p => p.category !== 'Pizza').map(prod => (
                        <option key={prod.id} value={prod.id}>{prod.name} (Price: ₹{prod.basePrice})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 text-[10px] uppercase font-black mb-1">Custom Recommendation Reason Tag</label>
                    <input
                      type="text"
                      required
                      value={reasonRule}
                      onChange={(e) => setReasonRule(e.target.value)}
                      placeholder="E.g. Pairs perfectly to complete your cheese feast!"
                      className="bg-slate-55 border border-slate-200 p-2.5 w-full rounded-lg text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={ruleLoading}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-755 text-white font-extrabold rounded-xl text-xs transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Deploy Intelligent Rule</span>
                  </button>
                </form>
              </div>

              {/* Active Rules list */}
              <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-3">
                <h4 className="font-extrabold text-xs uppercase text-slate-450 tracking-wider">Active Recommendation Rules ({recsList.length})</h4>
                {recsList.length === 0 ? (
                  <p className="text-slate-400 text-xs py-2 text-left">No custom mapping rules added yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[250px] overflow-y-auto pr-1">
                    {recsList.map((rec) => (
                      <div key={rec.id || Math.random()} className="py-2.5 flex items-center justify-between text-left">
                        <div className="space-y-0.5 max-w-[80%] text-left">
                          <p className="font-bold text-[11px] text-slate-800">
                            Trigger: <span className="text-blue-600 font-extrabold font-mono">{rec.triggerProductId}</span>
                          </p>
                          <p className="text-[10px] text-slate-550">
                            Suggests: <span className="text-indigo-600 font-extrabold font-mono">{rec.recommendedProductIds?.join(', ')}</span>
                          </p>
                          <blockquote className="text-[9px] text-slate-400 font-normal leading-tight italic">"{rec.reason}"</blockquote>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteRule(rec.id)}
                          className="p-1 px-1.5 border border-slate-100 hover:border-red-100 hover:bg-red-50 rounded text-slate-400 hover:text-red-600 transition-colors cursor-pointer text-[10px]"
                          title="Delete Rule"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Complaint recovery desk / callbacks tickets */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Unresolved support incident queues */}
              <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm uppercase text-slate-850 flex items-center space-x-1.5">
                    <AlertCircle className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                    <span>Real-time Support Callback Call Queue ({ticketList.filter(t => !t.resolved).length} Open)</span>
                  </h4>
                  <button 
                    type="button"
                    onClick={loadAdminMetadata}
                    className="p-1 border border-slate-200 hover:bg-slate-50 transition-colors rounded text-slate-500 cursor-pointer"
                    title="Refresh Incident Log"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {ticketList.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <p className="font-bold">No active helpline requests queued.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {ticketList.map((t) => (
                      <div key={t.id} className={`border rounded-2xl p-4 transition-all text-left ${t.resolved ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-amber-100 shadow-xs'}`}>
                        <div className="flex items-center justify-between pb-2 border-b border-slate-50">
                          <div>
                            <span className="text-[10px] text-slate-400 font-mono">TICKET ID: {t.id}</span>
                            <h5 className="font-black text-xs text-slate-800 leading-none mt-1 uppercase tracking-wide">{t.type}</h5>
                          </div>
                          {!t.resolved ? (
                            <button
                              type="button"
                              onClick={() => handleResolveTicket(t.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] rounded-lg cursor-pointer"
                            >
                              Resolve ✔
                            </button>
                          ) : (
                            <span className="text-[9px] font-black text-emerald-650 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded uppercase tracking-wider">Resolved</span>
                          )}
                        </div>
                        
                        <div className="pt-2 text-slate-600 space-y-1 text-[11px] font-sans">
                          <p>👤 <strong>User name:</strong> {t.userName || 'Customer'}</p>
                          <p className="flex items-center space-x-1 font-mono">
                            <span>📞 <strong>Callback contact Phone:</strong></span>
                            <a href={`tel:${t.phone}`} className="text-blue-600 font-black hover:underline">{t.phone}</a>
                          </p>
                          <p className="text-xs text-slate-700 font-medium">📝 <strong>Incident detail notes:</strong> "{t.details}"</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* General reviews & feedback logs */}
              <div className="bg-white border rounded-3xl p-5 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm uppercase text-slate-850">Recent Customer Pizza Experience Reviews ({feedbackList.length})</h4>
                
                {feedbackList.length === 0 ? (
                  <p className="text-slate-400 text-xs py-4 text-center">No reviews submitted yet.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1">
                    {feedbackList.map((feed) => (
                      <div key={feed.id || Math.random()} className="py-3 flex items-start justify-between text-left">
                        <div className="space-y-1 max-w-[85%] text-left">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-xs text-slate-800">{feed.userName || 'Customer'}</span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`w-3 h-3 ${feed.rating >= star ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                                />
                              ))}
                            </div>
                            <span className="font-mono text-[9px] text-zinc-400">ORDER {feed.orderId}</span>
                          </div>
                          
                          {feed.feedbackText && (
                            <p className="text-[11px] leading-relaxed text-slate-600 font-medium bg-slate-50 p-2 rounded-xl border border-slate-100 mt-1">
                              "{feed.feedbackText}"
                            </p>
                          )}
                        </div>

                        {/* If feedback was low star rating, highlight compensations used */}
                        {feed.rating <= 2 && (
                          <span className="text-[9px] shrink-0 uppercase tracking-widest text-rose-600 font-black bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded inline-block leading-none">
                            Recovered ✨
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

      {/* CRUD Product Dialog modal */}
      {showProductForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white max-w-md w-full rounded-2xl overflow-hidden border shadow-2xl flex flex-col">
            <div className="bg-slate-900 text-white p-5 text-left border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-extrabold text-base flex items-center">
                <Image className="w-4 h-4 mr-1.5 text-blue-400 animate-pulse" /> {editingProduct ? 'Edit Pizza Metadata' : 'Create New Pizza Item'}
              </h4>
              <button
                type="button"
                onClick={() => setShowProductForm(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 text-xs text-left space-y-4">
              
              <div>
                <label className="block font-bold text-slate-700 mb-1">Unique Product ID code (Alpha-numeric)</label>
                <input
                  type="text"
                  required
                  disabled={!!editingProduct}
                  placeholder="e.g. peppy-paneer"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(' ', '-') })}
                  className="bg-slate-50 border p-2.5 rounded-lg w-full font-mono text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Peppy Paneer Burst"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-slate-50 border p-2.5 rounded-lg w-full text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category Group</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="bg-slate-50 border p-2 rounded-lg w-full text-xs focus:outline-none"
                  >
                    <option value="Pizza">🍕 Pizza</option>
                    <option value="Sides">🍞 Sides</option>
                    <option value="Desserts">🧁 Desserts</option>
                    <option value="Drinks">🥤 Drinks</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Price (INR)</label>
                  <input
                    type="number"
                    required
                    value={formData.basePrice}
                    onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                    className="bg-slate-50 border p-2 rounded-lg w-full text-xs focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Diet Preference</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isVeg: true })}
                    className={`py-2 px-4 rounded-lg font-bold border flex-1 text-center transition-all cursor-pointer ${
                      formData.isVeg
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    🥬 Vegetarian
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isVeg: false })}
                    className={`py-2 px-4 rounded-lg font-bold border flex-1 text-center transition-all cursor-pointer ${
                      !formData.isVeg
                        ? 'bg-red-600 border-red-550 text-white'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    🍖 Non-Vegetarian
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dish Description</label>
                <textarea
                  required
                  placeholder="Describe toppings, core ingredients..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-slate-50 border p-2 rounded-lg w-full text-xs focus:outline-none focus:border-blue-500 h-16 resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Unsplash Food Image Asset URL</label>
                <input
                  type="text"
                  required
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="bg-slate-50 border p-2.5 rounded-lg w-full font-mono text-[10px] text-blue-600 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-blue-600 py-3 rounded-xl text-white font-extrabold text-xs tracking-wider uppercase transition-colors flex items-center justify-center space-x-1 cursor-pointer"
              >
                <Save className="w-4 h-4 mr-1 text-slate-400" />
                <span>Save Inventory Record</span>
              </button>

            </form>
          </div>
        </div>
      )}

      {/* CRUD Franchise Dialog modal */}
      {showFranchiseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto font-sans text-xs">
          <div className="bg-white max-w-md w-full rounded-2xl overflow-hidden border shadow-2xl flex flex-col my-8">
            <div className="bg-slate-900 text-white p-5 text-left border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-extrabold text-base flex items-center">
                <Building2 className="w-4 h-4 mr-1.5 text-blue-400 animate-pulse" /> {editingFranchise ? 'Edit Franchise Branch' : 'Register New Franchise Branch'}
              </h4>
              <button
                type="button"
                onClick={() => setShowFranchiseForm(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFranchise} className="p-6 text-left space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Branch ID Code</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingFranchise}
                    placeholder="e.g. noida"
                    value={franchiseFormData.id}
                    onChange={(e) => setFranchiseFormData({ ...franchiseFormData, id: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                    className="bg-slate-50 border p-2 rounded-lg w-full text-xs font-mono disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Franchise Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FoodFlow Noida"
                    value={franchiseFormData.name}
                    onChange={(e) => setFranchiseFormData({ ...franchiseFormData, name: e.target.value })}
                    className="bg-slate-50 border p-2 rounded-lg w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Owner / Manager</label>
                  <input
                    type="text"
                    required
                    placeholder="Manager name"
                    value={franchiseFormData.manager}
                    onChange={(e) => setFranchiseFormData({ ...franchiseFormData, manager: e.target.value })}
                    className="bg-slate-50 border p-2 rounded-lg w-full text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Store Logo URL</label>
                  <input
                    type="text"
                    required
                    value={franchiseFormData.logo}
                    onChange={(e) => setFranchiseFormData({ ...franchiseFormData, logo: e.target.value })}
                    className="bg-slate-50 border p-2 rounded-lg w-full text-xs font-mono text-[10px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Contact Number</label>
                  <input
                    type="text"
                    required
                    placeholder="Mobile/Phone"
                    value={franchiseFormData.phone}
                    onChange={(e) => setFranchiseFormData({ ...franchiseFormData, phone: e.target.value })}
                    className="bg-slate-50 border p-2 rounded-lg w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="store@foodflow.com"
                    value={franchiseFormData.email}
                    onChange={(e) => setFranchiseFormData({ ...franchiseFormData, email: e.target.value })}
                    className="bg-slate-50 border p-2 rounded-lg w-full text-xs font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Store Physical Address</label>
                <input
                  type="text"
                  required
                  placeholder="Complete location address"
                  value={franchiseFormData.address}
                  onChange={(e) => setFranchiseFormData({ ...franchiseFormData, address: e.target.value })}
                  className="bg-slate-50 border p-2 rounded-lg w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-left">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 font-sans">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={franchiseFormData.lat}
                    onChange={(e) => setFranchiseFormData({ ...franchiseFormData, lat: Number(e.target.value) })}
                    className="bg-slate-50 border p-2 rounded-lg w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={franchiseFormData.lng}
                    onChange={(e) => setFranchiseFormData({ ...franchiseFormData, lng: Number(e.target.value) })}
                    className="bg-slate-50 border p-2 rounded-lg w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Radius (km)</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={franchiseFormData.radius}
                    onChange={(e) => setFranchiseFormData({ ...franchiseFormData, radius: Number(e.target.value) })}
                    className="bg-slate-50 border p-2 rounded-lg w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-left">
                <div>
                  <label className="block text-[11px] font-black uppercase text-slate-400 mb-1">Operating Hours</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 11:00 AM - 11:00 PM"
                    value={franchiseFormData.operatingHours}
                    onChange={(e) => setFranchiseFormData({ ...franchiseFormData, operatingHours: e.target.value })}
                    className="bg-slate-50 border p-2 rounded-lg w-full text-xs"
                  />
                </div>
                <div className="text-left flex flex-col justify-end">
                  <div className="flex space-x-2 font-sans">
                    <button
                      type="button"
                      onClick={() => setFranchiseFormData({ ...franchiseFormData, isOpen: !franchiseFormData.isOpen })}
                      className={`flex-1 py-1.5 text-center rounded-lg text-xs font-black border transition-all cursor-pointer ${
                        franchiseFormData.isOpen ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-red-50 border-red-300 text-red-700'
                      }`}
                    >
                      {franchiseFormData.isOpen ? 'Store Open 🟢' : 'Store Closed 🔴'}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-blue-600 py-3 rounded-xl text-white font-extrabold text-xs tracking-wider uppercase transition-colors flex items-center justify-center space-x-1 cursor-pointer mt-2"
              >
                <Save className="w-4 h-4 mr-1 text-white/70" />
                <span>Save Franchise Outlet</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
