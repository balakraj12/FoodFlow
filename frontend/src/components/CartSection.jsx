import { useSelector, useDispatch } from 'react-redux';
import { addToCart, removeFromCart, updateQuantity, applyCoupon, selectCartTotals } from '../store/index.js';
import { ShoppingCart, Trash2, Tag, Percent, ArrowRight, ShoppingBag, ShieldAlert, Sparkles, Plus } from 'lucide-react';
import React, { useState, useEffect } from 'react';

export default function CartSection({ onProceedToCheckout, onClose }) {
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.items);
  const activeCoupon = useSelector((state) => state.cart.coupon);
  const { subtotal, discount, deliveryFee, total } = useSelector(selectCartTotals);

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');

  // Upsell Recommendation Engine local state
  const [recommendations, setRecommendations] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loadingUpsells, setLoadingUpsells] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/recommendations').then(res => res.json()),
      fetch('/api/menu').then(res => res.json())
    ]).then(([recs, menu]) => {
      if (active) {
        setRecommendations(recs || []);
        setMenuItems(menu || []);
        setLoadingUpsells(false);
      }
    }).catch(err => {
      console.error('Error fetching upsell recommendations:', err);
      if (active) setLoadingUpsells(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const getUpsellSuggestions = () => {
    if (cartItems.length === 0 || menuItems.length === 0) return [];
    
    const cartProductIds = cartItems.map(it => it.product.id);
    const matches = [];
    
    recommendations.forEach(rec => {
      if (cartProductIds.includes(rec.triggerProductId)) {
        rec.recommendedProductIds.forEach(id => {
          if (!cartProductIds.includes(id)) {
            matches.push({ productId: id, reason: rec.reason || "Frequently bought together!" });
          }
        });
      }
    });

    // Fallbacks if no specific trigger matches
    if (matches.length === 0) {
      const defaultSides = menuItems.filter(item => 
        (item.category === 'Sides' || item.category === 'Beverages' || item.category === 'Desserts') && 
        !cartProductIds.includes(item.id)
      );
      defaultSides.slice(0, 2).forEach(it => {
        matches.push({ productId: it.id, reason: "Popular add-on frequently chosen with Pizzas!" });
      });
    }

    const uniqueIds = Array.from(new Set(matches.map(m => m.productId)));
    const finalCards = [];
    
    uniqueIds.forEach(id => {
      const product = menuItems.find(item => item.id === id);
      const matchedReason = matches.find(m => m.productId === id)?.reason || "Frequently bought together!";
      if (product) {
        finalCards.push({ product, reason: matchedReason });
      }
    });

    return finalCards.slice(0, 2);
  };

  const handleAddUpsellToCart = async (product) => {
    // Increment click counts
    try {
      fetch('/api/upsell/click', { method: 'POST' });
    } catch (e) {
      console.warn('Analytics log failed', e);
    }

    const cartItemId = `${product.id}_Regular_Standard_upsell`;
    const upsellItem = {
      id: cartItemId,
      product,
      quantity: 1,
      size: 'Regular',
      crust: 'Standard',
      singleItemPrice: product.price,
      totalPrice: product.price,
      addedToppings: [],
      extraCheese: false,
      addedFromRecommendation: true,
      isUpsell: true,
    };

    dispatch(addToCart(upsellItem));

    // Increment conversions
    try {
      fetch('/api/upsell/conversion', { method: 'POST' });
    } catch (e) {
      console.warn('Conversion analytics post failed', e);
    }
  };

  const upsellSuggestions = getUpsellSuggestions();

  const handleApplyCouponCode = async (e) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');

    if (!couponInput) return;

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput, cartAmount: subtotal }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        dispatch(applyCoupon(data.coupon));
        setCouponSuccess(`Code '${data.coupon.code}' applied successfully!`);
        setCouponInput('');
      } else {
        setCouponError(data.error || 'Invalid coupon code.');
      }
    } catch {
      setCouponError('Network error checking coupon.');
    }
  };

  return (
    <div className="flex flex-col h-full text-slate-800">
      {/* Drawer Header */}
      <div className="flex items-center justify-between p-5 border-b border-slate-100">
        <div className="flex items-center space-x-2.5">
          <ShoppingBag className="w-5 h-5 text-blue-600" />
          <h3 className="font-extrabold text-slate-900 tracking-tight text-base">Your Flowing Pizza Cart</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-800 w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {cartItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
            <div className="w-16 h-16 bg-slate-50 border rounded-full flex items-center justify-center text-slate-400">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm">Shopping Cart is Empty</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Explore our premium selection to build your custom cheesy pizza combo!</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-blue-600 hover:text-white border border-blue-500 hover:bg-blue-600 rounded-xl transition-all cursor-pointer"
            >
              Start Ordering
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Products List */}
            <div className="space-y-3.5">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between bg-slate-50/50 hover:bg-slate-50 border border-slate-100 p-3.5 rounded-2xl transition-colors text-left"
                >
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded-xl"
                  />
                  
                  <div className="flex-1 ml-4 text-left space-y-1 pr-2">
                    <h4 className="font-extrabold text-xs text-slate-900 leading-none">{item.product.name}</h4>
                    
                    {/* Customizations tags summary */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded leading-none">
                        Size: {item.size}
                      </span>
                      {item.product.category === 'Pizza' && (
                        <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded leading-none">
                          Crust: {item.crust}
                        </span>
                      )}
                      {item.extraCheese && (
                        <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded leading-none">
                          🧀 Extra Cheese
                        </span>
                      )}
                      {item.addedToppings.map((tp) => (
                        <span key={tp} className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded leading-none">
                          + {tp.replace('Fresh ', '').replace('Spicy ', '').replace('Savory ', '').replace('Chunks', '')}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-bold text-slate-800">₹{item.singleItemPrice} <span className="text-[9px] text-slate-400 font-medium">each</span></span>
                      
                      {/* Quantity Selector */}
                      <div className="flex items-center space-x-2.5 bg-white border border-slate-150 rounded-lg p-0.5 scale-90">
                        <button
                          onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                          className="w-6 h-6 rounded-md hover:bg-slate-50 font-bold text-xs flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="font-extrabold text-xs text-slate-800 w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                          className="w-6 h-6 rounded-md hover:bg-slate-50 font-bold text-xs flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => dispatch(removeFromCart(item.id))}
                    className="p-1.5 text-slate-400 hover:text-red-600 transition-colors self-start hover:bg-red-50 rounded cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* SMART UPSELL RECOMMENDATIONS CARD */}
            {upsellSuggestions.length > 0 && (
              <div className="bg-gradient-to-br from-blue-50/40 to-indigo-50/30 border border-blue-100 rounded-2xl p-4 space-y-3 text-left">
                <div className="flex items-center space-x-1.5 text-blue-700">
                  <Sparkles className="w-4 h-4 text-blue-600 animate-pulse shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider leading-none">Frequently Bought Together</span>
                </div>
                
                <div className="grid grid-cols-1 gap-2.5">
                  {upsellSuggestions.map(({ product, reason }) => (
                    <div 
                      key={product.id}
                      className="bg-white border border-blue-100/60 p-2.5 rounded-xl flex items-center justify-between shadow-sm hover:shadow transition-all text-left"
                    >
                      <div className="flex items-center space-x-2.5">
                        <img 
                          src={product.image} 
                          alt={product.name}
                          className="w-10 h-10 object-cover rounded-lg shrink-0"
                        />
                        <div className="space-y-0.5 text-left">
                          <h5 className="font-extrabold text-[11px] text-slate-850 leading-tight">{product.name}</h5>
                          <p className="text-[9px] text-slate-400 font-medium leading-normal">{reason}</p>
                          <span className="text-[10px] font-black text-blue-600 font-mono">₹{product.price}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleAddUpsellToCart(product)}
                        className="py-1 px-2.5 bg-blue-600 hover:bg-blue-750 text-white font-extrabold rounded-lg text-[10px] flex items-center space-x-0.5 cursor-pointer transition-colors shrink-0"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promo Codes application */}
            <div className="border border-dashed border-slate-200/80 rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-black text-slate-800">Apply Coupon Code</span>
              </div>
              
              <form onSubmit={handleApplyCouponCode} className="flex space-x-2">
                <input
                  type="text"
                  placeholder="e.g. FLOWFEAST"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 flex-1 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-blue-600 cursor-pointer"
                >
                  Verify
                </button>
              </form>

              {couponError && (
                <p className="text-[10px] text-red-600 font-bold flex items-center">
                  <ShieldAlert className="w-3.5 h-3.5 mr-1 shrink-0" /> {couponError}
                </p>
              )}

              {couponSuccess && (
                <p className="text-[10px] text-emerald-600 font-bold flex items-center">
                  <Percent className="w-3.5 h-3.5 mr-1 shrink-0" /> {couponSuccess}
                </p>
              )}

              {activeCoupon && (
                <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-xl flex items-center justify-between">
                  <div className="text-left">
                    <span className="text-[9px] font-black text-blue-800 bg-blue-100 px-1.5 py-0.5 rounded leading-none">
                      {activeCoupon.code}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">Discount calculated successfully - Save ₹{discount}</p>
                  </div>
                  <button
                    onClick={() => dispatch(applyCoupon(null))}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* Drawer Checkout Footer */}
      {cartItems.length > 0 && (
        <div className="bg-slate-50 border-t border-slate-100 p-5 space-y-4">
          <div className="space-y-2 text-left text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Order Subtotal</span>
              <strong className="text-slate-800">₹{subtotal}</strong>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Coupon Applied</span>
                <strong>- ₹{discount}</strong>
              </div>
            )}
            <div className="flex justify-between">
              <span>Rider Delivery Fee</span>
              <strong className="text-slate-800">₹{deliveryFee}</strong>
            </div>
            
            <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t border-slate-150">
              <span>Final Total Amount</span>
              <span className="text-blue-600">₹{total}</span>
            </div>
          </div>

          <button
            onClick={onProceedToCheckout}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center space-x-2 cursor-pointer transition-all"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4 text-blue-200" />
          </button>
        </div>
      )}
    </div>
  );
}
