import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { applyCoupon, selectCartTotals } from '../store/index.js';
import { Percent, Check, AlertCircle } from 'lucide-react';

export default function CouponSection() {
  const dispatch = useDispatch();
  const selectedCoupon = useSelector((state) => state.cart.coupon);
  const { subtotal } = useSelector(selectCartTotals);

  const [coupons, setCoupons] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/coupons')
      .then((res) => res.json())
      .then((data) => setCoupons(data))
      .catch((err) => console.error('Error fetching coupon codes:', err));
  }, []);

  const handleApply = (coupon) => {
    setErrorMsg('');
    setSuccessMsg('');
    
    if (subtotal === 0) {
      setErrorMsg('Your shopping cart is currently empty. Add pizza to apply!');
      return;
    }

    if (subtotal < coupon.minOrder) {
      setErrorMsg(`This coupon requires a minimum cart value of ₹${coupon.minOrder}. Add more dishes to unlock !`);
      return;
    }

    dispatch(applyCoupon(coupon));
    setSuccessMsg(`Coupon '${coupon.code}' applied! You saved up to ₹${coupon.maxDiscount}.`);
  };

  return (
    <div className="my-6 text-left">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
            Active Discount Coupons <span className="ml-2 w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Apply hot deals to unlock huge savings on your handpicked cravings!</p>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 bg-emerald-50 text-emerald-800 border border-emerald-400/20 p-3.5 rounded-2xl text-xs font-bold flex items-center shadow-sm">
          <Check className="w-4 h-4 mr-2 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 bg-red-50 text-red-800 border border-red-400/20 p-3.5 rounded-2xl text-xs font-bold flex items-center shadow-sm">
          <AlertCircle className="w-4 h-4 mr-2 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {coupons.map((cp) => {
          const isSelected = selectedCoupon?.code === cp.code;
          
          return (
            <div
              key={cp.code}
              className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden transition-all group ${
                isSelected
                  ? 'border-blue-500 ring-1 ring-blue-500/30'
                  : 'border-slate-100 hover:border-slate-200'
              }`}
            >
              {/* Decorative dash-line representing cut coupon */}
              <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-blue-500/20 flex flex-col justify-between py-1.5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-white rounded-full"></div>
                ))}
              </div>

              <div className="pl-4 text-left space-y-3.5 flex-1">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-black rounded-lg uppercase tracking-wide">
                      <Percent className="w-3.5 h-3.5 mr-1 text-blue-600" /> {cp.code}
                    </span>
                    {isSelected && (
                      <span className="bg-emerald-500 text-white font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center">
                        Active ✔
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest mt-2">Discount Coupon Code</h4>
                </div>

                <div>
                  <p className="text-xs text-slate-800 font-bold leading-relaxed">{cp.description}</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-[10px] text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Min Order Amount</span>
                    <strong className="text-slate-800">₹{cp.minOrder}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Discount Limit</span>
                    <strong className="text-slate-800">₹{cp.maxDiscount}</strong>
                  </div>
                </div>
              </div>

              <div className="pl-4 pt-4 border-t border-slate-50 mt-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-zinc-455 font-bold block">Coupon discount</span>
                  <span className="text-lg font-black text-slate-900">{cp.discountPercent}% Off</span>
                </div>

                {isSelected ? (
                  <button
                    onClick={() => dispatch(applyCoupon(null))}
                    className="px-4 py-2.5 text-xs font-bold leading-none bg-red-50 border border-red-200 text-red-600 rounded-xl hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => handleApply(cp)}
                    className="inline-flex items-center px-4 py-2.5 text-xs font-black leading-none bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow transition-colors cursor-pointer"
                  >
                    Apply Deal
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
