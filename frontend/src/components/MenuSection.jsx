import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../store/index.js';
import { Plus, Check, ChevronRight, Leaf, HeartCrack, Flame } from 'lucide-react';

export default function MenuSection({ category }) {
  const dispatch = useDispatch();
  const selectedFranchiseId = useSelector((state) => state.cart.selectedFranchiseId);
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Customization modal toggles
  const [activeProduct, setActiveProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState('Medium');
  const [selectedCrust, setSelectedCrust] = useState('Classic Hand Tossed');
  const [extraCheese, setExtraCheese] = useState(false);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [customQuantity, setCustomQuantity] = useState(1);

  // Available custom toppings map with prices and veg status
  const availableToppings = [
    { name: 'Extra Mozzarella Cheese', price: 50, isVeg: true },
    { name: 'Fresh Mushrooms', price: 35, isVeg: true },
    { name: 'Crispy Capsicum', price: 35, isVeg: true },
    { name: 'Spicy Jalapenos', price: 40, isVeg: true },
    { name: 'Savory Paneer Cubes', price: 45, isVeg: true },
    { name: 'Grilled Chicken Chunks', price: 60, isVeg: false },
    { name: 'Spicy Pepperoni Slices', price: 70, isVeg: false },
  ];

  // Load menu products from API
  useEffect(() => {
    let active = true;
    setLoading(true);
    const url = `/api/menu?franchiseId=${selectedFranchiseId || 'global'}`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Could not retrieve remote pizza menu');
        return res.json();
      })
      .then((data) => {
        if (active) {
          setProducts(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('API error loading menu, utilizing fallback:', err);
        if (active) {
          setError('Failed to fetch menu items.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [category, selectedFranchiseId]);

  const filtered = products.filter((p) => p.category === category);

  // Handle opening customization modal
  const openCustomization = (prod) => {
    setActiveProduct(prod);
    setSelectedSize('Medium');
    setSelectedCrust('Classic Hand Tossed');
    setExtraCheese(false);
    setSelectedToppings([]);
    setCustomQuantity(1);
  };

  // Helper calculation of customized pricing
  const calculateConfiguredPrice = () => {
    if (!activeProduct) return 0;
    
    // Base size price
    const sizePrice = activeProduct.sizes[selectedSize] || activeProduct.basePrice;
    
    // Crust additional cost
    const crustPrice = activeProduct.crusts[selectedCrust] || 0;
    
    // Extra cheese additional cost
    const cheeseCost = extraCheese ? 50 : 0;
    
    // Selected toppings price summation
    const toppingsCost = selectedToppings.reduce((sum, tName) => {
      const toppingMatch = availableToppings.find((at) => at.name === tName);
      return sum + (toppingMatch ? toppingMatch.price : 0);
    }, 0);

    return sizePrice + crustPrice + cheeseCost + toppingsCost;
  };

  const handleToppingToggle = (toppingName) => {
    if (selectedToppings.includes(toppingName)) {
      setSelectedToppings(selectedToppings.filter((t) => t !== toppingName));
    } else {
      setSelectedToppings([...selectedToppings, toppingName]);
    }
  };

  const handleAddCustomizedToCart = () => {
    if (!activeProduct) return;

    const singlePrice = calculateConfiguredPrice();
    const toppingsHash = [...selectedToppings].sort().join(',');
    const itemUniqueId = `${activeProduct.id}-${selectedSize}-${selectedCrust}-${extraCheese ? 'withCheese' : 'noCheese'}-${toppingsHash}`;

    const cartItem = {
      id: itemUniqueId,
      product: activeProduct,
      size: selectedSize,
      crust: selectedCrust,
      extraCheese,
      addedToppings: selectedToppings,
      quantity: customQuantity,
      singleItemPrice: singlePrice,
      totalPrice: singlePrice * customQuantity,
    };

    dispatch(addToCart(cartItem));
    setActiveProduct(null); // Close modal
  };

  return (
    <div className="my-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center">
          Available {category} Selection <span className="ml-2 px-2.5 py-0.5 text-xs bg-slate-100/80 border text-slate-500 rounded-full font-bold">{filtered.length} Items</span>
        </h3>
      </div>

      {loading ? (
        // Skeleton loaders layout
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 animate-pulse space-y-4 font-sans">
              <div className="w-full h-44 bg-slate-200/80 rounded-xl"></div>
              <div className="h-6 w-2/3 bg-slate-200 rounded"></div>
              <div className="h-4 w-5/6 bg-slate-100 rounded"></div>
              <div className="flex justify-between items-center pt-2">
                <div className="h-6 w-1/4 bg-slate-200 rounded"></div>
                <div className="h-10 w-1/3 bg-slate-200 rounded-xl"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-12 text-center max-w-lg mx-auto">
          <HeartCrack className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="font-bold text-slate-800 text-lg">No pizzas available under this category.</h4>
          <p className="text-xs text-slate-500 mt-1">Please navigate standard options in header, or make sure server seeding process loaded successfully.</p>
        </div>
      ) : (
        // Grid cards layout for dynamic products
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((prod) => (
            <div
              key={prod.id}
              id={`prod-card-${prod.id}`}
              className="bg-white border border-slate-100 hover:border-slate-250 transition-all rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between group"
            >
              <div className="relative">
                <img
                  src={prod.image}
                  alt={prod.name}
                  className="w-full h-48 object-cover group-hover:scale-103 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-3 left-3 flex items-center space-x-1.5 ">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase border ${
                      prod.isVeg
                        ? 'bg-emerald-50 border-emerald-400/30 text-emerald-800'
                        : 'bg-red-50 border-red-400/30 text-red-800'
                    }`}
                  >
                    <Leaf className={`w-3 h-3 mr-1 ${prod.isVeg ? 'text-emerald-500' : 'text-red-500'}`} />
                    {prod.isVeg ? 'Veg' : 'Non-Veg'}
                  </span>
                  
                  {prod.category === 'Pizza' && (
                    <span className="bg-blue-600/95 border border-blue-500/20 text-white font-black px-2 py-1 rounded-full text-[9px] uppercase tracking-wider shadow">
                      Customizable
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between text-left space-y-4">
                <div>
                  <h4 className="font-extrabold text-slate-900 tracking-tight text-base group-hover:text-blue-600 transition-colors">
                    {prod.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">{prod.description}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block leading-none">Starting from</span>
                    <span className="text-lg font-black text-slate-900">₹{prod.basePrice}</span>
                  </div>

                  <button
                    onClick={() => openCustomization(prod)}
                    className="inline-flex items-center px-4.5 py-2.5 text-xs font-bold leading-none bg-slate-900 hover:bg-blue-600 text-white rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Customize <Plus className="w-3.5 h-3.5 ml-1 text-slate-300" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Customization Selection Modal (Domino's Style) */}
      {activeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white max-w-lg w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="relative text-left">
              <img
                src={activeProduct.image}
                alt={activeProduct.name}
                className="w-full h-44 object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setActiveProduct(null)}
                className="absolute top-4 right-4 bg-slate-900/60 hover:bg-slate-900 text-white w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
              <div className="absolute bottom-4 left-4 text-white">
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 bg-black/40 rounded-full mb-1 inline-block">
                  Customization Engine
                </span>
                <h3 className="font-extrabold text-lg text-white drop-shadow">{activeProduct.name}</h3>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-left flex-1">
              
              {/* Option 1: Sizes selector */}
              {activeProduct.category === 'Pizza' && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    Step 1: Choose Your Pizza size
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    {['Regular', 'Medium', 'Large'].map((sz) => {
                      const cost = activeProduct.sizes[sz] || activeProduct.basePrice;
                      const isSelected = selectedSize === sz;
                      return (
                        <button
                          key={sz}
                          onClick={() => setSelectedSize(sz)}
                          className={`flex flex-col items-center p-3 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500/10 text-slate-900 font-extrabold ring-1 ring-blue-400'
                              : 'border-slate-150 hover:border-slate-300'
                          }`}
                        >
                          <span className="text-xs font-bold text-slate-800">{sz}</span>
                          <span className="text-xs font-black text-blue-600 mt-1">₹{cost}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Option 2: Crust style */}
              {activeProduct.category === 'Pizza' && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    Step 2: select Crust Base
                  </h4>
                  <div className="space-y-2">
                    {['Classic Hand Tossed', 'Cheese Burst', 'Wheat Thin Crust'].map((crst) => {
                      const crustAddCost = activeProduct.crusts[crst] || 0;
                      const isSelected = selectedCrust === crst;
                      return (
                        <button
                          key={crst}
                          onClick={() => setSelectedCrust(crst)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500/10 text-slate-900 font-extrabold'
                              : 'border-slate-150 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                              {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                            </span>
                            <span className="text-xs text-slate-800 font-bold">{crst}</span>
                          </div>
                          <span className="text-xs font-extrabold text-blue-600">
                            {crustAddCost === 0 ? 'Free' : `+ ₹${crustAddCost}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Option 3: Extra Cheese option */}
              {activeProduct.category === 'Pizza' && (
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                  <div>
                    <h5 className="text-xs font-black text-slate-800 leading-none flex items-center">
                      <Flame className="w-3.5 h-3.5 mr-1 text-orange-500 animate-pulse" /> Extra Mozzarella Cheese Burst
                    </h5>
                    <p className="text-[10px] text-slate-400 mt-1">Upgrade pizza with double layers of liquid cheese</p>
                  </div>
                  <button
                    onClick={() => setExtraCheese(!extraCheese)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all border cursor-pointer ${
                      extraCheese
                        ? 'bg-blue-600 border-blue-500 text-white shadow'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {extraCheese ? 'Added (₹50)' : 'Add (₹50)'}
                  </button>
                </div>
              )}

              {/* Option 4: Extra Custom toppings selections */}
              {activeProduct.category === 'Pizza' && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">
                    Step 3: Add Fresh Toppings
                  </h4>
                  <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {availableToppings
                      .filter((t) => activeProduct.isVeg ? t.isVeg : true) // Veg items only get veg toppings
                      .map((tp) => {
                        const isSelected = selectedToppings.includes(tp.name);
                        return (
                          <button
                            key={tp.name}
                            onClick={() => handleToppingToggle(tp.name)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/10 text-slate-900 font-extrabold'
                                : 'border-slate-150 hover:border-slate-250'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300'}`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </span>
                              <span className="text-[11px] font-bold text-slate-700 leading-none">{tp.name}</span>
                            </div>
                            <span className="text-[11px] font-black text-slate-400">+₹{tp.price}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Quantity setting */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-xs font-black text-slate-800">Assign Quantity</span>
                <div className="flex items-center space-x-3 bg-slate-100 rounded-xl p-1 font-mono">
                  <button
                    onClick={() => setCustomQuantity(Math.max(1, customQuantity - 1))}
                    className="w-8 h-8 font-black rounded-lg bg-white hover:bg-slate-50 border border-slate-200/50 text-slate-800 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-sm w-4 text-center">{customQuantity}</span>
                  <button
                    onClick={() => setCustomQuantity(customQuantity + 1)}
                    className="w-8 h-8 font-black rounded-lg bg-white hover:bg-slate-50 border border-slate-200/50 text-slate-800 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer with Pricing actions */}
            <div className="bg-slate-50 p-5 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block leading-none">Total Custom Price</span>
                <span className="text-xl font-black text-slate-950">₹{calculateConfiguredPrice() * customQuantity}</span>
              </div>
              <button
                onClick={handleAddCustomizedToCart}
                className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
              >
                Add Custom Pizza to Cart <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
