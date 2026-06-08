import fs from 'fs';
import path from 'path';
import connectDB from './config/db.js';
import { 
  User, Order, Product, MenuItem, Category, Payment, Coupon, Franchise, 
  DeliveryAgent, Recommendation, Complaint, Feedback, SupportRequest, Combo, 
  UpsellAnalytics, RecoveryCoupon 
} from './models/index.js';

const DB_FILE = path.join(process.cwd(), 'db.json');

// Global DB Clients
let isMongo = false;

// Default products to seed
const defaultProducts = [
  {
    id: 'margherita',
    name: 'Classic Margherita',
    category: 'Pizza',
    description: 'A hugely popular classic pizza made with fresh marinara sauce, tomatoes and creamy mozzarella cheese.',
    basePrice: 99,
    image: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&q=80&w=600',
    isVeg: true,
    sizes: { Regular: 99, Medium: 199, Large: 349 },
    crusts: { 'Classic Hand Tossed': 0, 'Cheese Burst': 75, 'Wheat Thin Crust': 40 },
  },
  {
    id: 'farmhouse',
    name: 'Farmhouse Special',
    category: 'Pizza',
    description: 'Delightful combination of fresh onion, crunchy capsicum, juicy tomato, and delicious mushrooms.',
    basePrice: 179,
    image: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&q=80&w=600',
    isVeg: true,
    sizes: { Regular: 179, Medium: 329, Large: 549 },
    crusts: { 'Classic Hand Tossed': 0, 'Cheese Burst': 75, 'Wheat Thin Crust': 40 },
  },
  {
    id: 'peppypaneer',
    name: 'Peppy Paneer Burst',
    category: 'Pizza',
    description: 'Paneer loaded with extra flavor, spicy red paprika, and juicy capsicum with creamy cheese.',
    basePrice: 199,
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=600',
    isVeg: true,
    sizes: { Regular: 199, Medium: 349, Large: 599 },
    crusts: { 'Classic Hand Tossed': 0, 'Cheese Burst': 75, 'Wheat Thin Crust': 40 },
  },
  {
    id: 'bbqchicken',
    name: 'Spicy Barbecue Chicken',
    category: 'Pizza',
    description: 'Tender tandoori chicken chunks marinated in savory barbecue sauce, baked with onions.',
    basePrice: 229,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=600',
    isVeg: false,
    sizes: { Regular: 229, Medium: 399, Large: 649 },
    crusts: { 'Classic Hand Tossed': 0, 'Cheese Burst': 75, 'Wheat Thin Crust': 40 },
  },
  {
    id: 'suprememeat',
    name: 'Non-Veg Supreme',
    category: 'Pizza',
    description: 'Superb loaded non-veg combination of spicy grilled chicken, barbecue chicken, sausage, onion and pepper.',
    basePrice: 249,
    image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?auto=format&fit=crop&q=80&w=600',
    isVeg: false,
    sizes: { Regular: 249, Medium: 449, Large: 749 },
    crusts: { 'Classic Hand Tossed': 0, 'Cheese Burst': 75, 'Wheat Thin Crust': 40 },
  },
  {
    id: 'garlic-bread',
    name: 'Classic Garlic Breadsticks',
    category: 'Sides',
    description: 'Freshly baked buttery garlic bread sticks, perfectly seasoned with savory Italian herbs.',
    basePrice: 99,
    image: 'https://images.unsplash.com/photo-1619535860434-ba1d8fa12536?auto=format&fit=crop&q=80&w=600',
    isVeg: true,
    sizes: { Regular: 99, Medium: 99, Large: 99 },
    crusts: { 'Classic Hand Tossed': 0, 'Cheese Burst': 0, 'Wheat Thin Crust': 0 },
  },
  {
    id: 'stuffed-garlic-bread',
    name: 'Stuffed Cheesy Garlic Bread',
    category: 'Sides',
    description: 'Gourmet garlic bread stuffed with fresh sweet corn, cheese and spicy green jalapenos.',
    basePrice: 149,
    image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&q=80&w=600',
    isVeg: true,
    sizes: { Regular: 149, Medium: 149, Large: 149 },
    crusts: { 'Classic Hand Tossed': 0, 'Cheese Burst': 0, 'Wheat Thin Crust': 0 },
  },
  {
    id: 'lavacake',
    name: 'Warm Choco Lava Cake',
    category: 'Desserts',
    description: 'Rich dark chocolate cake containing an incredibly decadent hot molten chocolate lava core.',
    basePrice: 99,
    image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&q=80&w=600',
    isVeg: true,
    sizes: { Regular: 99, Medium: 99, Large: 99 },
    crusts: { 'Classic Hand Tossed': 0, 'Cheese Burst': 0, 'Wheat Thin Crust': 0 },
  },
  {
    id: 'pepsi',
    name: 'Ocean-Cold Pepsi (500ml)',
    category: 'Drinks',
    description: 'Sparkling refreshing carbonated cola beverage delivered perfectly chilled and crisp.',
    basePrice: 45,
    image: 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&q=80&w=600',
    isVeg: true,
    sizes: { Regular: 45, Medium: 45, Large: 45 },
    crusts: { 'Classic Hand Tossed': 0, 'Cheese Burst': 0, 'Wheat Thin Crust': 0 },
  },
];

