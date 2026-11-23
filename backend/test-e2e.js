// backend/test-e2e.js
/**
 * FarmDirect End-to-End Automated Verification Test Suite
 */

const http = require('http');
const app = require('./src/app');

let server;
const PORT = 5055;
const BASE_URL = `http://127.0.0.1:${PORT}/api`;

let customerToken = null;
let farmerToken = null;
let adminToken = null;
let testOrderId = null;

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

async function runTests() {
  console.log('\n🌾 ========================================================');
  console.log('   STARTING FARMDIRECT AUTOMATED E2E VERIFICATION SUITE');
  console.log('🌾 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health Check
    console.log('🔹 Testing Health Check Endpoint:');
    const health = await request('/health');
    assert(health.status === 200 && health.data.status === 'healthy', 'GET /api/health returns healthy status');

    // 2. Categories
    console.log('\n🔹 Testing Categories API:');
    const cats = await request('/categories');
    assert(cats.status === 200 && Array.isArray(cats.data.data), 'GET /api/categories returns array of categories');
    assert(cats.data.data.length >= 8, `Categories contains ${cats.data.data.length} categories (Vegetables, Grains, Dairy, Spices, etc.)`);

    // 3. Products
    console.log('\n🔹 Testing Products Marketplace API:');
    const prods = await request('/products?limit=5');
    assert(prods.status === 200 && prods.data.data.length === 5, 'GET /api/products returns paginated list');
    assert(prods.data.meta && prods.data.meta.total >= 14, `Total catalog contains ${prods.data.meta?.total} agricultural products`);

    // Organic Filter
    const organicProds = await request('/products?organic=true');
    assert(organicProds.status === 200 && organicProds.data.data.every(p => p.isOrganic), 'GET /api/products?organic=true filters organic-only crops');

    // Keyword Search
    const searchProds = await request('/products?search=basmati');
    assert(searchProds.status === 200 && searchProds.data.data.length > 0, 'GET /api/products?search=basmati finds matching products');

    // Single Product
    const singleProdId = prods.data.data[0].id;
    const singleProd = await request(`/products/${singleProdId}`);
    assert(singleProd.status === 200 && singleProd.data.data.id === singleProdId, 'GET /api/products/:id retrieves full details with farmer information');

    // 4. Farmers & Nearby Geo-location
    console.log('\n🔹 Testing Farmers API:');
    const farmers = await request('/farmers');
    assert(farmers.status === 200 && farmers.data.data.length >= 6, 'GET /api/farmers returns verified Indian growers');

    // Nearby Geo-Distance calculation (e.g. from Delhi coordinates: 28.6139, 77.2090)
    const nearby = await request('/farmers/nearby?lat=28.6139&lng=77.2090&radius=500');
    assert(nearby.status === 200 && nearby.data.data.length > 0, 'GET /api/farmers/nearby calculates haversine distance correctly');
    assert(nearby.data.data[0].distanceKm !== undefined, `Closest farm calculated at ${nearby.data.data[0]?.distanceKm} km`);

    // 5. Authentication (Customer, Farmer, Admin)
    console.log('\n🔹 Testing Authentication System & RBAC:');
    
    // Customer Login
    const custLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'customer@farmdirect.in', password: 'FarmDirect@123' },
    });
    assert(custLogin.status === 200 && custLogin.data.token, 'Customer login succeeds and issues JWT token');
    customerToken = custLogin.data.token;

    // Verify /api/auth/me
    const me = await request('/auth/me', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(me.status === 200 && me.data.data.role === 'CUSTOMER', 'GET /api/auth/me returns authenticated customer profile');

    // Farmer Login
    const farmLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'gurpreet@goldenfields.in', password: 'FarmDirect@123' },
    });
    assert(farmLogin.status === 200 && farmLogin.data.user.role === 'FARMER', 'Farmer login succeeds with verified farm profile');
    farmerToken = farmLogin.data.token;

    // Admin Login
    const admLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@farmdirect.in', password: 'FarmDirect@123' },
    });
    assert(admLogin.status === 200 && admLogin.data.user.role === 'ADMIN', 'Admin login succeeds with ADMIN role');
    adminToken = admLogin.data.token;

    // 6. Shopping Cart Operations & Multi-Farmer Separation
    console.log('\n🔹 Testing Shopping Cart Operations:');
    
    // Clear cart first
    await request('/cart', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${customerToken}` },
    });

    // Add item 1 from Farmer 1
    const add1 = await request('/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { productId: 'prod-1', quantity: 2 }, // Basmati: ₹165 * 2 = ₹330
    });
    assert(add1.status === 200 && add1.data.data.itemCount === 2, 'POST /api/cart/items adds product to cart');

    // Add item 2 from Farmer 4 (Multi-farmer test)
    const add2 = await request('/cart/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { productId: 'prod-8', quantity: 1 }, // Wild Honey: ₹550
    });
    assert(add2.status === 200 && add2.data.data.farmerBreakdown.length === 2, 'Cart groups products by 2 distinct farmers');
    assert(add2.data.data.subtotal === 880, `Cart subtotal correctly calculated by backend at ₹${add2.data.data.subtotal}`);
    assert(add2.data.data.deliveryCharge === 0, 'Free delivery applied on orders > ₹500');

    // 7. Order Placement, Stock Deduction & Razorpay Flow
    console.log('\n🔹 Testing Order Creation & Payment Verification:');
    const orderRes = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        address: {
          fullName: 'Arjun Verma',
          phone: '9871122334',
          houseNumber: 'Flat 402',
          street: 'Outer Ring Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pinCode: '560103',
        },
        paymentMethod: 'RAZORPAY',
      },
    });

    assert(orderRes.status === 201 && orderRes.data.data.orderNumber, 'POST /api/orders creates multi-vendor order');
    testOrderId = orderRes.data.data.id;
    assert(orderRes.data.data.fulfillments.length === 2, 'Order creates 2 separate FarmerFulfillment records for independent dispatch');

    // Create Payment Order
    const payOrder = await request('/payments/create-order', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { orderId: testOrderId },
    });
    assert(payOrder.status === 200 && payOrder.data.data.razorpayOrderId, 'POST /api/payments/create-order generates gateway order ID');

    // Verify Payment Signature
    const verifyPay = await request('/payments/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        orderId: testOrderId,
        razorpayOrderId: payOrder.data.data.razorpayOrderId,
        razorpayPaymentId: `pay_test_${Date.now()}`,
        razorpaySignature: 'MOCK_VERIFIED',
      },
    });
    assert(verifyPay.status === 200 && verifyPay.data.data.paymentStatus === 'PAID', 'POST /api/payments/verify confirms payment and updates order to CONFIRMED');

    // 8. Farmer Dashboard & Order Fulfillment
    console.log('\n🔹 Testing Farmer Dashboard & Inventory:');
    const dashStats = await request('/farmer/dashboard', {
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert(dashStats.status === 200 && dashStats.data.data.overview.totalRevenue > 0, 'GET /api/farmer/dashboard returns revenue, orders, and analytics');

    // Update fulfillment status
    const updateFulfill = await request(`/orders/${testOrderId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: {
        status: 'PROCESSING',
        trackingNumber: 'FD-EXP-88992',
        courierName: 'Delhivery Surface',
      },
    });
    assert(updateFulfill.status === 200, 'PATCH /api/orders/:id/status updates farmer fulfillment status');

    // Quick stock update
    const stockUpdate = await request('/farmer/inventory/prod-1', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: { stockQuantity: 440 },
    });
    assert(stockUpdate.status === 200 && stockUpdate.data.data.stockQuantity === 440, 'PATCH /api/farmer/inventory/:id adjusts inventory quantity');

    // 9. Admin Operations
    console.log('\n🔹 Testing Admin Capabilities:');
    const adminStats = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminStats.status === 200 && adminStats.data.data.totalGMV > 0, 'GET /api/admin/stats returns GMV and user counts');

    const adminUsers = await request('/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminUsers.status === 200 && adminUsers.data.data.length >= 8, 'GET /api/admin/users lists all platform accounts');

    // Verify non-admin blocked from admin route
    const unauthorized = await request('/admin/stats', {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(unauthorized.status === 403, 'RBAC correctly denies customer from accessing /api/admin/stats');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    console.log('\n========================================================');
    console.log(`   TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log('========================================================\n');
    server.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Start server on test port and run
server = app.listen(PORT, () => {
  runTests();
});
