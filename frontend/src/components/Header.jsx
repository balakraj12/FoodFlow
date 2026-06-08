import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setUser, selectCartTotals, logout as logoutAction } from '../store/index.js';
import { ShoppingCart, LogOut, Sliders, MapPin, ChevronDown, Plus, User as UserIcon, ToggleLeft } from 'lucide-react';
import LocationPickerModal from './LocationPickerModal.jsx';

export default function Header({ currentTab, setTab, openCart }) {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const { itemCount, total } = useSelector(selectCartTotals);

  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('foodflow_token');
    dispatch(logoutAction());
    setTab('menu');
  };

  const handleSelectAddress = async (addressId) => {
    try {
      const token = localStorage.getItem('foodflow_token');
      const res = await fetch('/api/auth/select-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ addressId })
      });
      const data = await res.json();
      if (data.success) {
        dispatch(setUser(data.user));
        setShowAddressDropdown(false);
      }
    } catch (err) {
      console.warn('Failed switching active coordinates:', err);
    }
  };

  const handleQuickRoleSwitch = (role) => {
    const mockUsers = {
      customer: { id: 'cust-demo', phone: '+919876543210', name: 'Alok Mishra', email: 'alok@foodflow.com', role: 'customer', address: 'B-45, Sector 50, Noida, UP', addresses: [] },
      admin: { id: 'admin-1', phone: '+919999900000', name: 'FoodFlow Admin', email: 'admin@foodflow.com', role: 'admin', address: 'Connaught Place, New Delhi', addresses: [] },
      delivery: { id: 'delivery-1', phone: '+919999911111', name: 'Rohan (Agent)', email: 'rohan@foodflow.com', role: 'delivery', address: 'Noida Sector 62, UP', addresses: [] },
    };
    dispatch(setUser(mockUsers[role]));
    if (role === 'admin') setTab('admin');
    else if (role === 'delivery') setTab('delivery');
    else setTab('menu');
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setTab('menu')}>
            <div className="relative flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg shadow-inner text-white transform hover:rotate-6 transition-transform">
              <span className="font-extrabold text-xl tracking-tighter">FF</span>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-slate-900 flex items-center justify-center">
                <span className="text-[6px] text-white">●</span>
              </div>
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-white flex items-center">
                Food<span className="text-blue-400">Flow</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium block leading-none">Domino's Style Pizza Engine</span>
            </div>
          </div>

          {/* Current Saved Address Selection Bar */}
          {isAuthenticated && (
            <div className="relative text-left hidden md:block">
              <button
                onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                className="flex items-center text-[11px] font-bold text-slate-300 hover:text-white bg-slate-800 border border-slate-700 hover:border-slate-600 px-3 py-1.5 rounded-full transition-all cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 mr-1 text-red-500" />
                <span className="truncate max-w-[150px]">
                  {user?.address || 'Set Delivery Location'}
                </span>
                <ChevronDown className="w-3 h-3 ml-1 text-slate-400" />
              </button>

              {showAddressDropdown && (
                <div className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50 text-slate-800 animate-[fadeIn_0.2s_ease-out]">
                  <div className="px-4 py-1.5 border-b border-slate-100 mb-2">
                    <p className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Select Delivery Location</p>
                  </div>
                  
                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {user?.addresses && user.addresses.length > 0 ? (
                      user.addresses.map((addr) => (
                        <button
                          key={addr.id}
                          onClick={() => handleSelectAddress(addr.id)}
                          className={`w-full px-4 py-2 text-left hover:bg-slate-50 flex items-start space-x-2 transition-colors cursor-pointer ${
                            addr.isDefault ? 'bg-blue-50/40 text-blue-700 font-semibold' : ''
                          }`}
                        >
                          <MapPin className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                          <div className="text-xs">
                            <p className="font-bold">{addr.label}</p>
                            <p className="text-slate-500 leading-normal truncate max-w-[210px]">{addr.fullAddress}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-center">
                        <p className="text-xs text-slate-500">No alternate addresses saved yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="px-3 pt-3 border-t border-slate-100 mt-2">
                    <button
                      onClick={() => {
                        setShowPicker(true);
                        setShowAddressDropdown(false);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add New Location</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nav Links */}
          <nav className="hidden md:flex space-x-1 items-center">
            <button
              onClick={() => setTab('menu')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                currentTab === 'menu' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-300 hover:text-white'
              }`}
            >
              Order Pizza
            </button>
            <button
              onClick={() => setTab('coupons')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                currentTab === 'coupons' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-300 hover:text-white'
              }`}
            >
              Coupons
            </button>
            {isAuthenticated && user?.role === 'admin' && (
              <button
                onClick={() => setTab('admin')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                  currentTab === 'admin' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30' : 'text-slate-300 hover:text-white'
                }`}
              >
                Admin Control
              </button>
            )}
            {isAuthenticated && user?.role === 'delivery' && (
              <button
                onClick={() => setTab('delivery')}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors cursor-pointer ${
                  currentTab === 'delivery' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-300 hover:text-white'
                }`}
              >
                Delivery Partner
              </button>
            )}
          </nav>

          {/* Quick Testing Sandbox Controls */}
          <div className="hidden lg:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60 text-xs">
            <span className="font-bold text-slate-400 flex items-center pr-1">
              <Sliders className="w-3.5 h-3.5 mr-1 text-blue-400" /> Demo Switch:
            </span>
            <button
              onClick={() => handleQuickRoleSwitch('customer')}
              className={`px-2.5 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                user?.role === 'customer' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Customer
            </button>
            <button
              onClick={() => handleQuickRoleSwitch('admin')}
              className={`px-2.5 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                user?.role === 'admin' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => handleQuickRoleSwitch('delivery')}
              className={`px-2.5 py-0.5 rounded-full font-semibold transition-all cursor-pointer ${
                user?.role === 'delivery' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Rider
            </button>
          </div>

          {/* Actions panel */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-200">Welcome, {user?.name}</p>
                  <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-bold text-slate-400 bg-slate-800 rounded">
                    {user?.role === 'admin' ? '👑 Admin' : user?.role === 'delivery' ? '🏍️ Rider' : '🍕 Customer'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer animate-[fadeIn_0.2s_ease-out]"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => setTab('login')}
                  className="px-3.5 py-1.5 text-xs font-bold bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white rounded-lg transition-all cursor-pointer"
                >
                  Log In
                </button>
                <button
                  onClick={() => setTab('signup')}
                  className="px-3.5 py-1.5 text-xs font-black bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-md cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            )}

            {/* Shopping Cart Trigger */}
            <button
              onClick={openCart}
              className="relative p-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white rounded-xl flex items-center space-x-2 cursor-pointer transition-all"
            >
              <ShoppingCart className="w-5 h-5 text-blue-400" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 scale-95 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow">
                  {itemCount}
                </span>
              )}
              {total > 0 && <span className="hidden sm:block font-bold text-xs">₹{total}</span>}
            </button>
          </div>
        </div>
      </div>

      {showPicker && <LocationPickerModal onClose={() => setShowPicker(false)} />}
    </header>
  );
}
