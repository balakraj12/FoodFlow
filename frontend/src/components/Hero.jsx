import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Flame, Clock, Truck, Star, MapPin } from 'lucide-react';
import FranchisePickerModal from './FranchisePickerModal.jsx';

export default function Hero({ selectedCategory, setSelectedCategory }) {
  const [showPicker, setShowPicker] = useState(false);
  const selectedFranchise = useSelector((state) => state.cart.selectedFranchise);

  const categories = [
    { name: 'Pizza', count: '5 Options', desc: 'Hand Tossed & Cheese Burst', emoji: '🍕' },
    { name: 'Sides', count: '2 Options', desc: 'Garlic Bread & Dips', emoji: '🍞' },
    { name: 'Desserts', count: '1 Option', desc: 'Molten Choco Lava', emoji: '🧁' },
    { name: 'Drinks', count: '1 Option', desc: 'Chilled Soft Carbonates', emoji: '🥤' },
  ];

  return (
    <div className="relative mb-8 text-left">
      {/* Decorative Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-950 to-indigo-900 rounded-3xl overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-indigo-500 to-transparent"></div>
        {/* Abstract shapes representing pizza slices */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-yellow-550/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-16 md:px-12 flex flex-col md:flex-row items-center justify-between text-white space-y-8 md:space-y-0 text-left">
        {/* Left column hero punchlines */}
        <div className="max-w-xl space-y-6">
          <div className="flex flex-col sm:flex-row gap-3 text-left">
            <div className="inline-flex items-center self-start bg-blue-500/25 border border-blue-400/30 text-blue-300 font-bold px-3 py-1.5 rounded-full text-[11px] uppercase tracking-wide">
              <Flame className="w-3.5 h-3.5 mr-1.5 text-orange-400 animate-pulse" />
              <span>30-Min Promise Or Free!</span>
            </div>

            {/* Dynamic Store Status badge for customer context visualization */}
            {selectedFranchise ? (
              <div className="inline-flex items-center self-start bg-slate-900/60 border border-slate-700/50 text-slate-105 font-bold px-3 py-1.5 rounded-full text-[11px] whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                <span>Branch: <span className="text-yellow-400">{selectedFranchise.name}</span></span>
                <button
                  onClick={() => setShowPicker(true)}
                  className="ml-2 text-blue-400 hover:text-blue-300 underline font-black text-[10px] cursor-pointer"
                >
                  Change Store
                </button>
              </div>
            ) : (
              <div className="inline-flex items-center self-start bg-amber-500/25 border border-amber-400/40 text-amber-200 font-extrabold px-3 py-1.5 rounded-full text-[11px] animate-bounce">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-yellow-400 animate-pulse" />
                <span>Nearest Branch Unassigned</span>
                <button
                  type="button"
                  onClick={() => setShowPicker(true)}
                  className="ml-2 bg-yellow-400 hover:bg-yellow-350 text-slate-950 px-2 py-0.5 rounded font-black text-[10px] cursor-pointer uppercase transition-colors"
                >
                  Select Store
                </button>
              </div>
            )}
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-none text-left">
            Hot & Crispy <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-amber-400">Pizzas</span>, <br />
            Flowing Right to Your Gate.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed text-left">
            Order premium loaded hand-crafted pizzas customized exactly to your taste. Extra cheese, gourmet toppings, cheesy crust bursts - built fresh and handled entirely by our in-house smart riders!
          </p>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl text-left">
              <div className="flex items-center space-x-1 mb-1">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-black text-white">Fast Setup</span>
              </div>
              <p className="text-[10px] text-slate-400">Order prepared & dispatched in under 12 minutes</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl text-left font-sans">
              <div className="flex items-center space-x-1 mb-1">
                <Truck className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-black text-white">In-House</span>
              </div>
              <p className="text-[10px] text-slate-400">Dedicated tracking for prompt delivery routes</p>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl text-left">
              <div className="flex items-center space-x-1 mb-1">
                <Star className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="text-xs font-black text-white">Full Custom</span>
              </div>
              <p className="text-[10px] text-slate-400">Tailor size, crust styles, and premium cheese level</p>
            </div>
          </div>
        </div>

        {/* Right column pizza hero art */}
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 select-none">
          <img
            src="https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800"
            alt="Delicious Custom Pizza"
            className="w-full h-full object-cover rounded-3xl shadow-2xl rotate-3 hover:translate-y-[-4px] transition-transform duration-300 border-4 border-slate-700/40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute -bottom-4 -right-4 bg-red-600 text-white font-black px-4 py-2 rounded-2xl shadow-lg shadow-red-600/30 text-xs tracking-wider transform -rotate-12 flex flex-col items-center">
            <span>OFFER UP TO</span>
            <span className="text-xl">₹100 OFF</span>
          </div>
        </div>
      </div>

      {/* Category Horizontal Filter Grid */}
      <div className="mt-8 text-left">
        <h2 className="text-lg font-black text-slate-900 text-left mb-3 flex items-center">
          Explore Our Tasty Menu <span className="ml-2 w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
        </h2>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                id={`cat-btn-${cat.name.toLowerCase()}`}
                onClick={() => setSelectedCategory(cat.name)}
                className={`flex items-center space-x-3.5 p-4 rounded-2xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-500/20 translate-y-[-2px]'
                    : 'bg-white border-slate-100/80 hover:border-slate-300 text-slate-800 shadow-sm'
                }`}
              >
                <span className="text-3xl">{cat.emoji}</span>
                <div>
                  <h4 className={`font-black tracking-tight text-sm ${isSelected ? 'text-white' : 'text-slate-900'}`}>{cat.name}</h4>
                  <p className={`text-[11px] leading-tight mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>{cat.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Franchise picker popup overlay render */}
      {showPicker && (
        <FranchisePickerModal onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}
