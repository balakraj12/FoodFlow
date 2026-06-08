import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectCartTotals, clearCart } from '../store/index.js';
import { MapPin, Navigation, CreditCard, ShieldCheck, ShoppingBag, CheckCircle2 } from 'lucide-react';

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

export default function CheckoutSection({ onOrderPlaced, onBackToMenu }) {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const selectedFranchise = useSelector((state) => state.cart.selectedFranchise);
  const selectedFranchiseId = useSelector((state) => state.cart.selectedFranchiseId);
  const { subtotal, discount, deliveryFee, total } = useSelector(selectCartTotals);

  // Delivery Coordinates default centered on Connaught Place, New Delhi or selected franchise location
  const [address, setAddress] = useState(user?.address || 'B-12, Sector 62, Noida, Delhi NCR');
  const [coordinates, setCoordinates] = useState(
    selectedFranchise ? { lat: selectedFranchise.location.lat, lng: selectedFranchise.location.lng } : { lat: 28.6139, lng: 77.2090 }
  );
  const [paymentMethod, setPaymentMethod] = useState('upi');
  
  // States of order creation flow
  const [submitting, setSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState('form');
  const [paymentDetails, setPaymentDetails] = useState({ cardNo: '', upiId: '' });
  const [razorpayId, setRazorpayId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Distance calculations
  const distanceToBranch = selectedFranchise
    ? getDistance(coordinates.lat, coordinates.lng, selectedFranchise.location.lat, selectedFranchise.location.lng)
    : 0;
  const isOutsideCoverage = selectedFranchise
    ? distanceToBranch > selectedFranchise.deliveryRadius
    : false;

  // Interactive maps emulation coordinates setter
  const handleMapZoneSelect = (sectorName, lat, lng) => {
    setCoordinates({ lat, lng });
    setAddress(`${sectorName}, New Delhi, NCR (Precise Delivery Sector Coordinates Verified)`);
  };

  const handlePlaceOrderSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setErrorMsg('You must sign in via Phone OTP before checkout.');
      return;
    }
    if (!selectedFranchiseId) {
      setErrorMsg('No branch selected! Please select your nearest store branch under menu categories back home.');
      return;
    }
    if (!address) {
      setErrorMsg('A valid physical address is required for delivery.');
      return;
    }

    if (paymentMethod === 'cod') {
      // Direct placement for Cash On Delivery
      await submitOrderToBackend();
    } else {
      // Direct Razorpay billing modal simulation sequence
      setPaymentStep('razorpay');
    }
  };

  const submitOrderToBackend = async () => {
    setSubmitting(true);
    setErrorMsg('');
    try {
      const orderPayload = {
        userId: user?.id,
        phone: user?.phone,
        name: user?.name,
        items: cartItems,
        subtotal,
        discount,
        deliveryFee,
        totalAmount: total,
        paymentMethod,
        address,
        location: coordinates,
        franchiseId: selectedFranchiseId,
        franchiseName: selectedFranchise?.name,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Clear redux cart
        dispatch(clearCart());
        setPaymentStep('success');
        setTimeout(() => {
          onOrderPlaced(data.order.id);
        }, 3000);
      } else {
        setErrorMsg(data.error || 'Failed to place the order.');
        setPaymentStep('form');
      }
    } catch {
      setErrorMsg('Failed to connect to the backend server.');
      setPaymentStep('form');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateRazorpayComplete = async () => {
    setSubmitting(true);
    // Emulate razorpay success reference ID
    const mockRefId = `pay_${Math.random().toString(36).substr(2, 9)}`;
    setRazorpayId(mockRefId);
    
    // Process backend order registration
    await submitOrderToBackend();
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-white border rounded-3xl p-8 text-center max-w-md mx-auto my-12 text-slate-800 space-y-4">
        <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto">
          <MapPin className="w-7 h-7" />
        </div>
        <h4 className="font-extrabold text-slate-900 text-lg">Checkout Sign-In Required</h4>
        <p className="text-xs text-slate-500">To route your fresh pizza order, please authenticate first via Phone OTP using the button in the upper header nav bar.</p>
        <button
          onClick={onBackToMenu}
          className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-blue-600 transition-colors"
        >
          Return to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="my-6 max-w-5xl mx-auto text-slate-800 text-left">
      <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Order Checkout</h3>
      <p className="text-xs text-slate-500 mb-6">Manage address coordinates, emulated payment authorization and dispatch orders in-house.</p>

      {paymentStep === 'form' && (
        <form onSubmit={handlePlaceOrderSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Input details */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Delivery address card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm text-left space-y-4">
              <h4 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center">
                <MapPin className="w-4 h-4 mr-1 text-blue-500" /> 1. Delivery Sector Selection
              </h4>

              {/* Fake Auto-complete list of Delhi Sectors & map click mock */}
              <div>
                <label className="block text-xs font-bold text-slate-705 mb-1.5">Select a Delivery Sector Nearby (Connaught Delhi):</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleMapZoneSelect('Connaught Place Sector 1', 28.6289, 77.2190)}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left flex items-center justify-between transition-colors ${
                      coordinates.lat === 28.6289 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span>📍 Connaught Place CP</span>
                    <span className="text-[9px] opacity-80">(0.5 km)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMapZoneSelect('Noida Sector 62 Main Block', 28.6273, 77.3727)}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left flex items-center justify-between transition-colors ${
                      coordinates.lat === 28.6273 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span>📍 Noida Sector 62</span>
                    <span className="text-[9px] opacity-80">(12.4 km)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMapZoneSelect('Karol Bagh Commercial Zone', 28.6502, 77.1901)}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left flex items-center justify-between transition-colors ${
                      coordinates.lat === 28.6502 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span>📍 Karol Bagh CP</span>
                    <span className="text-[9px] opacity-80">(3.2 km)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMapZoneSelect('Saket District Centre Block', 28.5244, 77.2100)}
                    className={`p-2.5 rounded-xl text-xs font-bold border text-left flex items-center justify-between transition-colors ${
                      coordinates.lat === 28.5244 ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <span>📍 Saket Block</span>
                    <span className="text-[9px] opacity-80">(8.5 km)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Enter Physical Delivery Address Line</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl p-3 text-slate-800 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {selectedFranchise && (
                <div className="bg-slate-50 border border-slate-200/50 p-3 rounded-2xl flex items-center justify-between text-xs text-slate-600">
                  <span className="font-bold text-slate-700">📍 Assigned Store: {selectedFranchise.name}</span>
                  <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Distance: {distanceToBranch.toFixed(1)} km</span>
                </div>
              )}

              {isOutsideCoverage && (
                <div className="bg-amber-50 border border-amber-250/50 text-amber-900 p-4 rounded-2xl text-xs space-y-1 text-left">
                  <div className="flex items-center text-amber-800 font-extrabold text-xs">
                    ⚠️ Address Outside Store Delivery Radius Boundary
                  </div>
                  <p className="text-[11px] text-amber-700 leading-normal">
                    This branch has a <strong>{selectedFranchise?.deliveryRadius} km</strong> official delivery service radius. Your chosen delivery sector is <strong>{distanceToBranch.toFixed(1)} km</strong> away. Proceeding might result in hot pizza delivery delays!
                  </p>
                </div>
              )}

              {/* Minimal Coordinate Display simulating Google Maps output */}
              <div className="bg-slate-900 text-slate-400 p-3 rounded-2xl text-[10px] font-mono flex items-center justify-between border-t border-slate-800">
                <span className="flex items-center"><Navigation className="w-3 h-3 mr-1 text-blue-400 animate-pulse" /> Target Location Geocoded:</span>
                <span>Lat: {coordinates.lat.toFixed(4)}, Lng: {coordinates.lng.toFixed(4)}</span>
              </div>
            </div>

            {/* Payment selectors */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm text-left space-y-4">
              <h4 className="text-sm font-black uppercase text-slate-400 tracking-wider flex items-center">
                <CreditCard className="w-4 h-4 mr-1 text-blue-500" /> 2. Payment Gateway Configuration
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`flex flex-col items-center p-3.5 rounded-2xl border text-center transition-colors cursor-pointer ${
                    paymentMethod === 'upi' ? 'border-blue-500 bg-blue-50/20 text-blue-600 font-extrabold' : 'border-slate-150 hover:border-slate-350'
                  }`}
                >
                  <span className="text-base mb-1">📱</span>
                  <span className="text-xs">UPI Autopay</span>
                  <span className="text-[9px] text-slate-400 font-medium">Instant Verification</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center p-3.5 rounded-2xl border text-center transition-colors cursor-pointer ${
                    paymentMethod === 'card' ? 'border-blue-500 bg-blue-50/20 text-blue-600 font-extrabold' : 'border-slate-150 hover:border-slate-350'
                  }`}
                >
                  <span className="text-base mb-1">💳</span>
                  <span className="text-xs">Debit/Credit</span>
                  <span className="text-[9px] text-slate-400 font-medium">Visa & Mastercard</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`flex flex-col items-center p-3.5 rounded-2xl border text-center transition-colors cursor-pointer ${
                    paymentMethod === 'cod' ? 'border-blue-500 bg-blue-50/20 text-blue-600 font-extrabold' : 'border-slate-150 hover:border-slate-350'
                  }`}
                >
                  <span className="text-base mb-1">💵</span>
                  <span className="text-xs">Cash on Delivery</span>
                  <span className="text-[9px] text-slate-400 font-medium">Pay Rider In Hand</span>
                </button>
              </div>

              {paymentMethod !== 'cod' && (
                <div className="bg-slate-50 p-3.5 border border-slate-100 rounded-2xl space-y-3">
                  <div className="flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider">Secure Razorpay Integration Active</span>
                  </div>

                  {paymentMethod === 'upi' ? (
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Enter UPI Virtual Address</label>
                      <input
                        type="text"
                        placeholder="customer@okhdfc"
                        value={paymentDetails.upiId}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, upiId: e.target.value })}
                        className="bg-white border rounded-lg p-2.5 text-xs text-slate-800 w-full focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Card Number</label>
                        <input
                          type="text"
                          placeholder="4111 2222 3333 4444"
                          maxLength={19}
                          value={paymentDetails.cardNo}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNo: e.target.value })}
                          className="bg-white border rounded-lg p-2.5 text-xs w-full focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* Right: Checkout summary metrics & trigger */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 text-left space-y-5">
              <div className="flex items-center space-x-2 pb-3 border-b border-slate-850">
                <ShoppingBag className="w-5 h-5 text-blue-400" />
                <h4 className="font-extrabold text-white text-base">Pizza Order Summary</h4>
              </div>

              {/* Items checklist */}
              <div className="space-y-3 py-1 text-xs">
                {cartItems.map((it) => (
                  <div key={it.id} className="flex justify-between items-start text-xs text-slate-300">
                    <div className="flex-1 text-left">
                      <span className="font-extrabold text-blue-300 mr-1">{it.quantity}x</span>
                      <strong className="text-white text-xs">{it.product.name}</strong>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{it.size} Size ● {it.crust}</span>
                    </div>
                    <span className="font-bold text-white">₹{it.totalPrice}</span>
                  </div>
                ))}
              </div>

              {/* Checkout detailed totals */}
              <div className="border-t border-slate-800 pt-4 space-y-2 text-xs text-slate-400 text-left">
                <div className="flex justify-between">
                  <span>Order Items Subtotal</span>
                  <strong className="text-white">₹{subtotal}</strong>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Coupon Discount</span>
                    <strong>- ₹{discount}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>In-House Courier Fee</span>
                  <strong className="text-white">₹{deliveryFee}</strong>
                </div>

                <div className="flex justify-between text-lg font-black text-white pt-3 border-t border-slate-800">
                  <span>Payable Total:</span>
                  <span className="text-yellow-400">₹{total}</span>
                </div>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-400 bg-red-950/40 p-3 rounded-xl font-bold border border-red-900/40">
                  ⚠️ {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-2xl text-white font-extrabold text-sm transition-all shadow-xl shadow-blue-550/10 cursor-pointer disabled:opacity-40"
              >
                {submitting ? 'Connecting...' : `Place Custom Pizza Order (₹${total})`}
              </button>
            </div>
          </div>

        </form>
      )}

      {/* RAZORPAY BILLING GATEWAY EXPERIENCES SCREEN EMULATOR */}
      {paymentStep === 'razorpay' && (
         <div className="max-w-md mx-auto bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
          <div className="bg-blue-600 p-6 text-center text-white relative">
            <span className="text-[10px] uppercase font-bold tracking-widest bg-blue-800/60 px-2 py-0.5 rounded-full mb-1 inline-block">
              RAZORPAY CHECKOUT INTERACTIVE EMULATOR
            </span>
            <h4 className="font-black text-lg">Razorpay Secured Session</h4>
            <p className="text-xs text-blue-100">Merchant: FoodFlow Technologies Private Limited</p>
          </div>

          <div className="p-6 space-y-6 text-left">
            <div className="bg-slate-950 p-4 border border-slate-800 rounded-2xl space-y-2 text-center">
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wide">Final Amount Authorized</span>
              <p className="text-3xl font-black text-yellow-400">₹{total}</p>
            </div>

            <div className="space-y-4 text-xs select-none">
              <div className="flex items-center space-x-3.5 bg-slate-950/60 border border-slate-850 p-3 rounded-xl">
                <span className="text-2xl">⚡</span>
                <div>
                  <h5 className="font-bold text-white leading-none">Emulated Transaction Flow</h5>
                  <p className="text-[10px] text-slate-400 mt-1">Simulates Razorpay Webhook signature matching for sandbox reviews.</p>
                </div>
              </div>

              {paymentMethod === 'upi' ? (
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-center space-y-3.5">
                  <p className="text-[11px] text-zinc-400">Using VPA: <strong className="font-mono text-white">{paymentDetails.upiId || 'customer@upi'}</strong></p>
                  
                  {/* Real visual QR placeholder indicating sandbox payment */}
                  <div className="w-36 h-36 bg-white rounded-xl mx-auto flex items-center justify-center p-2.5">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=customer@upi%26pn=FoodFlow%26am=10`}
                      alt="Payment QR"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-[9px] text-blue-400">Scan QR Code or trigger mobile alert</p>
                </div>
              ) : (
                <div className="space-y-2 font-mono text-xs">
                  <div className="p-3 bg-slate-950 rounded-lg flex justify-between">
                    <span className="text-slate-500">CARD NUM:</span>
                    <span>{paymentDetails.cardNo || 'XXXX XXXX XXXX 4111'}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setPaymentStep('form')}
                className="w-1/3 bg-slate-800 text-slate-350 hover:bg-slate-700 py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Declined
              </button>
              <button
                type="button"
                onClick={handleSimulateRazorpayComplete}
                disabled={submitting}
                className="w-2/3 bg-blue-600 hover:bg-blue-500 py-3 rounded-xl text-xs font-black transition-all shadow-lg text-white cursor-pointer flex items-center justify-center"
              >
                {submitting ? 'Verifying Checkout...' : 'Simulate Success ✔'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS TRANSITION LOADER */}
      {paymentStep === 'success' && (
        <div className="max-w-md mx-auto border rounded-3xl p-8 text-center space-y-4 bg-white/95 my-12 shadow-2xl">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce border border-emerald-100">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h4 className="font-black text-slate-900 text-xl tracking-tight">Pizza Checkout Complete!</h4>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">Razorpay payment emulated & authenticated. Order logged successfully in DB. Opening order tracking dashboard...</p>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full w-2/3 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}
    </div>
  );
}
