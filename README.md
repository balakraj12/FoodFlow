# FoodFlow 🍕 - Production-Grade MERN Pizza Delivery Platform

Welcome to **FoodFlow**, a high-performance full-stack MERN application mimicking an enterprise-grade pizza delivery platform (Domino's/Uber-style). The architecture utilizes a separate frontend-backend structure with custom microservice hooks and real-time state synchronization.

---

## 📂 Production Folder Architecture

```bash
FoodFlow/
│
├── frontend/                     # React Single Page Application (SPA)
│   ├── src/
│   │   ├── components/           # UI & Core Modules (Header, Hero, Cart, Live Map Tracker, etc.)
│   │   ├── pages/                # Screen Layout Views (Menu, Tracking, Admin, Rider)
│   │   ├── redux/                # Redux Toolkit Global State Slice Managers
│   │   ├── services/             # API Connectors, SDK Clients, and Hook services
│   │   ├── hooks/                # Custom React Hooks
│   │   ├── assets/               # Local Graphic Vectors and Static Media
│   │   ├── App.jsx               # App container router
│   │   ├── main.jsx              # DOM Mount Gateway
│   │   └── index.css             # Tailwind base styles and keyframe animations
│   ├── public/                   # Public static build root asset directory
│   ├── package.json              # Frontend-specific package dependencies
│   ├── vite.config.js            # Frontend-specific Vite configuration
│   └── .env                      # Frontend environment variable configuration
│
├── backend/                      # Node.js + Express + Socket.io Server API
│   ├── config/                   # Configuration adapters (Mongoose & system settings)
│   ├── controllers/              # Request / Response Route Controllers
│   ├── models/                   # Mongoose DB schema definitions
│   ├── routes/                   # Route grouping endpoints
│   ├── middleware/               # Express security, auth timers, & CORS middlewares
│   ├── services/                 # Third-party microservice integration logic
│   ├── utils/                    # Shared helper formulas and modules
│   ├── sockets/                  # Real-Time GPS tracking websocket connections
│   ├── server.js                 # Unified server entrance & dev proxy
│   ├── db.js                     # Unified DB controller fallback
│   ├── package.json              # Backend-specific package dependencies
│   └── .env                      # Backend environment variable configuration
│
├── README.md                     # Current detailed documentation
├── .gitignore                    # File exclusions for git retention
└── package.json                  # Root runner package configuration
```

---

## 🚀 Getting Started

To run the application locally or in web deployment clusters, follow these guidelines:

### 1. Developer Setup
Initialize the required packages in both service layers:
```bash
# Install root orchestration modules
npm install

# Installs for individual tiers
cd frontend && npm install
cd ../backend && npm install
```

### 2. Run Modes

#### Tiered Isolated Development
Run each service layer independently on distinctive local processes:
```bash
# Frontend Development Server (Runs on Vite default port)
cd frontend
npm run dev

# Backend Node API Engine (Runs on Port 5000)
cd backend
npm run dev
```

#### Unified Orchestrated Development
Run both services fully unified on Port 3000 where Node routes static assets dynamically:
```bash
# From workspace root:
npm run dev      # Launches Express API, proxying hot-reloading Vite dev middleware on Port 3000
npm run build    # Compiles React static artifacts into specialized/cached production folders
```

---

## 📡 REST API Documentation

FoodFlow hosts responsive endpoints proxying core collection stores under `/api/*`:

| Endpoint | Method | Payload Data | Response Description |
| :--- | :---: | :--- | :--- |
| `/api/auth/otp-request` | `POST` | `{ phone: "+91999..." }` | Initiates standard OTP request sequence |
| `/api/auth/verify` | `POST` | `{ phone, otp, name, email, role }` | Registers / logs in active user |
| `/api/menu` | `GET` | *None* | Lists all active items in the pizza and snack catalog |
| `/api/menu` | `POST` | `Product` object | Creates/Updates an active food catalog product (Admin) |
| `/api/menu/:id` | `DELETE`| *None* | Permanently removes specified item from the collection (Admin) |
| `/api/coupons` | `GET` | *None* | Fetches active promo and discount vouchers |
| `/api/coupons/validate` | `POST` | `{ code, cartAmount }` | Evaluates voucher logic; calculates updated total and savings |
| `/api/orders` | `POST` | `Order` payload | Creates and maps a new delivery order, starting prep sequence |
| `/api/orders` | `GET` | `?role=admin` or `?userId=id` | Grabs targeted order sheets based on user authorization profiles |
| `/api/orders/:id/status`| `PATCH`| `{ status, deliveryAgentId }` | Shifts order stage and broadcasts dynamic tracking coordinates |

---

## ⚡ Socket.io Real-Time Interface

The server-side Socket.io implementation handles live data transfers:
- **`join-order`**: Subscribes a dynamic client to a single order tracing channel room.
- **`join-agent`**: Bridges couriers to assign, route, and telemetry events.
- **`update-agent-location`**: Receives dynamic GPS signals from moving couriers, broadcasting real-time lat/lng telemetry maps.
- **`order-status-received`**: Emitted during status transitions.

---

## 🍃 MongoDB Configuration
Declare database connections in your `backend/.env` file:
```env
MONGO_URI="mongodb+srv://<user>:<password>@cluster.mongodb.net/?appName=FoodFlow"
DB_NAME="foodflow"
PORT=5000
```
*Note: In the absence of a live MongoDB Atlas URI reference, the system automatically switches database state triggers to local persistent fallbacks (`db.json`) ensuring 100% operation anytime.*

---

## ☁️ Complete Render Deployment Guide

This guide describes how to deploy the full-stack **FoodFlow MERN Platform** on Render. The configuration is specifically tailored for this codebase's architecture, routes, package management, and real-time streaming engines.

### 🗺️ 1. Deployment Architecture Recommendation

For **FoodFlow**, we strongly recommend **Option B: Single Full-Stack Unified Deployment**.

#### Why Option B is the Ideal Choice:
1. **No CORS or Path Mapping Issues**: Standard frontend calls utilize relative targets (`/api/auth/...`) and WebSockets connect natively to `io()`. By serving frontend assets directly alongside the Express server, both browser and websocket connections run over the exact same domain, avoiding CORS blockers.
2. **Dynamic Server Loading**: The backend server is pre-configured to search for compiled frontend files at `frontend/dist`. If static files are present, Express loads and delivers them, making deployment extremely smooth and easy.
3. **Optimized Socket.io Connectivity**: Socket.io coordinates are hosted on the same HTTP port. Rendering everything under one service prevents websocket connection handshaking failures on different domains.
4. **Render Free Tier Optimized**: Keeping both services consolidated saves Free Tier hours (a single Render Web Service is much less likely to exceed free monthly usage limits than having two distinct services spinning simultaneously).

---

### 🛡️ 2. Pre-Deployment Configuration Validation

- **No Hardcoded URLs**: All fetch handlers in `/frontend/src/` use relative root calls (e.g., `/api/auth/login`). No hardcoded `localhost:5000` URLs exist.
- **Dependency Isolation Resolved**: `@vis.gl/react-google-maps` is correctly registered in `/frontend/package.json` to ensure frontend-level dependencies build properly.
- **Root Orchestration Script**: The root `package.json` includes the specific build commands:
  - `"build": "vite build --config frontend/vite.config.js"`
  - `"start": "node backend/server.js"`
  - This compiles React files into `frontend/dist`, which Express then serves seamlessly.

---

### 🚀 3. Option B (Recommended): Unified Full-Stack Service Setup

Deploy the entire platform as a single, fully-orchestrated Web Service.

#### Render Deployment Configuration:
* **Service Type**: `Web Service`
* **Language**: `Node`
* **Root Directory**: *Keep empty* (refers to the root of the repository `/`)
* **Build Command**: `npm install && npm run build`
* **Start Command**: `npm run start`

#### Step-by-Step Guide:
1. Log in to [Render](https://render.com) and click **New +** > **Web Service**.
2. Connect your Git Repository (GitHub, GitLab).
3. Set the following basic parameters:
   - **Name**: `foodflow-platform`
   - **Environment**: `Node`
   - **Region**: Select the region nearest to you or your target audience.
   - **Branch**: `main` (or your primary development branch).
   - **Root Directory**: *(Keep completely empty so it defaults to root)*
4. Set the build parameters:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
5. Click **Advanced** and scroll down to add **Environment Variables** (see section 5).
6. Click **Deploy Web Service**.

---

### 📦 4. Option A (Alternative): Separate Frontend & Backend Services

If your system architecture requires separate hosts, deploy them as distinct services.

#### A. BACKEND: Render Web Service Configuration
* **Service Type**: `Web Service`
* **Language**: `Node`
* **Root Directory**: `backend` (or leave empty and run with specific directory commands)
* **Build Build Command**: `npm install`
* **Start Command**: `node server.js`

*Note: For split deployments, you must configure CORS on the backend to accept your frontend's deployment domain.*

#### B. FRONTEND: Render Static Site Configuration
* **Service Type**: `Static Site`
* **Root Directory**: `frontend`
* **Build Command**: `npm install && npm run build`
* **Publish Directory**: `dist` *(relative to root directory `frontend`, resulting in `frontend/dist`)*

---

### 🔑 5. Environment Variables Configuration

Add these secret keys to the Render Dashboard under **Environment Variables**:

| Variable | Description | Example / Value | Status |
| :--- | :--- | :--- | :--- |
| `MONGO_URI` | MongoDB Atlas Cluster URI | `mongodb+srv://<user>:<pwd>@cluster...` | **Required** |
| `DB_NAME` | Database Target | `FoodFolw3` | **Required** |
| `JWT_SECRET` | Super key for JWT signing | `foodflow_super_jwt_secret_key_2026` | **Required** |
| `GOOGLE_MAPS_PLATFORM_KEY` | Key for Map coordinates rendering | `AIzaSyA4...` | *Optional* |
| `NODE_ENV` | Environment State | `production` | *Optional* |

---

### 🧪 6. Live App Verification Instructions

Once Render indicates that the deployment was successful, check the following functionality to confirm proper operation:

1. **Initial Landing Page**: Navigating to your main URL (e.g. `https://foodflow-platform.onrender.com`) should load the dashboard with standard product listings.
2. **Database Connectivity**: Under MongoDB Atlas, you will see collections created and populating (products, franchises, deliveryAgents).
3. **Authentication Workflow**: Create a test account (User or Admin) or run OTP verification (using simulated code `123456`). Ensure JWT tokens save in the browser.
4. **Order Cart Logic**: Add items, apply promo coupons, select delivery address, and proceed.
5. **Real-Time Map & GPS Sockets**: Join as a customer and view the Live Map Tracker, then simulated courier movements should display via Socket.io channels instantly.
6. **Admin Panel Controls**: Access `/admin` dashboard to edit products, manage franchise stores, and resolve real-time feed support requests.

---

### 📊 7. Final Render Configurations Reference Table

| Setup | Parameter | Key Configurations |
| :--- | :--- | :--- |
| **Backend (Web Service)** | Root Directory | *Blank* |
| | Build Command | `npm install && npm run build` |
| | Start Command | `npm run start` |
| **Frontend (Static Site)** | Root Directory | `frontend` |
| *(Only if using Option A)* | Build Command | `npm install && npm run build` |
| | Publish Directory | `dist` |
| **Env Database** | Required Keys | `MONGO_URI`, `DB_NAME`, `JWT_SECRET` |
| **Env Services** | Optional Keys | `GOOGLE_MAPS_PLATFORM_KEY` |
| **Socket Connection** | Websocket Path | Native `io()` (relative) |

#   F o o d F l o w  
 