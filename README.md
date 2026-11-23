# FarmDirect – From Farmers to Your Doorstep 🌾

**FarmDirect** is a full-stack, multi-vendor agricultural marketplace engineered for India, connecting rural farmers directly with retail consumers. By eliminating middlemen and commissions, FarmDirect delivers fresher, higher-quality produce to families while securing fair, dignified earnings for farmers.

---

## 🌟 Key Platform Features

### 🛒 For Customers
- **Agricultural Marketplace**: Filter produce by category (Vegetables, Fruits, Grains, Pulses, Dairy, Organic, Seeds, Spices), price range, harvest date, and certifications.
- **Interactive Farmers Map**: MapLibre GL JS + OpenFreeMap vector tile integration calculating real-time Haversine distance to discover verified local growers across India.
- **Direct Farm Profiles**: Read farmer generational stories, review soil and organic certifications (NPOP / PGS-India / Jaivik Bharat), and view harvests.
- **Dynamic Multi-Farmer Cart**: Automatic server-side price recalculation with separate fulfillment groupings for each farmer.
- **Secure Indian Payments**: Razorpay test-mode integration supporting UPI (GPay, PhonePe, Paytm), Netbanking, Cards, and Cash on Delivery (COD).
- **Live Order Tracking**: Visual milestone timeline (Placed → Confirmed → Harvesting/Packing → Shipped → Delivered).
- **Customer Reviews & Wishlists**: Verified purchase review engine with star ratings.

### 🌾 For Farmers
- **Dedicated Producer Portal**: Comprehensive dashboard featuring Chart.js monthly revenue line trends and order fulfillment status doughnut charts.
- **Crop Management**: Create, edit, and publish crops with photo upload, pricing units (`kg`, `liter`, `packet`, `dozen`, `quintal`), and harvest dates.
- **Incoming Orders & Fulfillment**: Manage orders per farm, transition statuses (`PLACED` → `CONFIRMED` → `PROCESSING` → `READY_FOR_PICKUP` → `SHIPPED` → `DELIVERED`), and assign courier AWB tracking numbers.
- **Inventory Control**: Real-time stock level monitoring with instant inline stock adjustments and low-stock alerts.
- **Earnings & Payouts**: Transparent ledger tracking gross sales, pending clearance, and automated bank payouts.

### 🛡️ For Administrators
- **Admin Control Center**: Monitor Gross Merchandise Value (GMV), total platform orders, and user directories.
- **Farmer Verification Queue**: Review submitted farm documents, approve verified farmer badges, or reject applications.
- **Role-Based Access Control (RBAC)**: Strict authorization guards (`CUSTOMER`, `FARMER`, `ADMIN`) on all API endpoints.

---

## 🛠 Technology Stack

- **Frontend**: Semantic HTML5, Modern CSS3 (CSS Grid, Flexbox, Custom Design System), Vanilla JavaScript (ES6+), Fetch API.
- **Maps**: MapLibre GL JS with OpenFreeMap vector tiles (`https://tiles.openfreemap.org/styles/liberty`), zero API keys or subscriptions required.
- **Analytics**: Chart.js 4.x.
- **Backend**: Node.js, Express.js REST API Architecture.
- **Database & ORM**: PostgreSQL with Prisma ORM (20 normalized models with Decimal monetary precision).
- **Authentication**: JWT with secure HTTP-only cookies and Authorization headers, bcryptjs password hashing.
- **File Uploads**: Multer image storage with size limits and MIME filtering.
- **Payment Processing**: Razorpay SDK with HMAC SHA-256 signature verification.
- **Security**: Helmet headers, CORS policies, rate-limiting, input sanitization.

---

## 📂 Project Structure

