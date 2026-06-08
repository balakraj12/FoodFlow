import mongoose from 'mongoose';

// 1. User Schema & Model
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  name: { type: String },
  email: { type: String },
  password: { type: String }, // Hashed using bcryptjs
  role: { type: String, default: 'customer' },
  address: { type: String }, // Default saved address string
  addresses: { type: Array, default: [] }, // Array of saved addresses
  currentLocation: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  },
  latitude: { type: Number },
  longitude: { type: Number },
  franchiseId: { type: String }
}, { timestamps: true, strict: false, collection: 'users' });

export const User = mongoose.model('User', userSchema);

// 2. Order Schema & Model
const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String },
  name: { type: String },
  phone: { type: String },
  items: { type: Array, default: [] },
  totalAmount: { type: Number },
  status: { type: String, default: 'pending' },
  deliveryAgentId: { type: String },
  deliveryAgentName: { type: String },
  deliveryAgentPhone: { type: String },
  createdAt: { type: Date, default: Date.now },
  // Map and Dynamic ETA expansion fields
  deliveryLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  customerLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  liveCoordinates: {
    lat: { type: Number },
    lng: { type: Number }
  },
  estimatedDeliveryTime: { type: Number },
  distanceRemaining: { type: Number },
  riderStatus: { type: String },
  trackingHistory: { type: Array, default: [] },
  deliveryStartedAt: { type: Date },
  lastLocationUpdate: { type: Date }
}, { timestamps: true, strict: false, collection: 'orders' });

export const Order = mongoose.model('Order', orderSchema);

// 3. Product Schema & Model
const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String },
  description: { type: String },
  basePrice: { type: Number },
  image: { type: String },
  isVeg: { type: Boolean, default: true },
  sizes: { type: Map, of: Number },
  crusts: { type: Map, of: Number },
}, { timestamps: true, strict: false, collection: 'products' });

export const Product = mongoose.model('Product', productSchema);

// 4. MenuItem Schema & Model (Points to menuItems collection or fallback to products)
const menuItemSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String },
  description: { type: String },
  basePrice: { type: Number },
  image: { type: String },
}, { timestamps: true, strict: false, collection: 'menuItems' });

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// 5. Category Schema & Model
const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String }
}, { timestamps: true, strict: false, collection: 'categories' });

export const Category = mongoose.model('Category', categorySchema);

// 6. Payment Schema & Model (For payment tracking)
const paymentSchema = new mongoose.Schema({
  paymentId: { type: String, unique: true },
  orderId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String },
  method: { type: String },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true, strict: false, collection: 'payments' });

export const Payment = mongoose.model('Payment', paymentSchema);

// 7. Coupon Schema & Model
const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String },
  discountPercent: { type: Number },
  minOrder: { type: Number },
  maxDiscount: { type: Number }
}, { timestamps: true, strict: false, collection: 'coupons' });

export const Coupon = mongoose.model('Coupon', couponSchema);

// 8. Franchise Schema & Model
const franchiseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  ownerName: { type: String },
  contactNumber: { type: String },
  email: { type: String },
  address: { type: String },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  deliveryRadius: { type: Number },
  isOpen: { type: Boolean, default: true },
  operatingHours: { type: String },
  logo: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true, strict: false, collection: 'franchises' });

export const Franchise = mongoose.model('Franchise', franchiseSchema);

// 9. DeliveryAgent Schema & Model
const deliveryAgentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String },
  status: { type: String, default: 'offline' },
  location: {
    lat: { type: Number },
    lng: { type: Number }
  },
  franchiseId: { type: String }
}, { timestamps: true, strict: false, collection: 'deliveryAgents' });

export const DeliveryAgent = mongoose.model('DeliveryAgent', deliveryAgentSchema);

// 10. Recommendation Schema & Model
const recommendationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  itemTrigger: { type: String },
  recommendItem: { type: String },
  badge: { type: String },
  discountPercent: { type: Number }
}, { timestamps: true, strict: false, collection: 'recommendations' });

export const Recommendation = mongoose.model('Recommendation', recommendationSchema);

// 11. Complaint Schema & Model
const complaintSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  orderId: { type: String },
  userId: { type: String },
  details: { type: String },
  status: { type: String, default: 'open' },
  adminNotes: { type: String }
}, { timestamps: true, strict: false, collection: 'complaints' });

export const Complaint = mongoose.model('Complaint', complaintSchema);

// 12. Feedback Schema & Model
const feedbackSchema = new mongoose.Schema({
  orderId: { type: String },
  userId: { type: String },
  userName: { type: String },
  phone: { type: String },
  rating: { type: Number },
  feedbackText: { type: String }
}, { timestamps: true, strict: false, collection: 'feedbacks' });

export const Feedback = mongoose.model('Feedback', feedbackSchema);

// 13. SupportRequest Schema & Model
const supportRequestSchema = new mongoose.Schema({
  id: { type: String },
  userId: { type: String },
  orderId: { type: String },
  userName: { type: String },
  phone: { type: String },
  type: { type: String },
  details: { type: String },
  resolved: { type: Boolean, default: false }
}, { timestamps: true, strict: false, collection: 'supportRequests' });

export const SupportRequest = mongoose.model('SupportRequest', supportRequestSchema);

// 14. Combo Schema & Model
const comboSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  items: { type: Array, default: [] },
  price: { type: Number },
  image: { type: String },
  description: { type: String }
}, { timestamps: true, strict: false, collection: 'combos' });

export const Combo = mongoose.model('Combo', comboSchema);

// 15. UpsellAnalytics Schema & Model
const upsellAnalyticsSchema = new mongoose.Schema({
  clicks: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  comboPurchases: { type: Number, default: 0 }
}, { timestamps: true, strict: false, collection: 'upsellAnalytics' });

export const UpsellAnalytics = mongoose.model('UpsellAnalytics', upsellAnalyticsSchema);

// 16. RecoveryCoupon Schema & Model
const recoveryCouponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String },
  discountPercent: { type: Number },
  minOrder: { type: Number },
  maxDiscount: { type: Number }
}, { timestamps: true, strict: false, collection: 'recoveryCoupons' });

export const RecoveryCoupon = mongoose.model('RecoveryCoupon', recoveryCouponSchema);