const defaultCoupons = [
  { code: 'FREE40', description: 'Get 10% OFF on your favorite dishes (Min Order: ₹300, Max Discount: ₹40)', discountPercent: 10, minOrder: 300, maxDiscount: 40 },
  { code: 'FLOWFEAST', description: 'Mega Feast Offer! 15% OFF for larger orders (Min Order: ₹500, Max Discount: ₹100)', discountPercent: 15, minOrder: 500, maxDiscount: 100 },
  { code: 'SUPERFOOD', description: 'Ultimate food lover flat 20% discount (Min Order: ₹800, Max Discount: ₹200)', discountPercent: 20, minOrder: 800, maxDiscount: 200 },
];

const defaultFranchises = [
  {
    id: 'prop-cp',
    name: 'Connaught Place Branch (Delhi HQ)',
    ownerName: 'Sunil Malhotra',
    contactNumber: '+919811002233',
    email: 'cp@foodflow.com',
    address: 'H-10, Connaught Circus, New Delhi - 110001',
    location: { lat: 28.6139, lng: 77.2090 },
    deliveryRadius: 10,
    isOpen: true,
    operatingHours: '10:00 AM - 11:30 PM',
    logo: 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&q=80&w=200',
    isActive: true,
  },
  {
    id: 'prop-noida',
    name: 'Noida Sector 62 Branch',
    ownerName: 'Priya Mehra',
    contactNumber: '+919811004455',
    email: 'noida@foodflow.com',
    address: 'C-56, Sector 62, Noida, Uttar Pradesh - 201301',
    location: { lat: 28.6273, lng: 77.3727 },
    deliveryRadius: 15,
    isOpen: true,
    operatingHours: '10:00 AM - 11:00 PM',
    logo: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&q=80&w=200',
    isActive: true,
  },
  {
    id: 'prop-saket',
    name: 'Saket District Centre Branch',
    ownerName: 'Rahul Goel',
    contactNumber: '+919811006677',
    email: 'saket@foodflow.com',
    address: 'MGF Metropolitan Mall, Ground Floor, Saket, New Delhi - 110017',
    location: { lat: 28.5244, lng: 77.2100 },
    deliveryRadius: 8,
    isOpen: false,
    operatingHours: '11:00 AM - 11:00 PM',
    logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=200',
    isActive: true,
  }
];

const defaultAgents = [
  { id: 'agent-1', name: 'Rohan Sharma', phone: '+919999988881', status: 'online', location: { lat: 28.6139, lng: 77.2090 }, franchiseId: 'prop-cp' },
  { id: 'agent-2', name: 'Vikram Singh', phone: '+919999988882', status: 'online', location: { lat: 28.5355, lng: 77.3910 }, franchiseId: 'prop-noida' },
  { id: 'agent-3', name: 'Aman Verma', phone: '+919999988883', status: 'offline', location: { lat: 28.7041, lng: 77.1025 }, franchiseId: 'prop-saket' },
];

const defaultRecommendations = [
  { id: 'rec-1', itemTrigger: 'margherita', recommendItem: 'garlic-bread', badge: 'Frequently Bought Together', discountPercent: 10 },
  { id: 'rec-2', itemTrigger: 'margherita', recommendItem: 'pepsi', badge: 'Complete Your Meal', discountPercent: 15 },
  { id: 'rec-3', itemTrigger: 'farmhouse', recommendItem: 'stuffed-garlic-bread', badge: 'Customers Also Add', discountPercent: 10 },
  { id: 'rec-4', itemTrigger: 'peppypaneer', recommendItem: 'lavacake', badge: 'Sweet Combo Deal', discountPercent: 20 },
  { id: 'rec-5', itemTrigger: 'bbqchicken', recommendItem: 'pepsi', badge: 'Thirst Quencher', discountPercent: 10 }
];

