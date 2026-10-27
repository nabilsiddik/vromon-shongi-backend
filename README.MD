# 🌍 Vromon Shongi (ভ্রমণ সঙ্গী) — Backend API & Real-Time Engine

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-black?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Real--Time-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io/)
[![Stripe](https://img.shields.io/badge/Stripe-API-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://stripe.com/)
[![Render](https://img.shields.io/badge/Deployed_on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://travel-buddy-backend-73ls.onrender.com/)

> **Vromon Shongi Backend** is a scalable, modular REST and WebSocket server built with Node.js, Express, TypeScript, Prisma ORM, and PostgreSQL. It powers user authentication, travel plan lifecycle management, buddy requests, Stripe payment webhooks, peer reviews, and real-time Socket.IO chat rooms.

---

## 🔗 Live Services

* **⚡ Live Base API:** [travel-buddy-backend-73ls.onrender.com/api/v1](https://travel-buddy-backend-73ls.onrender.com/api/v1)
* **🩺 Health Check (Uptime Monitor):** [travel-buddy-backend-73ls.onrender.com/health](https://travel-buddy-backend-73ls.onrender.com/health)
* **🌐 Companion Frontend Application:** [vromon-shongi.vercel.app](https://vromon-shongi.vercel.app/)

---

## 🏗️ Core Architecture & Modules

```
src/
├── app/
│   ├── config/             # Environment, Prisma client, and Cloudinary setup
│   ├── errorHelpers/       # AppError and global exception handlers
│   ├── interfaces/         # Global TypeScript interfaces & JWT payloads
│   ├── middlewares/        # Authentication (checkAuth), file uploaders, validators
│   ├── modules/
│   │   ├── auth/           # Login, registration, password hashing & JWT generation
│   │   ├── user/           # User profiles, role elevation, status management
│   │   ├── travel-plan/    # Trip CRUD, date validation, multi-parameter search/filters
│   │   ├── travelPlan-join/# Join request lifecycle (apply, approve, reject)
│   │   ├── trip-participant/# Participant rosters & access status validation
│   │   ├── chat-room/      # Chat room creation & participant permission gates
│   │   ├── chat-message/   # Message persistence & chat history
│   │   ├── review/         # Traveler ratings & reviews
│   │   ├── subscription/   # Stripe checkout sessions & webhook fulfillment
│   │   └── admin/          # Platform metrics, user moderation & audit logs
│   ├── routes/             # Centralized Express route aggregators
│   ├── socket/             # Socket.IO connection manager & real-time chat handlers
│   └── utils/              # Pagination helpers, file uploaders, query parsers
├── app.ts                  # Express application setup, dynamic CORS & health endpoints
└── server.ts               # HTTP & WebSocket server bootstrap
```

---

## ✨ Features & Capabilities

* **Authentication & Role-Based Access Control (RBAC):**
  * Secure password hashing with `bcryptjs`.
  * Access tokens signed with JWT, verified via HTTP-only cookies and headers.
  * Granular roles: `SUPER_ADMIN`, `ADMIN`, and `USER`.
* **Travel Plan Management & Date Validation:**
  * Strict chronological date verification (`endDate > startDate`).
  * Flexible searching across destinations, travel types (`SOLO`, `FAMILY`, `FRIENDS`), and budget brackets.
* **Join Request & Approval Flow:**
  * Prevents duplicate join requests or joining one's own plan.
  * Transitions: `PENDING` ➔ `ACCEPTED` / `REJECTED` / `CANCELLED`.
* **Real-Time Group Chat (Socket.IO):**
  * Automatic room authorization: only hosts and accepted participants can join.
  * Message persistence in PostgreSQL with sender relation populating verified badges.
  * Live typing indicators (`user-typing` and `user-stop-typing`).
* **Stripe Payment & Webhook Integration:**
  * Handles monthly & yearly subscription checkout flows.
  * Stripe raw-body webhook listener automatically updates subscriber status and grants `verifiedBadge`.
* **CORS & Multi-Platform Support:**
  * Dynamic origin checker supporting localhost development and any `*.vercel.app` frontend domain.
* **24/7 Availability & Health Monitoring:**
  * `/health` and `/api/v1/health` endpoints returning uptime and service health for automated cron jobs / ping monitors.

---

## 📡 API Endpoint Overview

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/v1/auth/signup` | Register a new traveler account | Public |
| `POST` | `/api/v1/auth/login` | Authenticate & retrieve JWT | Public |
| `GET` | `/api/v1/travel-plan` | Browse & search travel plans | Public |
| `POST` | `/api/v1/travel-plan` | Create a new travel plan | Authenticated |
| `POST` | `/api/v1/join-request` | Request to join a travel plan | Authenticated |
| `PATCH`| `/api/v1/trip-participant/:id` | Host accept/reject join request | Trip Host |
| `GET` | `/api/v1/chat-room/:tripId` | Validate chat room access | Host / Participant |
| `GET` | `/api/v1/chat-message/:tripId`| Get message history for trip | Host / Participant |
| `POST` | `/api/v1/subscription/create-checkout-session` | Initialize Stripe checkout | Authenticated |
| `POST` | `/webhook` | Stripe webhook processing | Stripe Only |
| `GET` | `/health` | Server uptime & status check | Public |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v20.x or higher
* **PostgreSQL**: Local database instance or hosted URL (e.g., Neon, Supabase, Railway)

### 1. Installation
```bash
git clone https://github.com/nabilsiddik/vromon-shongi-backend.git
cd vromon-shongi-backend
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# PostgreSQL Connection String
DATABASE_URL=postgresql://user:password@localhost:5432/vromon_shongi?schema=public

# Authentication Secrets
JWT_ACCESS_SECRET=your_jwt_access_secret_key
JWT_EXPIRES_IN=7d

# Cloudinary (Profile & Trip photo storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Stripe Billing
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
```

### 3. Database Migration & Prisma Client
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Run the Server
```bash
# Development mode with hot-reload
npm run dev

# Production build & start
npm run build
npm start
```

---

## 👨‍💻 Author

**Nabil Siddik**
* **GitHub:** [@nabilsiddik](https://github.com/nabilsiddik)
* **Frontend App:** [vromon-shongi.vercel.app](https://vromon-shongi.vercel.app/)
