import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from './middleware/auth.js';
import { initDatabase, db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup environment variables
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });
dotenv.config({ override: true });

const JWT_SECRET = process.env.JWT_SECRET || 'foodflow-super-secret-key-123';

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

const PORT = process.env.PORT || 3000;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  
  // Custom CORS, parsed body
  app.use(express.json());

  // Init Database
  console.log('Starting backend...');
  console.log('Attempting MongoDB connection...');
  await initDatabase();

  // Socket.io initialization on the SAME port 3000 as Express
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    },
  });

  // Socket connection and room isolation logic for Real-Time Tracking
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Customer joins a room for a specific order tracking
    socket.on('join-order', (orderId) => {
      socket.join(`order:${orderId}`);
      console.log(`Socket ${socket.id} joined channel order:${orderId}`);
    });

    // Delivery agent joins a room for delivery tracking
    socket.on('join-agent', (agentId) => {
      socket.join(`agent:${agentId}`);
      console.log(`Socket ${socket.id} joined channel agent:${agentId}`);
    });

    // Agent reports their live coordinates
    socket.on('update-agent-location', async (data) => {
      const { agentId, orderId, location, distanceRemaining, estimatedDeliveryTime, riderStatus } = data;
      console.log(`Agent ${agentId} location update:`, location);
      
      // Update agent in DB
      await db.updateAgentLocation(agentId, location, 'delivering');

      // Sync active location in Order database if orderId is provided
      if (orderId) {
        try {
          const order = await db.getOrderById(orderId);
          if (order) {
            order.liveCoordinates = location;
            if (distanceRemaining !== undefined) order.distanceRemaining = distanceRemaining;
            if (estimatedDeliveryTime !== undefined) {
              order.estimatedDeliveryTime = estimatedDeliveryTime;
              order.totalETA = estimatedDeliveryTime;
            }
            if (riderStatus !== undefined) order.riderStatus = riderStatus;
            
            // Append coordinate update to location tracking history
            if (!order.trackingHistory) order.trackingHistory = [];
            order.trackingHistory.push({
              lat: location.lat,
              lng: location.lng,
              timestamp: new Date().toISOString()
            });
            order.lastLocationUpdate = new Date().toISOString();
            if (!order.deliveryStartedAt && order.status === 'out_for_delivery') {
              order.deliveryStartedAt = new Date().toISOString();
            }
            
            await db.updateOrder(order);
            
            // Emit updated full order details
            io.to(`order:${orderId}`).emit('order-status-received', order);
          }
        } catch (err) {
          console.error(`Error updating order ${orderId} coordinate state:`, err);
        }
      }

      // Sync active location with order subscribers & agent subscribers
      if (orderId) {
        io.to(`order:${orderId}`).emit('agent-location-received', { agentId, location, distanceRemaining, estimatedDeliveryTime });
      }
      io.to(`agent:${agentId}`).emit('agent-location-received', { agentId, location, distanceRemaining, estimatedDeliveryTime });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  // --- API Routes ---

  // OTP Request (Simulating Firebase OTP verify or real account mapping)
  app.post('/api/auth/otp-request', async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    // Return a dummy OTP code '123456' for seamless customer sandbox sign-in
    console.log(`[AUTH] Requested verification OTP for user: ${phone}`);
    return res.json({ success: true, message: 'OTP verification code sent successfully to phone', otp: '123456' });
  });

  // Verify OTP & Sign JWT
  app.post('/api/auth/verify', async (req, res) => {
    const { phone, name, email, otp, role } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone number and verification code are required' });
    }

    if (otp !== '123456') {
      return res.status(400).json({ error: 'Invalid verification OTP code. Try entering 123456.' });
    }

    try {
      let user = await db.getUserByPhone(phone);
      if (!user) {
        // Automatically register standard role if new profile
        user = {
          id: `usr-${Math.random().toString(36).substr(2, 9)}`,
          phone,
          name: name || 'Valued Customer',
          email: email || `${phone.replace('+', '')}@foodflow.com`,
          role: role || 'customer',
          address: '',
          addresses: [],
        };
        await db.updateUser(user);
        console.log(`[AUTH] Registered new user profile: ${phone}`);
      } else if (name || email) {
        user = { ...user, name: name || user.name, email: email || user.email };
        await db.updateUser(user);
      }
      
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, user, token });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Register with Password & Hash with bcryptjs
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, phone, password, confirmPassword, role } = req.body;
    if (!name || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    try {
      const userByPhone = await db.getUserByPhone(phone);
      if (userByPhone) {
        return res.status(400).json({ success: false, error: 'Phone number already registered' });
      }

      const userByEmail = await db.getUserByEmail(email);
      if (userByEmail) {
        return res.status(400).json({ success: false, error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = {
        id: `usr-${Math.random().toString(36).substr(2, 9)}`,
        phone,
        name,
        email,
        password: hashedPassword,
        role: role || 'customer',
        address: '',
        addresses: [],
        createdAt: new Date().toISOString()
      };

      await db.updateUser(newUser);
      console.log(`[AUTH] Registered new user: ${email} with role: ${newUser.role}`);

      const token = jwt.sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...userWithoutPassword } = newUser;

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        user: userWithoutPassword,
        token
      });
    } catch (err) {
      console.error('[AUTH] Registration Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Login with Email & Password
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    try {
      const user = await db.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      if (!user.password) {
        return res.status(400).json({ 
          success: false, 
          error: 'This account was signed up via OTP. Please sign in with phone OTP.' 
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid email or password' });
      }

      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...userWithoutPassword } = user;

      return res.json({
        success: true,
        message: 'Login successful',
        user: userWithoutPassword,
        token
      });
    } catch (err) {
      console.error('[AUTH] Login Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get current verified session
  app.get('/api/auth/me', authenticate, async (req, res) => {
    try {
      const { password, ...userWithoutPassword } = req.user;
      return res.json({ success: true, user: userWithoutPassword });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Forgot password
  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email, newPassword, securityCode } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    try {
      const user = await db.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Email address not registered' });
      }

      if (!newPassword) {
        return res.json({
          success: true,
          message: 'Security verification code generated! Enter code 654321',
          requiresCode: true,
          code: '654321'
        });
      }

      if (securityCode !== '654321') {
        return res.status(400).json({ success: false, error: 'Invalid security verification code. Please use 654321.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      user.password = hashedPassword;
      await db.updateUser(user);

      return res.json({
        success: true,
        message: 'Password reset successfully. You can now log in.'
      });
    } catch (err) {
      console.error('[AUTH] Forgot Password Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Location onboarding: Save delivery address in MongoDB profile
  app.post('/api/auth/save-address', authenticate, async (req, res) => {
    const { label, fullAddress, city, state, pincode, lat, lng, isDefault } = req.body;
    if (!fullAddress || lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'Address string, latitude, and longitude are required' });
    }

    try {
      const user = req.user;
      if (!user.addresses) user.addresses = [];

      const newAddress = {
        id: `addr-${Math.random().toString(36).substr(2, 9)}`,
        label: label || 'Home',
        fullAddress,
        city: city || '',
        state: state || '',
        pincode: pincode || '',
        lat: Number(lat),
        lng: Number(lng),
        isDefault: isDefault || user.addresses.length === 0
      };

      if (newAddress.isDefault) {
        user.addresses.forEach(a => { a.isDefault = false; });
      }

      user.addresses.push(newAddress);
      
      // Update default profile variables
      user.address = fullAddress;
      user.currentLocation = { lat: Number(lat), lng: Number(lng), address: fullAddress };
      user.latitude = Number(lat);
      user.longitude = Number(lng);

      await db.updateUser(user);
      console.log(`[AUTH] Saved brand new address for user ${user.id}: ${label}`);

      const { password, ...userWithoutPassword } = user;
      return res.json({
        success: true,
        message: 'Address saved successfully',
        user: userWithoutPassword
      });
    } catch (err) {
      console.error('[AUTH] Save Address Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Switch between saved user locations
  app.post('/api/auth/select-address', authenticate, async (req, res) => {
    const { addressId } = req.body;
    if (!addressId) {
      return res.status(400).json({ success: false, error: 'addressId is required' });
    }

    try {
      const user = req.user;
      const addr = user.addresses ? user.addresses.find(a => a.id === addressId) : null;
      if (!addr) {
        return res.status(404).json({ success: false, error: 'Address not found in profile list' });
      }

      user.addresses.forEach(a => {
        a.isDefault = (a.id === addressId);
      });

      user.address = addr.fullAddress;
      user.currentLocation = { lat: addr.lat, lng: addr.lng, address: addr.fullAddress };
      user.latitude = addr.lat;
      user.longitude = addr.lng;

      await db.updateUser(user);
      console.log(`[AUTH] Selected default address for user ${user.id} to: ${addr.label}`);

      const { password, ...userWithoutPassword } = user;
      return res.json({
        success: true,
        message: 'Active delivery address switched',
        user: userWithoutPassword
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Legacy fallback profile update
  app.post('/api/auth/update-profile', async (req, res) => {
    const { id, name, email, address } = req.body;
    try {
      const users = await db.getUsers();
      const user = users.find(u => u.id === id);
      if (!user) {
        return res.status(404).json({ error: 'User account not found' });
      }
      const updatedUser = { ...user, name: name || user.name, email: email || user.email, address: address || user.address };
      await db.updateUser(updatedUser);
      return res.json({ success: true, user: updatedUser });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Menu APIs
  app.get('/api/menu', async (req, res) => {
    try {
      let products = await db.getProducts();
      const { franchiseId } = req.query;
      if (franchiseId && franchiseId !== 'global') {
        products = products.filter(p => !p.franchiseIds || p.franchiseIds.length === 0 || p.franchiseIds.includes(franchiseId));
      }
      return res.json(products);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/menu', async (req, res) => {
    const product = req.body;
    if (!product.id || !product.name || !product.category) {
      return res.status(400).json({ error: 'Product metadata details are missing' });
    }
    try {
      await db.updateProduct(product);
      return res.json({ success: true, product });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/menu/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await db.deleteProduct(id);
      return res.json({ success: true, message: 'Item deleted' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Coupons APIs
  app.get('/api/coupons', async (req, res) => {
    try {
      let coupons = await db.getCoupons();
      const { franchiseId } = req.query;
      if (franchiseId && franchiseId !== 'global') {
        coupons = coupons.filter(c => !c.franchiseId || c.franchiseId === franchiseId);
      }
      return res.json(coupons);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/coupons', async (req, res) => {
    const coupon = req.body;
    if (!coupon.code || !coupon.discountPercent || !coupon.minOrder) {
      return res.status(400).json({ error: 'Coupon code, min order requirements are missing' });
    }
    try {
      await db.updateCoupon(coupon);
      return res.json({ success: true, coupon });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/coupons/:code', async (req, res) => {
    const { code } = req.params;
    try {
      await db.deleteCoupon(code);
      return res.json({ success: true, message: 'Coupon code removed successfuly' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/coupons/validate', async (req, res) => {
    const { code, cartAmount } = req.body;
    try {
      const coupons = await db.getCoupons();
      const coupon = coupons.find(c => c.code.toUpperCase() === code.toUpperCase());
      if (!coupon) {
        return res.status(404).json({ error: 'Coupon code is invalid or expired.' });
      }
      if (cartAmount < coupon.minOrder) {
        return res.status(400).json({ error: `This coupon requires a minimum order value of ₹${coupon.minOrder}` });
      }
      return res.json({ success: true, coupon });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Order APIs
  app.post('/api/orders', async (req, res) => {
    const { userId, phone, name, items, subtotal, discount, deliveryFee, totalAmount, paymentMethod, address, franchiseId, franchiseName, location } = req.body;

    if (!userId || !items || !totalAmount || !address) {
      return res.status(400).json({ error: 'Order parameters are incomplete' });
    }

    try {
      // Fetch active orders to calculate kitchen queue load
      const allOrders = await db.getOrders();
      const activeKitchenLoad = allOrders.filter(o => ['pending', 'preparing'].includes(o.status)).length;

      // Dynamic calculation: 10 mins baseline + 2 minutes for each active order
      const estimatedPrepTime = 10 + (activeKitchenLoad * 2);

      let distance = 0;
      if (location && franchiseId) {
        const franchises = await db.getFranchises();
        const franchise = franchises.find(f => f.id === franchiseId);
        if (franchise && franchise.location) {
          distance = getDistance(location.lat, location.lng, franchise.location.lat, franchise.location.lng);
        }
      }

      // Transit: minimum 5 minutes, speed assumed 1.5 minutes per km transit
      const estimatedDeliveryTime = Math.max(5, Math.ceil(distance * 1.5));
      const totalETA = estimatedPrepTime + estimatedDeliveryTime;

      const trackingTimeline = [
        { status: 'pending', title: 'Order Confirmed', description: 'Store accepted your custom pizza order', completed: true, updatedAt: new Date().toISOString() },
        { status: 'preparing', title: 'Preparing Food', description: 'Baking loaded toppings fresh on hand-tossed base', completed: false },
        { status: 'packed', title: 'Packed', description: 'Pizza packed inside insulated thermal boxes', completed: false },
        { status: 'rider_assigned', title: 'Rider Assigned', description: 'Dedicated rider matched to dispatch routes', completed: false },
        { status: 'out_for_delivery', title: 'Out for Delivery', description: 'Rider motoring hot pizza direct to your door', completed: false },
        { status: 'delivered', title: 'Pizza Delivered', description: 'Piping hot order passed and signed successfully!', completed: false }
      ];

      // Create order entry
      const newOrder = {
        id: `ff-${Math.floor(100000 + Math.random() * 900000)}`,
        userId,
        phone,
        name,
        items,
        subtotal,
        discount,
        deliveryFee,
        totalAmount,
        paymentMethod,
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'paid', // paid straight for emulated Razorpay
        paymentId: paymentMethod === 'cod' ? undefined : `pay_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        address,
        location,
        // Map and Dynamic ETA fields
        customerLocation: location || { lat: 28.6273, lng: 77.3727 },
        deliveryLocation: location || { lat: 28.6273, lng: 77.3727 },
        liveCoordinates: undefined,
        franchiseId,
        franchiseName,
        createdAt: new Date().toISOString(),
        estimatedPrepTime,
        estimatedDeliveryTime,
        totalETA,
        riderAssigned: false,
        trackingTimeline,
        liveStatusUpdatedAt: new Date().toISOString(),
        trackingHistory: [],
        distanceRemaining: distance,
        riderStatus: 'unassigned'
      };

      await db.createOrder(newOrder);

      // Log/track conversion and combo purchases inside recommendation engine analytics
      let hasUpsell = false;
      let hasCombo = false;
      items.forEach(it => {
        if (it.isUpsell || it.addedFromRecommendation) hasUpsell = true;
        if (it.isCombo || it.product?.id?.startsWith('combo')) hasCombo = true;
      });

      if (hasUpsell) {
        await db.incrementUpsellAnalytics('conversions');
      }
      if (hasCombo) {
        await db.incrementUpsellAnalytics('comboPurchases');
      }

      // Trigger socket event for orders
      io.emit('order-created', newOrder);

      return res.json({ success: true, order: newOrder });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/orders', async (req, res) => {
    const { userId, role, franchiseId } = req.query;
    try {
      const orders = await db.getOrders();
      if (role === 'admin') {
        if (franchiseId && franchiseId !== 'global') {
          return res.json(orders.filter(o => o.franchiseId === franchiseId));
        }
        return res.json(orders);
      }
      if (role === 'delivery') {
        // Return active orders that are prepared or out for delivery, or assigned to this delivery agent (optionally filtered by franchise branch)
        const deliveryOrders = orders.filter(o => {
          const belongsToBranch = !franchiseId || franchiseId === 'global' || o.franchiseId === franchiseId;
          const isRelevantStatus = o.status === 'preparing' || o.status === 'out_for_delivery' || o.deliveryAgentId === userId;
          return belongsToBranch && isRelevantStatus;
        });
        return res.json(deliveryOrders);
      }
      // Customer orders
      if (userId) {
        const userOrders = orders.filter(o => o.userId === userId);
        return res.json(userOrders);
      }
      return res.json(orders);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/orders/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const order = await db.getOrderById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      return res.json(order);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Update order status (pending -> preparing -> packed -> rider_assigned -> out_for_delivery -> delivered)
  app.patch('/api/orders/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, deliveryAgentId } = req.body;
    try {
      const order = await db.getOrderById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order could not be found' });
      }

      let agentInfo = undefined;
      if (deliveryAgentId) {
        const agents = await db.getDeliveryAgents();
        const agent = agents.find(a => a.id === deliveryAgentId);
        if (agent) {
          agentInfo = {
            agentId: agent.id,
            agentName: agent.name,
            agentPhone: agent.phone,
          };
          order.deliveryAgentId = agent.id;
          order.deliveryAgentName = agent.name;
          order.deliveryAgentPhone = agent.phone;
          order.riderAssigned = true;
          // Put agent into active delivering status in DB
          await db.updateAgentLocation(agent.id, agent.location, 'delivering');
        }
      }

      const orderSteps = ['pending', 'preparing', 'packed', 'rider_assigned', 'out_for_delivery', 'delivered'];
      if (!order.trackingTimeline) {
        order.trackingTimeline = [
          { status: 'pending', title: 'Order Confirmed', description: 'Store accepted your custom pizza order', completed: true, updatedAt: order.createdAt },
          { status: 'preparing', title: 'Preparing Food', description: 'Baking loaded toppings fresh on hand-tossed base', completed: false },
          { status: 'packed', title: 'Packed', description: 'Pizza packed inside insulated thermal boxes', completed: false },
          { status: 'rider_assigned', title: 'Rider Assigned', description: 'Dedicated rider matched to dispatch routes', completed: false },
          { status: 'out_for_delivery', title: 'Out for Delivery', description: 'Rider motoring hot pizza direct to your door', completed: false },
          { status: 'delivered', title: 'Pizza Delivered', description: 'Piping hot order passed and signed successfully!', completed: false }
        ];
      }

      // Mark status step in timeline
      let targetStatus = status || order.status;
      if (deliveryAgentId && targetStatus === 'preparing') {
        // If assigning rider, auto transition timeline to rider_assigned if current is earlier
        order.riderAssigned = true;
      }

      const currentStepIdx = orderSteps.indexOf(targetStatus);
      if (currentStepIdx > -1) {
        order.trackingTimeline = order.trackingTimeline.map((step) => {
          const stepIdx = orderSteps.indexOf(step.status);
          if (stepIdx <= currentStepIdx) {
            return {
              ...step,
              completed: true,
              updatedAt: step.updatedAt || new Date().toISOString()
            };
          }
          return step;
        });
      }

      // If deliveryAgentId is present, make sure rider_assigned stage is marked as completed
      if (order.riderAssigned || deliveryAgentId) {
        order.trackingTimeline = order.trackingTimeline.map((step) => {
          if (step.status === 'rider_assigned') {
            return {
              ...step,
              completed: true,
              updatedAt: step.updatedAt || new Date().toISOString()
            };
          }
          return step;
        });
      }

      order.status = targetStatus;
      order.liveStatusUpdatedAt = new Date().toISOString();

      await db.updateOrder(order);

      // Live Broadcast update over socket room
      io.to(`order:${id}`).emit('order-status-received', order);
      // Also broadcast to admin channel for statistics
      io.emit('order-stats-change', order);

      return res.json({ success: true, order });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Franchise REST APIs
  app.get('/api/franchises', async (req, res) => {
    try {
      const franchises = await db.getFranchises();
      return res.json(franchises);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/franchises', async (req, res) => {
    const franchise = req.body;
    if (!franchise.id || !franchise.name) {
      return res.status(400).json({ error: 'Franchise branch ID and name details are required' });
    }
    try {
      await db.updateFranchise(franchise);
      return res.json({ success: true, franchise });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/franchises/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await db.deleteFranchise(id);
      return res.json({ success: true, message: 'Franchise branch successfully removed' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Delivery Agent APIs
  app.get('/api/delivery/agents', async (req, res) => {
    try {
      const agents = await db.getDeliveryAgents();
      return res.json(agents);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Razorpay simulated signature verification
  app.post('/api/payments/verify', async (req, res) => {
    const { orderId, paymentId } = req.body;
    try {
      const order = await db.getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      order.paymentStatus = 'paid';
      order.paymentId = paymentId;
      await db.createOrder(order); // saves updated order

      io.to(`order:${orderId}`).emit('order-status-received', order);

      return res.json({ success: true, message: 'Payment successfully emulated and recorded !' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // --- FEATURE 2 & 3: NEW BUSINESS APIS ---

  // Recommendation rules CRUD
  app.get('/api/recommendations', async (req, res) => {
    try {
      const recs = await db.getRecommendations();
      return res.json(recs);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/recommendations', async (req, res) => {
    try {
      const rec = req.body;
      if (!rec.id) rec.id = `rec-${Math.random().toString(36).substr(2, 9)}`;
      await db.updateRecommendation(rec);
      return res.json({ success: true, recommendation: rec });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/recommendations/:id', async (req, res) => {
    try {
      await db.deleteRecommendation(req.params.id);
      return res.json({ success: true, message: 'Recommendation rule removed successfully' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Combo / Bundles CRUD
  app.get('/api/combos', async (req, res) => {
    try {
      const combos = await db.getCombos();
      return res.json(combos);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/combos', async (req, res) => {
    try {
      const combo = req.body;
      if (!combo.id) combo.id = `combo-${Math.random().toString(36).substr(2, 9)}`;
      await db.updateCombo(combo);
      return res.json({ success: true, combo });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/combos/:id', async (req, res) => {
    try {
      await db.deleteCombo(req.params.id);
      return res.json({ success: true, message: 'Combo meal deal removed successfully' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Upsell Recommendation Engine Click & Conversion Analytics
  app.get('/api/upsell/analytics', async (req, res) => {
    try {
      const stats = await db.getUpsellAnalytics();
      return res.json(stats);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/upsell/click', async (req, res) => {
    try {
      await db.incrementUpsellAnalytics('clicks');
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/upsell/conversion', async (req, res) => {
    try {
      await db.incrementUpsellAnalytics('conversions');
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Feedbacks rating logger & Auto-Compensation trigger
  app.post('/api/feedback', async (req, res) => {
    const { orderId, userId, userName, phone, rating, feedbackText } = req.body;
    if (!orderId || !rating) {
      return res.status(400).json({ error: 'Order reference and star rating are required parameters' });
    }

    try {
      const newFeedback = {
        id: `fb-${Math.floor(100000 + Math.random() * 900000)}`,
        orderId,
        userId,
        userName: userName || 'Valued Customer',
        phone: phone || '',
        rating: Number(rating),
        feedbackText: feedbackText || '',
        createdAt: new Date().toISOString()
      };
      await db.createFeedback(newFeedback);

      let isRecovered = false;
      let couponCreated = null;
      let complaint = null;

      // Smart Recovery: Trigger compensation automatically if rating is <= 2 Stars
      if (Number(rating) <= 2) {
        isRecovered = true;
        
        // Log complaint
        complaint = {
          id: `comp-${Math.floor(100000 + Math.random() * 900000)}`,
          orderId,
          userId,
          userName: userName || 'Valued Customer',
          phone: phone || '',
          rating: Number(rating),
          feedbackText: feedbackText || 'Very poor pizza experience rating',
          status: 'Pending Resolution',
          createdAt: new Date().toISOString(),
          adminNotes: ''
        };
        await db.createComplaint(complaint);

        // Auto compensation logic: Create flat ₹50 OFF dynamic coupon code
        const couponSuffix = Math.floor(1000 + Math.random() * 9000);
        const couponCode = `RECOVER${couponSuffix}`;
        couponCreated = {
          code: couponCode,
          description: `Customer Recovery Special Offer: Flat ₹50 OFF on next meal (Min Order: ₹150)`,
          discountPercent: 15, // Let's make it 15% discount for a highly standard validator, or flat rate mapped
          minOrder: 150,
          maxDiscount: 100,
          isRecovery: true,
          orderId,
          userId,
          createdAt: new Date().toISOString()
        };
        await db.createRecoveryCoupon(couponCreated);
      }

      return res.json({
        success: true,
        feedback: newFeedback,
        isRecovered,
        coupon: couponCreated,
        complaint
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/complaints', async (req, res) => {
    try {
      const list = await db.getComplaints();
      return res.json(list);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.patch('/api/complaints/:id', async (req, res) => {
    const { id } = req.params;
    const { status, adminNotes } = req.body;
    try {
      await db.updateComplaintStatusOrNotes(id, status, adminNotes);
      return res.json({ success: true, message: 'Complaint status logged successfully' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/recovery-coupons', async (req, res) => {
    try {
      const list = await db.getRecoveryCoupons();
      return res.json(list);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Support priority requests
  app.post('/api/support-requests', async (req, res) => {
    const { userId, orderId, userName, phone, type, details } = req.body;
    if (!phone || !type) {
      return res.status(400).json({ error: 'Customer contact phone and request type are required.' });
    }

    try {
      const ticket = {
        id: `supp-${Math.floor(100000 + Math.random() * 900000)}`,
        userId,
        orderId,
        userName: userName || 'Valued Customer',
        phone,
        type, // callback / priority_escalation
        details: details || '',
        status: 'Open Ticket',
        createdAt: new Date().toISOString()
      };
      await db.createSupportRequest(ticket);
      return res.json({ success: true, supportRequest: ticket });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/support-requests', async (req, res) => {
    try {
      const queue = await db.getSupportRequests();
      return res.json(queue);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Statistics chart indicators
  app.get('/api/feedback-stats', async (req, res) => {
    try {
      const feedbacks = await db.getFeedback();
      const complaints = await db.getComplaints();
      const coupons = await db.getRecoveryCoupons();
      const support = await db.getSupportRequests();

      const total = feedbacks.length;
      const avgRating = total > 0 ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1) : 0.0;

      const resolvedCount = complaints.filter(c => c.status === 'Resolved' || c.status === 'Refunded').length;
      const successRate = complaints.length > 0 ? Math.round((resolvedCount / complaints.length) * 100) : 100;

      return res.json({
        totalFeedbacks: total,
        averageRating: Number(avgRating),
        complaintsCount: complaints.length,
        couponsGenerated: coupons.length,
        resolvedCount,
        recoverySuccessRate: successRate,
        unhappyCount: feedbacks.filter(f => f.rating <= 2).length,
        neutralCount: feedbacks.filter(f => f.rating === 3).length,
        satisfiedCount: feedbacks.filter(f => f.rating >= 4).length,
        supportRequestsCount: support.length
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // API Documentation Index for reference and correctness of the fullstack App
  app.get('/api/docs', (req, res) => {
    res.json({
      name: 'FoodFlow Back-End API Server',
      version: '1.0.0',
      channels: {
        sockets: ['join-order', 'join-agent', 'update-agent-location', 'order-status-received', 'agent-location-received'],
        endpoints: [
          '/api/auth/otp-request', '/api/auth/verify', '/api/auth/update-profile',
          '/api/menu', '/api/coupons', '/api/coupons/validate',
          '/api/orders', '/api/orders/:id/status', '/api/delivery/agents', '/api/payments/verify'
        ]
      }
    });
  });

  // Serve built client SPA files from frontend/dist
  let distPath = path.resolve(__dirname, '..', 'frontend', 'dist');

  // Fallback to current working directory if needed
  if (!fs.existsSync(distPath) || !fs.existsSync(path.resolve(distPath, 'index.html'))) {
    distPath = path.resolve(process.cwd(), 'frontend', 'dist');
  }

  console.log(`Setting up static content serving. Active frontend/dist path: ${distPath}`);
  app.use(express.static(distPath));

  app.get('*', (req, res) => {
    const indexPath = path.resolve(distPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      console.error(`Static serving warning: index.html not found at ${indexPath}`);
      res.status(404).send(`Frontend is not compiled yet. Please run "npm run build" inside the frontend directory, or "npm run build" at the root level to generate static assets. Resolved search path: ${indexPath}`);
    }
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`FoodFlow application listening on http://0.0.0.0:${PORT}`);
    console.log(`Server Running on Port 5000`);
  });
}

startServer().catch((err) => {
  console.error('Critical Server Exception:', err);
});