const defaultCombos = [
  { id: 'combo-veg', name: 'Ultimate Veg Pizza Combo', items: ['margherita', 'garlic-bread', 'pepsi'], price: 219, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=600', description: 'Classic Margherita + Garlic Breadsticks + Pepsi. Delicious meal deal!' },
  { id: 'combo-nonveg', name: 'Spicy Non-Veg Combo Deal', items: ['bbqchicken', 'lavacake', 'pepsi'], price: 329, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=600', description: 'Barbecue Chicken Pizza + Warm Choco Lava Cake + Pepsi.' }
];

const defaultUpsellAnalytics = {
  clicks: 12,
  conversions: 4,
  comboPurchases: 2
};

const getLocalDb = () => {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      users: [
        { id: 'admin-1', phone: '+919999900000', name: 'FoodFlow Admin (Super)', email: 'admin@foodflow.com', role: 'admin', address: 'Connaught Place, New Delhi' },
        { id: 'admin-2', phone: '+919999922222', name: 'CP Branch Manager', email: 'cp_manager@foodflow.com', role: 'admin', address: 'Connaught Place Main Office, New Delhi', franchiseId: 'prop-cp' },
        { id: 'admin-3', phone: '+919999933333', name: 'Noida Branch Manager', email: 'noida_manager@foodflow.com', role: 'admin', address: 'Noida Hub, UP', franchiseId: 'prop-noida' },
        { id: 'delivery-1', phone: '+919999911111', name: 'Rohan (Agent)', email: 'rohan@foodflow.com', role: 'delivery', address: 'Noida Sector 62', franchiseId: 'prop-cp' }
      ],
      products: defaultProducts,
      coupons: defaultCoupons,
      orders: [],
      deliveryAgents: defaultAgents,
      franchises: defaultFranchises,
      recommendations: defaultRecommendations,
      combos: defaultCombos,
      upsellAnalytics: defaultUpsellAnalytics,
      feedbacks: [],
      complaints: [],
      recoveryCoupons: [],
      supportRequests: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    if (!parsed.recommendations) parsed.recommendations = defaultRecommendations;
    if (!parsed.combos) parsed.combos = defaultCombos;
    if (!parsed.upsellAnalytics) parsed.upsellAnalytics = defaultUpsellAnalytics;
    if (!parsed.feedbacks) parsed.feedbacks = [];
    if (!parsed.complaints) parsed.complaints = [];
    if (!parsed.recoveryCoupons) parsed.recoveryCoupons = [];
    if (!parsed.supportRequests) parsed.supportRequests = [];
    return parsed;
  } catch (err) {
    console.error('Error reading db.json, returning default');
    return { 
      users: [], 
      products: defaultProducts, 
      coupons: defaultCoupons, 
      orders: [], 
      deliveryAgents: defaultAgents, 
      franchises: defaultFranchises,
      recommendations: defaultRecommendations,
      combos: defaultCombos,
      upsellAnalytics: defaultUpsellAnalytics,
      feedbacks: [],
      complaints: [],
      recoveryCoupons: [],
      supportRequests: []
    };
  }
};

const saveLocalDb = (data) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving to db.json', err);
  }
};

