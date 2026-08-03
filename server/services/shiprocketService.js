import axios from "axios";
import crypto from "crypto-js";

const generateHMAC = (payload) =>
  crypto
    .HmacSHA256(JSON.stringify(payload), process.env.SHIPROCKET_API_SECRET)
    .toString(crypto.enc.Base64);

/**
 * Fetch the lightweight order list from Shiprocket for a date range,
 * paginating through every page until exhausted.
 */
async function fetchShiprocketOrderList(since, until) {
  const startDate = new Date(`${since}T00:00:00.000Z`);
  const endDate = new Date(`${until}T23:59:59.999Z`);

  const orders = [];
  let page = 0;
  const limit = 250;

  while (true) {
    const payload = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      timestamp: new Date().toISOString(),
      status: "SUCCESS",
      limit,
      page,
    };

    const hmac = generateHMAC(payload);

    const response = await axios.post(
      "https://checkout-api.shiprocket.com/api/v1/custom-platform-order/details/list",
      payload,
      {
        headers: {
          "X-Api-Key": process.env.SHIPROCKET_API_KEY,
          "X-Api-HMAC-SHA256": hmac,
          "Content-Type": "application/json",
        },
      }
    );

    const pageData = response.data?.result?.data || [];
    orders.push(...pageData);

    if (pageData.length < limit) break; // last page reached
    page += 1;
    if (page > 200) break; // safety valve against a runaway loop
  }

  return orders;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch full order details from your API (same endpoint the cron uses),
 * retrying with exponential backoff if we get rate-limited (429).
 */
async function fetchOrderDetails(orderId, { maxRetries = 4, baseDelayMs = 800 } = {}) {
  let attempt = 0;

  while (true) {
    try {
      const response = await axios.get(`https://akravi.com/api/ad/order/${orderId}`);
      return response.data?.result;
    } catch (err) {
      const status = err?.response?.status;

      if (status === 429 && attempt < maxRetries) {
        // Respect Retry-After header if present, otherwise exponential backoff + jitter
        const retryAfterHeader = err?.response?.headers?.["retry-after"];
        const retryAfterMs = retryAfterHeader ? parseFloat(retryAfterHeader) * 1000 : null;
        const backoffMs = retryAfterMs || baseDelayMs * 2 ** attempt + Math.random() * 250;

        console.warn(
          `⚠ Rate limited fetching order ${orderId} (attempt ${attempt + 1}/${maxRetries}), retrying in ${Math.round(backoffMs)}ms`
        );
        await sleep(backoffMs);
        attempt += 1;
        continue;
      }

      throw err;
    }
  }
}

/**
 * Fetch detailed order records with LOW concurrency and spacing between
 * requests, so we don't trip rate limits on akravi.com. Failed lookups
 * (after retries are exhausted) are logged and skipped rather than
 * failing the whole batch.
 */
async function fetchDetailsWithConcurrency(orderIds, { concurrency = 3, delayMs = 150 } = {}) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < orderIds.length) {
      const current = index;
      index += 1;
      const orderId = orderIds[current];
      try {
        const detail = await fetchOrderDetails(orderId);
        if (detail) results.push(detail);
      } catch (err) {
        console.error(
          `✖ Shiprocket order detail fetch failed for ${orderId}:`,
          err?.response?.data || err.message
        );
        // skip this order rather than fail the whole batch
      }
      // small spacing between requests from the same worker, even on success
      if (delayMs) await sleep(delayMs);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, orderIds.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

/**
 * Fetch ALL Shiprocket orders between two dates (inclusive), with
 * accurate per-order data pulled from fetchOrderDetails — mirrors what
 * the cron sync does before sending to CRM.
 *
 * @param {string} since - "YYYY-MM-DD"
 * @param {string} until - "YYYY-MM-DD"
 */
export async function fetchShiprocketOrdersInRange(since, until) {
  const listOrders = await fetchShiprocketOrderList(since, until);
  if (listOrders.length === 0) return [];

  const orderIds = listOrders.map((o) => o.id).filter(Boolean);
  const detailedOrders = await fetchDetailsWithConcurrency(orderIds);

  return detailedOrders;
}

/**
 * Reduce detailed Shiprocket orders into summary metrics for display
 * alongside Facebook insights.
 */
export function summarizeShiprocketOrders(orders) {
  const summary = {
    totalOrders: 0,
    totalRevenue: 0,
    totalDiscount: 0,
    codOrders: 0,
    codRevenue: 0,
    prepaidOrders: 0,
    prepaidRevenue: 0,
    avgOrderValue: 0,
  };

  orders.forEach((o) => {
    const amount = parseFloat(o.total_amount_payable ?? o.subtotal_price ?? 0) || 0;
    const discount = parseFloat(o.total_discount ?? 0) || 0;

    summary.totalOrders += 1;
    summary.totalRevenue += amount;
    summary.totalDiscount += discount;

    if (o.payment_type === "CASH_ON_DELIVERY") {
      summary.codOrders += 1;
      summary.codRevenue += amount;
    } else if (o.payment_type === "PREPAID") {
      summary.prepaidOrders += 1;
      summary.prepaidRevenue += amount;
    }
  });

  summary.totalRevenue = Math.round(summary.totalRevenue * 100) / 100;
  summary.totalDiscount = Math.round(summary.totalDiscount * 100) / 100;
  summary.codRevenue = Math.round(summary.codRevenue * 100) / 100;
  summary.prepaidRevenue = Math.round(summary.prepaidRevenue * 100) / 100;
  summary.avgOrderValue =
    summary.totalOrders > 0
      ? Math.round((summary.totalRevenue / summary.totalOrders) * 100) / 100
      : 0;

  return summary;
}