import { configureStore, createSlice } from '@reduxjs/toolkit';

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    isAuthenticated: false,
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setUser, logout } = authSlice.actions;

// Cart slice
const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    selectedFranchise: null,
    selectedFranchiseId: null,
    coupon: null,
  },
  reducers: {
    addToCart(state, action) {
      const newItem = action.payload;
      const existingItem = state.items.find((item) => item.id === newItem.id);
      if (existingItem) {
        existingItem.quantity += newItem.quantity || 1;
        existingItem.totalPrice = existingItem.singleItemPrice * existingItem.quantity;
      } else {
        state.items.push(newItem);
      }
    },
    removeFromCart(state, action) {
      const id = action.payload;
      state.items = state.items.filter((item) => item.id !== id);
    },
    updateQuantity(state, action) {
      const { id, quantity } = action.payload;
      const existingItem = state.items.find((item) => item.id === id);
      if (existingItem) {
        if (quantity <= 0) {
          state.items = state.items.filter((item) => item.id !== id);
        } else {
          existingItem.quantity = quantity;
          existingItem.totalPrice = existingItem.singleItemPrice * quantity;
        }
      }
    },
    applyCoupon(state, action) {
      state.coupon = action.payload;
    },
    setFranchise(state, action) {
      state.selectedFranchise = action.payload;
      state.selectedFranchiseId = action.payload ? action.payload.id : null;
    },
    clearCart(state) {
      state.items = [];
      state.coupon = null;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  applyCoupon,
  setFranchise,
  clearCart,
} = cartSlice.actions;

// Selector for Cart Totals
export const selectCartTotals = (state) => {
  const items = state.cart.items || [];
  const coupon = state.cart.coupon;

  const subtotal = items.reduce((acc, item) => acc + (item.singleItemPrice * item.quantity), 0);
  
  let discount = 0;
  if (coupon) {
    if (coupon.discountType === 'percentage' || coupon.type === 'percentage') {
      const discountVal = coupon.discountValue || coupon.value || 0;
      discount = (subtotal * discountVal) / 100;
    } else {
      discount = coupon.discountValue || coupon.value || 0;
    }
  }

  // Delivery fee rules
  const deliveryFee = subtotal > 0 ? 49 : 0; // Flat 49 rupees delivery fee
  const total = Math.max(0, subtotal - discount + deliveryFee);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return {
    subtotal,
    discount,
    deliveryFee,
    total,
    itemCount,
  };
};

// Configure Store
const store = configureStore({
  reducer: {
    auth: authSlice.reducer,
    cart: cartSlice.reducer,
  },
});

export default store;
