// shiprocket.js — Shiprocket External API client
// Docs: https://apidocs.shiprocket.in/

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

// Simple in-memory token cache (Shiprocket tokens are valid ~10 days)
let cachedToken = null;
let cachedTokenExpiry = 0;

function clearTokenCache() {
  cachedToken = null;
  cachedTokenExpiry = 0;
}

async function srRequest(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || data?.error || `Shiprocket API error (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

async function getAuthToken(email, password) {
  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiry) return cachedToken;

  const data = await srRequest('/auth/login', {
    method: 'POST',
    body: { email, password }
  });

  if (!data.token) throw new Error('Shiprocket login failed: no token returned. Check email/password.');

  cachedToken = data.token;
  cachedTokenExpiry = now + 9 * 24 * 60 * 60 * 1000; // refresh a day early (token valid ~10 days)
  return cachedToken;
}

async function getPickupLocations(token) {
  return srRequest('/settings/company/pickup', { token });
}

async function createOrder(token, orderData, config = {}) {
  const nameParts = (orderData.customerName || 'Customer').trim().split(' ');
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || '.';

  const payload = {
    order_id: String(orderData.orderId),
    order_date: orderData.orderDate,
    pickup_location: config.pickup_location || 'Primary',
    billing_customer_name: firstName,
    billing_last_name: lastName,
    billing_address: orderData.customerAddress,
    billing_city: orderData.city,
    billing_pincode: orderData.pincode,
    billing_state: orderData.state,
    billing_country: 'India',
    billing_email: orderData.customerEmail || 'noreply@jaiswalfashion.com',
    billing_phone: orderData.customerPhone,
    shipping_is_billing: true,
    order_items: (orderData.items || []).map(item => ({
      name: item.product_name,
      sku: String(item.product_id) + (item.size ? '-' + item.size : ''),
      units: item.quantity,
      selling_price: item.price
    })),
    payment_method: orderData.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
    sub_total: orderData.subTotal,
    length: config.pkg_length || 30,
    breadth: config.pkg_breadth || 25,
    height: config.pkg_height || 5,
    weight: config.pkg_weight || 0.5
  };

  return srRequest('/orders/create/adhoc', { method: 'POST', token, body: payload });
}

async function assignAWB(token, shipmentId) {
  return srRequest('/courier/assign/awb', {
    method: 'POST',
    token,
    body: { shipment_id: shipmentId }
  });
}

async function cancelShipment(token, orderId) {
  return srRequest('/orders/cancel', {
    method: 'POST',
    token,
    body: { ids: [orderId] }
  });
}

async function trackShipment(token, awbCode) {
  return srRequest(`/courier/track/awb/${awbCode}`, { token });
}

module.exports = {
  getAuthToken,
  getPickupLocations,
  createOrder,
  assignAWB,
  cancelShipment,
  trackShipment,
  clearTokenCache
};
