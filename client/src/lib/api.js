import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || err.message || "Something went wrong";
    return Promise.reject(new Error(msg));
  }
);

// ─── Tokens ────────────────────────────────────────────────

export async function fetchTokens() {
  const { data } = await api.get("/tokens");
  return data;
}

export async function createToken(payload) {
  const { data } = await api.post("/tokens", payload);
  return data;
}

export async function updateToken(id, payload) {
  const { data } = await api.put(`/tokens/${id}`, payload);
  return data;
}

export async function deleteToken(id) {
  const { data } = await api.delete(`/tokens/${id}`);
  return data;
}

// ─── Ad Accounts ──────────────────────────────────────────

export async function fetchFbAdAccounts(accessToken) {
  const { data } = await api.get("/fb/adaccounts", { params: { access_token: accessToken } });
  return data;
}

export async function linkAdAccounts(tokenId, accounts) {
  const { data } = await api.post(`/adaccounts/${tokenId}/adaccounts/bulk`, { accounts });
  return data;
}

export async function addSingleAdAccount(tokenId, account) {
  const { data } = await api.post(`/adaccounts/${tokenId}/adaccounts`, account);
  return data;
}

export async function deleteAdAccount(id) {
  const { data } = await api.delete(`/adaccounts/${id}`);
  return data;
}

// ─── Sync ─────────────────────────────────────────────────

export async function syncAccount(tokenId, adAccountId, includeAds = true) {
  const { data } = await api.post(`/campaigns/sync/${tokenId}`, { adAccountId, includeAds });
  return data;
}

// ─── Campaigns ────────────────────────────────────────────

export async function fetchCampaigns(tokenId, adAccountId) {
  const { data } = await api.get(`/campaigns/${tokenId}`, {
    params: adAccountId ? { adAccountId } : undefined,
  });
  return data;
}

// ─── Insights ─────────────────────────────────────────────

export async function fetchInsights(tokenId, { accountIds, since, until }) {
  const { data } = await api.get(`/insights/${tokenId}`, {
    params: { accountIds, since, until },
  });
  return data;
}
