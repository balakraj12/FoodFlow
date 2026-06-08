/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Provider, useSelector, useDispatch } from 'react-redux';
import store, { setUser, logout } from './store/index.js';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import MenuSection from './components/MenuSection.jsx';
import CouponSection from './components/CouponSection.jsx';
import CartSection from './components/CartSection.jsx';
import CheckoutSection from './components/CheckoutSection.jsx';
import LiveTrackerSection from './components/LiveTrackerSection.jsx';
import AdminPanelSection from './components/AdminPanelSection.jsx';
import DeliveryAgentSection from './components/DeliveryAgentSection.jsx';
import LoginPage from './components/LoginPage.jsx';
import SignupPage from './components/SignupPage.jsx';
import ForgotPasswordPage from './components/ForgotPasswordPage.jsx';
import LocationPickerModal from './components/LocationPickerModal.jsx';
import { ShieldAlert } from 'lucide-react';

function Dashboard() {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  
  const [currentTab, setTab] = useState('menu');
  const [selectedCategory, setSelectedCategory] = useState('Pizza');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeTrackingOrderId, setActiveTrackingOrderId] = useState(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // 1. Persistence checks & auto-login on startup
  useEffect(() => {
    const token = localStorage.getItem('foodflow_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          dispatch(setUser(data.user));
        } else {
          localStorage.removeItem('foodflow_token');
          dispatch(logout());
          setTab('login');
        }
      })
      .catch(() => {
        // Safe offline recovery for sandboxes
      });
    } else {
      setTab('login');
    }
  }, [dispatch]);

  // 2. Location Onboarding Prompt Trigger
  useEffect(() => {
    if (isAuthenticated && user?.role === 'customer' && (!user.addresses || user.addresses.length === 0)) {
      setShowOnboardingModal(true);
    } else {
      setShowOnboardingModal(false);
    }
  }, [isAuthenticated, user]);

  // 3. Dynamic Router incorporating RBAC
  const renderTabContent = () => {
    if (!isAuthenticated) {
      if (currentTab === 'signup') {
        return <SignupPage setAuthView={setTab} />;
      } else if (currentTab === 'forgot') {
        return <ForgotPasswordPage setAuthView={setTab} />;
      } else {
        return <LoginPage setAuthView={setTab} />;
      }
    }

    switch (currentTab) {
      case 'menu':
        return (
          <>
            <Hero selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory} />
            <MenuSection category={selectedCategory} />
          </>
        );
      case 'coupons':
        return <CouponSection />;
      case 'checkout':
        return (
          <CheckoutSection
            onOrderPlaced={(orderId) => {
              setActiveTrackingOrderId(orderId);
              setTab('track');
            }}
            onBackToMenu={() => setTab('menu')}
          />
        );
      case 'track':
        return (
          <LiveTrackerSection
            orderId={activeTrackingOrderId || ''}
            onBackToMenu={() => setTab('menu')}
          />
        );
      case 'admin':
        if (user?.role !== 'admin') {
          return (
            <div className="bg-red-50 text-red-700 p-8 rounded-2xl border border-red-200 py-12 text-center max-w-xl mx-auto my-12 space-y-3">
              <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
              <h3 className="font-extrabold text-xl">Access Restricted</h3>
              <p className="text-sm">You must log in as an administrator to access the merchant console.</p>
              <button onClick={() => setTab('menu')} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer">
                Return to Shop
              </button>
            </div>
          );
        }
        return <AdminPanelSection />;
      case 'delivery':
        if (user?.role !== 'delivery') {
          return (
            <div className="bg-red-50 text-red-700 p-8 rounded-2xl border border-red-200 py-12 text-center max-w-xl mx-auto my-12 space-y-3">
              <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
              <h3 className="font-extrabold text-xl">Access Restricted</h3>
              <p className="text-sm">You must log in as a delivery partner to access dispatch registers.</p>
              <button onClick={() => setTab('menu')} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-xl cursor-pointer">
                Return to Shop
              </button>
            </div>
          );
        }
        return <DeliveryAgentSection />;
      case 'login':
      case 'signup':
      case 'forgot':
        // Once authenticated redirect to regular views
        setTab('menu');
        return null;
      default:
        return <MenuSection category="Pizza" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans relative antialiased leading-relaxed">
      
      {/* Upper Brand Header */}
      <Header
        currentTab={currentTab}
        setTab={(tab) => {
          setTab(tab);
          setIsCartOpen(false);
        }}
        openCart={() => setIsCartOpen(true)}
      />

      {/* Main Container Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full text-center">
        {renderTabContent()}
      </main>

      {/* Shopping Cart Sidebar Overlay Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl animate-[slideLeft_0.3s_ease-out] relative">
            <CartSection
              onClose={() => setIsCartOpen(false)}
              onProceedToCheckout={() => {
                setIsCartOpen(false);
                setTab('checkout');
              }}
            />
          </div>
        </div>
      )}

      {/* Structured Footer */}
      <footer className="bg-slate-900 text-white border-t border-slate-800 py-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-left space-y-3">
            <h4 className="font-extrabold text-sm text-blue-400 uppercase tracking-widest">FoodFlow Pizza Engine</h4>
            <p className="text-xs text-slate-400">
              Piping hot custom pizzas baked fresh on-demand. Utilizing fully integrated in-house dispatch and real-time Socket.io route telemetry.
            </p>
          </div>
          <div className="text-left space-y-3">
            <h4 className="font-extrabold text-sm text-blue-400 uppercase tracking-widest">In-house Delivery Area</h4>
            <p className="text-xs text-slate-400">
              Servicing select Connaught Place sectors, Noida Block 62 and central New Delhi neighborhoods prompt in 30 minutes.
            </p>
          </div>
          <div className="text-left space-y-3">
            <h4 className="font-extrabold text-sm text-blue-400 uppercase tracking-widest">Developer Sandbox Setup</h4>
            <p className="text-xs text-slate-400">
              Simulated Firebase phone otp sign-in (use otp: 123456) and secure Razorpay payment signature emulation.
            </p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 mt-6 border-t border-slate-800 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} FoodFlow Technologies Inc. Inspired by Domino's Pizza.
        </div>
      </footer>

      {/* Onboarding Dialog */}
      {showOnboardingModal && (
        <LocationPickerModal onClose={() => setShowOnboardingModal(false)} />
      )}

    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Dashboard />
    </Provider>
  );
}