```
FarmDirect/
├── frontend/
│   ├── index.html                 # Complete 13-section homepage
│   ├── products.html              # Filterable products marketplace
│   ├── product-details.html       # Gallery, farmer bio, add to cart, reviews
│   ├── cart.html                  # Multi-farmer cart with server totals
│   ├── checkout.html              # Address form & Razorpay payment
│   ├── payment-success.html       # Confirmation & delivery estimate
│   ├── farmers-map.html           # OpenFreeMap interactive farm map
│   ├── farmer-profile.html        # Public farm story & harvests
│   ├── login.html                 # Unified login with demo quick-fill
│   ├── register.html              # Customer & Farmer registration tabs
│   ├── customer-profile.html      # Profile & saved address management
│   ├── customer-orders.html       # Customer order history
│   ├── order-tracking.html        # Step-by-step shipment timeline
│   ├── wishlist.html              # Saved crops
│   ├── admin.html                 # Marketplace admin portal
│   │
│   ├── farmer/                    # Dedicated Farmer Portal
│   │   ├── dashboard.html         # Overview stats & Chart.js charts
│   │   ├── products.html          # Farmer's product catalog
│   │   ├── add-product.html       # Add crop with photo upload
│   │   ├── orders.html            # Incoming customer order fulfillment
│   │   ├── inventory.html         # Quick stock adjustment & alerts
│   │   ├── earnings.html          # Revenue & payout history
│   │   ├── reviews.html           # Customer feedback
│   │   ├── profile.html           # Farm coordinates & details
│   │   └── settings.html          # Notification preferences
│   │
│   ├── css/
│   │   ├── style.css              # Color tokens & base styles
│   │   ├── components.css         # Buttons, cards, badges, toasts
│   │   ├── responsive.css         # Mobile/tablet media queries
│   │   └── dashboard.css          # Farmer portal layouts & tables
│   │
│   └── js/
│       ├── api.js                 # Centralized fetch REST client
│       ├── notifications.js       # Toast alert system
│       ├── auth.js                # Session & JWT state handler
│       ├── app.js                 # Global navigation & badges
│       ├── cart.js                # Shopping cart operations
│       ├── products.js            # Marketplace filters & sorting
│       ├── checkout.js            # Razorpay integration & order creation
│       ├── farmers-map.js         # MapLibre + OpenFreeMap vector pins & geo-distance
│       └── dashboard.js           # Analytics & order fulfillment
│
├── backend/
│   ├── src/
│   │   ├── server.js              # Server entry point
│   │   ├── app.js                 # Express app configuration & routes
│   │   ├── config/
│   │   │   ├── db.js              # Prisma Client & resilient store
│   │   │   ├── env.js             # Environment variables
│   │   │   └── seedData.js        # Rich Indian agricultural seed data
│   │   ├── controllers/           # REST API business logic
│   │   ├── routes/                # Express router endpoints
│   │   ├── middleware/            # Auth, RBAC, Multer, Rate Limiting
│   │   └── utils/                 # JWT & standardized API response
│   ├── prisma/
│   │   ├── schema.prisma          # 20 normalized PostgreSQL models
│   │   └── seed.js                # Prisma database seed script
│   ├── test-e2e.js                # Automated 29-test verification suite
│   ├── package.json
│   ├── .env.example
│   └── .env
└── README.md
```

---

## ⚡ Quick Start Guide

### 1. Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL (Optional for production; development mode includes full persistent operational resilience)

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Initialize Prisma Client:
   ```bash
   npx prisma generate
   ```
4. Configure `.env` file (see `.env.example`).
   If PostgreSQL is running locally on port 5432:
   ```bash
   npx prisma db push
   node prisma/seed.js
   ```

### 3. Start the Server
```bash
npm start
```
The server will start on `http://localhost:5000`. Express automatically serves both the **REST API** (`/api/...`) and the **complete frontend application**:
- **Storefront**: [http://localhost:5000/index.html](http://localhost:5000/index.html)
- **Marketplace**: [http://localhost:5000/products.html](http://localhost:5000/products.html)
- **Farmers Map**: [http://localhost:5000/farmers-map.html](http://localhost:5000/farmers-map.html)
- **Farmer Portal**: [http://localhost:5000/farmer/dashboard.html](http://localhost:5000/farmer/dashboard.html)
- **Admin Portal**: [http://localhost:5000/admin.html](http://localhost:5000/admin.html)

---

## 🔑 Demo Login Accounts

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@farmdirect.in` | `FarmDirect@123` | Retail customer with saved address in Bengaluru |
| **Farmer** | `gurpreet@goldenfields.in` | `FarmDirect@123` | Gurpreet Singh, Golden Fields Farm (Ludhiana, Punjab) |
| **Farmer** | `ramesh@sahyadriagro.in` | `FarmDirect@123` | Ramesh Patil, Sahyadri Agro Valley (Nashik, Maharashtra) |
| **Admin** | `admin@farmdirect.in` | `FarmDirect@123` | Platform Operations & Farmer Verification Manager |

*(The login page at `/login.html` features single-click Quick-Fill buttons for each demo account).*

---

## 🧪 Automated Testing

FarmDirect includes an end-to-end test suite testing all 29 core business criteria:
```bash
cd backend
node test-e2e.js
```
**Test Coverage Includes:**
- Health check & server status
- Category retrieval & product count verification
- Product filtering (categories, price range, organic certification, search keywords)
- Haversine geo-distance calculation for nearby farmers
- Authentication (Customer, Farmer, Admin) & RBAC permission gates
- Cart calculations with multi-farmer separation and free shipping threshold
- Order creation & atomic stock deductions
- Razorpay test mode payment verification & cryptographic signatures
- Farmer dashboard statistics & fulfillment updates
- Admin overview metrics & verification queue