export async function initDatabase() {
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri) {
    try {
      const conn = await connectDB();
      if (conn) {
        isMongo = true;
        console.log('Collections Ready');
        console.log('Persistence Verified');

        // Seed default collections dynamically if they are empty on startup
        try {
          const productCount = await Product.countDocuments();
          if (productCount === 0) {
            console.log('[Seeding] Seeding default products...');
            await Product.insertMany(defaultProducts);
          }
          
          const couponCount = await Coupon.countDocuments();
          if (couponCount === 0) {
            console.log('[Seeding] Seeding default coupons...');
            await Coupon.insertMany(defaultCoupons);
          }

          const franchiseCount = await Franchise.countDocuments();
          if (franchiseCount === 0) {
            console.log('[Seeding] Seeding default franchises...');
            await Franchise.insertMany(defaultFranchises);
          }

          const agentCount = await DeliveryAgent.countDocuments();
          if (agentCount === 0) {
            console.log('[Seeding] Seeding default delivery agents...');
            await DeliveryAgent.insertMany(defaultAgents);
          }

          const recommendationCount = await Recommendation.countDocuments();
          if (recommendationCount === 0) {
            console.log('[Seeding] Seeding default recommendations...');
            await Recommendation.insertMany(defaultRecommendations);
          }

          const comboCount = await Combo.countDocuments();
          if (comboCount === 0) {
            console.log('[Seeding] Seeding default combos...');
            await Combo.insertMany(defaultCombos);
          }

          const upsellCount = await UpsellAnalytics.countDocuments();
          if (upsellCount === 0) {
            console.log('[Seeding] Seeding default upsell analytics...');
            await UpsellAnalytics.create(defaultUpsellAnalytics);
          }

          // Seed default users (Admins, Branch Managers, Delivery Agents)
          const userCount = await User.countDocuments();
          if (userCount === 0) {
            console.log('[Seeding] Seeding default users...');
            const localDbObj = getLocalDb();
            if (localDbObj && localDbObj.users && localDbObj.users.length > 0) {
              await User.insertMany(localDbObj.users);
            }
          }
          
          console.log('[Database] Connection check complete. Empty collections initialized.');
        } catch (seedErr) {
          console.error('[Seeding] Error checking and populating collections:', seedErr);
        }
      } else {
        isMongo = false;
        getLocalDb();
      }
    } catch (err) {
      isMongo = false;
      getLocalDb();
    }
  } else {
    await connectDB();
    isMongo = false;
    getLocalDb();
  }
}

export const db = {
  getProducts: async () => {
    if (isMongo) {
      return await Product.find({}).lean();
    }
    return getLocalDb().products;
  },

  updateProduct: async (prod) => {
    if (isMongo) {
      await Product.updateOne({ id: prod.id }, { $set: prod }, { upsert: true });
    } else {
      const data = getLocalDb();
      const index = data.products.findIndex(p => p.id === prod.id);
      if (index > -1) {
        data.products[index] = prod;
      } else {
        data.products.push(prod);
      }
      saveLocalDb(data);
    }
  },

  deleteProduct: async (id) => {
    if (isMongo) {
      await Product.deleteOne({ id });
    } else {
      const data = getLocalDb();
      data.products = data.products.filter(p => p.id !== id);
      saveLocalDb(data);
    }
  },

  getCoupons: async () => {
    if (isMongo) {
      return await Coupon.find({}).lean();
    }
    return getLocalDb().coupons;
  },

  updateCoupon: async (coupon) => {
    if (isMongo) {
      await Coupon.updateOne({ code: coupon.code }, { $set: coupon }, { upsert: true });
    } else {
      const data = getLocalDb();
      const index = data.coupons.findIndex(c => c.code === coupon.code);
      if (index > -1) {
        data.coupons[index] = coupon;
      } else {
        data.coupons.push(coupon);
      }
      saveLocalDb(data);
    }
  },

  deleteCoupon: async (code) => {
    if (isMongo) {
      await Coupon.deleteOne({ code });
    } else {
      const data = getLocalDb();
      data.coupons = data.coupons.filter(c => c.code !== code);
      saveLocalDb(data);
    }
  },

  getUsers: async () => {
    if (isMongo) {
      return await User.find({}).lean();
    }
    return getLocalDb().users;
  },

  getUserByPhone: async (phone) => {
    if (isMongo) {
      return await User.findOne({ phone }).lean();
    }
    return getLocalDb().users.find(u => u.phone === phone) || null;
  },

  getUserByEmail: async (email) => {
    if (isMongo) {
      return await User.findOne({ email }).lean();
    }
    return getLocalDb().users.find(u => u.email === email) || null;
  },

  getUserById: async (id) => {
    if (isMongo) {
      return await User.findOne({ id }).lean();
    }
    return getLocalDb().users.find(u => u.id === id) || null;
  },

  updateUser: async (user) => {
    if (isMongo) {
      await User.updateOne({ id: user.id }, { $set: user }, { upsert: true });
    } else {
      const data = getLocalDb();
      const index = data.users.findIndex(u => u.id === user.id || u.phone === user.phone);
      if (index > -1) {
        data.users[index] = { ...data.users[index], ...user };
      } else {
        data.users.push(user);
      }
      saveLocalDb(data);
    }
  },

  getOrders: async () => {
    if (isMongo) {
      return await Order.find({}).sort({ createdAt: -1 }).lean();
    }
    return [...getLocalDb().orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getOrderById: async (id) => {
    if (isMongo) {
      return await Order.findOne({ id }).lean();
    }
    return getLocalDb().orders.find(o => o.id === id) || null;
  },

  createOrder: async (order) => {
    if (isMongo) {
      await Order.create(order);
    } else {
      const data = getLocalDb();
      data.orders.push(order);
      saveLocalDb(data);
    }
  },

  updateOrder: async (order) => {
    if (isMongo) {
      await Order.updateOne({ id: order.id }, { $set: order }, { upsert: true });
    } else {
      const data = getLocalDb();
      const index = data.orders.findIndex(o => o.id === order.id);
      if (index > -1) {
        data.orders[index] = order;
      } else {
        data.orders.push(order);
      }
      saveLocalDb(data);
    }
  },

  updateOrderStatus: async (id, status, agentInfo) => {
    let order = null;
    if (isMongo) {
      const updateData = { status };
      if (agentInfo) {
        if (agentInfo.agentId) updateData.deliveryAgentId = agentInfo.agentId;
        if (agentInfo.agentName) updateData.deliveryAgentName = agentInfo.agentName;
        if (agentInfo.agentPhone) updateData.deliveryAgentPhone = agentInfo.agentPhone;
      }
      await Order.updateOne({ id }, { $set: updateData });
      order = await Order.findOne({ id }).lean();
    } else {
      const data = getLocalDb();
      const index = data.orders.findIndex(o => o.id === id);
      if (index > -1) {
        data.orders[index].status = status;
        if (agentInfo) {
          if (agentInfo.agentId) data.orders[index].deliveryAgentId = agentInfo.agentId;
          if (agentInfo.agentName) data.orders[index].deliveryAgentName = agentInfo.agentName;
          if (agentInfo.agentPhone) data.orders[index].deliveryAgentPhone = agentInfo.agentPhone;
        }
        order = data.orders[index];
        saveLocalDb(data);
      }
    }
    return order;
  },

  getDeliveryAgents: async () => {
    if (isMongo) {
      return await DeliveryAgent.find({}).lean();
    }
    return getLocalDb().deliveryAgents;
  },

  updateAgentLocation: async (id, location, status) => {
    let agent = null;
    if (isMongo) {
      const updateData = { location };
      if (status) updateData.status = status;
      await DeliveryAgent.updateOne({ id }, { $set: updateData });
      agent = await DeliveryAgent.findOne({ id }).lean();
    } else {
      const data = getLocalDb();
      const index = data.deliveryAgents.findIndex(a => a.id === id);
      if (index > -1) {
        data.deliveryAgents[index].location = location;
        if (status) data.deliveryAgents[index].status = status;
        agent = data.deliveryAgents[index];
        saveLocalDb(data);
      }
    }
    return agent;
  },

  getFranchises: async () => {
    if (isMongo) {
      return await Franchise.find({}).lean();
    }
    return getLocalDb().franchises;
  },

  updateFranchise: async (franchise) => {
    if (isMongo) {
      await Franchise.updateOne({ id: franchise.id }, { $set: franchise }, { upsert: true });
    } else {
      const data = getLocalDb();
      const index = data.franchises.findIndex(f => f.id === franchise.id);
      if (index > -1) {
        data.franchises[index] = franchise;
      } else {
        data.franchises.push(franchise);
      }
      saveLocalDb(data);
    }
  },

  deleteFranchise: async (id) => {
    if (isMongo) {
      await Franchise.deleteOne({ id });
    } else {
      const data = getLocalDb();
      data.franchises = data.franchises.filter(f => f.id !== id);
      saveLocalDb(data);
    }
  },

  // --- Recommendation Engine ---
  getRecommendations: async () => {
    if (isMongo) {
      return await Recommendation.find({}).lean();
    }
    return getLocalDb().recommendations;
  },

  updateRecommendation: async (rec) => {
    if (isMongo) {
      await Recommendation.updateOne({ id: rec.id }, { $set: rec }, { upsert: true });
    } else {
      const data = getLocalDb();
      const index = data.recommendations.findIndex(r => r.id === rec.id);
      if (index > -1) {
        data.recommendations[index] = rec;
      } else {
        data.recommendations.push(rec);
      }
      saveLocalDb(data);
    }
  },

  deleteRecommendation: async (id) => {
    if (isMongo) {
      await Recommendation.deleteOne({ id });
    } else {
      const data = getLocalDb();
      data.recommendations = data.recommendations.filter(r => r.id !== id);
      saveLocalDb(data);
    }
  },

  getCombos: async () => {
    if (isMongo) {
      return await Combo.find({}).lean();
    }
    return getLocalDb().combos;
  },

  updateCombo: async (combo) => {
    if (isMongo) {
      await Combo.updateOne({ id: combo.id }, { $set: combo }, { upsert: true });
    } else {
      const data = getLocalDb();
      const index = data.combos.findIndex(c => c.id === combo.id);
      if (index > -1) {
        data.combos[index] = combo;
      } else {
        data.combos.push(combo);
      }
      saveLocalDb(data);
    }
  },

  deleteCombo: async (id) => {
    if (isMongo) {
      await Combo.deleteOne({ id });
    } else {
      const data = getLocalDb();
      data.combos = data.combos.filter(c => c.id !== id);
      saveLocalDb(data);
    }
  },

  getUpsellAnalytics: async () => {
    if (isMongo) {
      const stats = await UpsellAnalytics.findOne({}).lean();
      return stats || defaultUpsellAnalytics;
    }
    const data = getLocalDb();
    return data.upsellAnalytics || defaultUpsellAnalytics;
  },

  incrementUpsellAnalytics: async (field) => {
    if (isMongo) {
      await UpsellAnalytics.updateOne({}, { $inc: { [field]: 1 } }, { upsert: true });
    } else {
      const data = getLocalDb();
      if (!data.upsellAnalytics) data.upsellAnalytics = { ...defaultUpsellAnalytics };
      data.upsellAnalytics[field] = (data.upsellAnalytics[field] || 0) + 1;
      saveLocalDb(data);
    }
  },

  // --- Complaint & Feedback Recovery System ---
  getFeedback: async () => {
    if (isMongo) {
      return await Feedback.find({}).lean();
    }
    return getLocalDb().feedbacks;
  },

  createFeedback: async (feedback) => {
    if (isMongo) {
      await Feedback.create(feedback);
    } else {
      const data = getLocalDb();
      data.feedbacks.push(feedback);
      saveLocalDb(data);
    }
  },

  getComplaints: async () => {
    if (isMongo) {
      return await Complaint.find({}).lean();
    }
    return getLocalDb().complaints;
  },

  createComplaint: async (complaint) => {
    if (isMongo) {
      await Complaint.create(complaint);
    } else {
      const data = getLocalDb();
      data.complaints.push(complaint);
      saveLocalDb(data);
    }
  },

  updateComplaintStatusOrNotes: async (id, status, adminNotes) => {
    if (isMongo) {
      const updateData = {};
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      await Complaint.updateOne({ id }, { $set: updateData });
    } else {
      const data = getLocalDb();
      const index = data.complaints.findIndex(c => c.id === id);
      if (index > -1) {
        if (status) data.complaints[index].status = status;
        if (adminNotes !== undefined) data.complaints[index].adminNotes = adminNotes;
        saveLocalDb(data);
      }
    }
  },

  getRecoveryCoupons: async () => {
    if (isMongo) {
      return await RecoveryCoupon.find({}).lean();
    }
    return getLocalDb().recoveryCoupons;
  },

  createRecoveryCoupon: async (coupon) => {
    if (isMongo) {
      await RecoveryCoupon.create(coupon);
      await Coupon.updateOne({ code: coupon.code }, { $set: coupon }, { upsert: true });
    } else {
      const data = getLocalDb();
      data.recoveryCoupons.push(coupon);
      const idx = data.coupons.findIndex(c => c.code === coupon.code);
      if (idx > -1) {
        data.coupons[idx] = coupon;
      } else {
        data.coupons.push(coupon);
      }
      saveLocalDb(data);
    }
  },

  getSupportRequests: async () => {
    if (isMongo) {
      return await SupportRequest.find({}).lean();
    }
    return getLocalDb().supportRequests;
  },

  createSupportRequest: async (req) => {
    if (isMongo) {
      await SupportRequest.create(req);
    } else {
      const data = getLocalDb();
      data.supportRequests.push(req);
      saveLocalDb(data);
    }
  }
};
