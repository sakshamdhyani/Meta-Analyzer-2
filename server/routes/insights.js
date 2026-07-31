import express from "express";
import Token from "../models/Token.js";
import AdAccount from "../models/AdAccount.js";
import Campaign from "../models/Campaign.js";
import AdSet from "../models/AdSet.js";
import Ad from "../models/Ad.js";

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────

async function fbGet(urlStr) {
  const res = await fetch(urlStr);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `FB API error (${res.status})`);
  }
  return data;
}

async function fetchAllPages(url) {
  const results = [];
  let next = url;
  while (next) {
    const data = await fbGet(next);
    results.push(...(data.data || []));
    next = data.paging?.next || null;
  }
  return results;
}

function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
  }
  return "";
}

function safeInt(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function emptyInsights() {
  return {
    spend: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0,
    conversions: 0, costPerConversion: 0, revenue: 0, roas: 0, reach: 0, frequency: 0,
  };
}

function normalizeInsightRow(row) {
  const spend = parseFloat(row.spend || 0);
  const impressions = parseInt(row.impressions || 0, 10);
  const clicks = parseInt(row.clicks || 0, 10);
  const reach = parseInt(row.reach || 0, 10);
  const freq = row.frequency ? parseFloat(row.frequency) : 0;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

  const convs = (row.actions || [])
    .filter((a) => a.action_type === "purchase")
    .reduce((s, a) => s + parseFloat(a.value || 0), 0);

  const cpa = (row.cost_per_action_type || [])
    .find((c) => c.action_type === "purchase");
  const cpaVal = cpa ? parseFloat(cpa.value || 0) : 0;

  // Revenue comes from action_values (total value of purchase actions), not from CPA
  const revenue = (row.action_values || [])
    .filter((a) => a.action_type === "purchase")
    .reduce((s, a) => s + parseFloat(a.value || 0), 0);

  const roas = spend > 0 ? revenue / spend : 0;

  return {
    spend: round2(spend),
    impressions,
    clicks,
    ctr: round2(ctr),
    cpc: round2(cpc),
    cpm: round2(cpm),
    conversions: Math.round(convs),
    costPerConversion: round2(cpaVal),
    revenue: round2(revenue),
    roas: round2(roas),
    reach,
    frequency: round2(freq),
  };
}

function sumMetrics(results) {
  const total = emptyInsights();
  results.forEach((r) => {
    for (const k of Object.keys(total)) {
      total[k] += r[k] || 0;
    }
  });
  total.ctr = total.impressions > 0 ? round2((total.clicks / total.impressions) * 100) : 0;
  total.cpc = total.clicks > 0 ? round2(total.spend / total.clicks) : 0;
  total.cpm = total.impressions > 0 ? round2((total.spend / total.impressions) * 1000) : 0;
  total.roas = total.spend > 0 ? round2(total.revenue / total.spend) : 0;
  return total;
}

// ─── FB Insights fetch at different levels ─────────────────

async function fetchInsightsForAccount(actId, accessToken, since, until, level = "account") {
  const baseUrl = `https://graph.facebook.com/v19.0/${actId}/insights`;
  const params = new URLSearchParams({
    access_token: accessToken,
    time_range: JSON.stringify({ since, until }),
    time_increment: "1",
    limit: "500",
    level,
    fields: "spend,impressions,clicks,ctr,cpc,cpm,actions,cost_per_action_type,action_values,reach,frequency",
  });

  const results = [];
  let next = `${baseUrl}?${params.toString()}`;
  while (next) {
    const data = await fbGet(next);
    results.push(...(data.data || []).map(normalizeInsightRow));
    next = data.paging?.next || null;
  }
  return results;
}

async function fetchCampaignInsights(campaignId, accessToken, since, until) {
  const url = `https://graph.facebook.com/v19.0/${campaignId}/insights?access_token=${accessToken}&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}&time_increment=1&limit=500&fields=spend,impressions,clicks,ctr,cpc,cpm,actions,cost_per_action_type,action_values,reach,frequency`;
  const data = await fbGet(url);
  return (data.data || []).map(normalizeInsightRow);
}

async function fetchAdSetInsights(adsetId, accessToken, since, until) {
  const url = `https://graph.facebook.com/v19.0/${adsetId}/insights?access_token=${accessToken}&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}&time_increment=1&limit=500&fields=spend,impressions,clicks,ctr,cpc,cpm,actions,cost_per_action_type,action_values,reach,frequency`;
  const data = await fbGet(url);
  return (data.data || []).map(normalizeInsightRow);
}

async function fetchAdInsights(adId, accessToken, since, until) {
  const url = `https://graph.facebook.com/v19.0/${adId}/insights?access_token=${accessToken}&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}&time_increment=1&limit=500&fields=spend,impressions,clicks,ctr,cpc,cpm,actions,cost_per_action_type,action_values,reach,frequency`;
  const data = await fbGet(url);
  return (data.data || []).map(normalizeInsightRow);
}

// ─── Route ──────────────────────────────────────────────────

router.get("/:tokenId", async (req, res) => {
  try {
    const token = await Token.findById(req.params.tokenId).lean();
    if (!token) {
      return res.status(404).json({ success: false, message: "Token not found" });
    }

    const { accountIds, since, until } = req.query;

    const now = new Date();
    const dateSince = since || new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29).toISOString().slice(0, 10);
    const dateUntil = until || now.toISOString().slice(0, 10);

    let accountsQuery = { tokenId: token._id };
    if (accountIds) {
      const ids = accountIds.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) accountsQuery.adAccountId = { $in: ids };
    }

    const adAccounts = await AdAccount.find(accountsQuery).lean();
    if (adAccounts.length === 0) {
      return res.json({ success: true, data: { combined: { ...emptyInsights(), since: dateSince, until: dateUntil }, accounts: [], hierarchy: [] } });
    }

    // ── Per-account insights ──
    const accountInsightsResults = await Promise.allSettled(
      adAccounts.map((acc) =>
        fetchInsightsForAccount(
          acc.adAccountId.startsWith("act_") ? acc.adAccountId : `act_${acc.adAccountId}`,
          token.accessToken,
          dateSince,
          dateUntil,
          "account"
        )
      )
    );

    const accountsData = [];
    const accountIdToInsights = {};
    let combined = { ...emptyInsights() };
    const seenCurrencies = new Set();

    accountInsightsResults.forEach((result, i) => {
      if (result.status === "rejected") return;
      const rows = result.value;
      if (rows.length === 0) return;

      const metrics = sumMetrics(rows);
      const adAccount = adAccounts[i];
      accountsData.push({ ...metrics, _id: adAccount._id, adAccountId: adAccount.adAccountId, name: adAccount.name, currency: adAccount.currency || "USD" });
      accountIdToInsights[adAccount.adAccountId] = metrics;
      if (adAccount.currency) seenCurrencies.add(adAccount.currency);
      for (const k of Object.keys(combined)) combined[k] += metrics[k] || 0;
    });

    combined.ctr = combined.impressions > 0 ? round2((combined.clicks / combined.impressions) * 100) : 0;
    combined.cpc = combined.clicks > 0 ? round2(combined.spend / combined.clicks) : 0;
    combined.cpm = combined.impressions > 0 ? round2((combined.spend / combined.impressions) * 1000) : 0;
    combined.roas = combined.spend > 0 ? round2(combined.revenue / combined.spend) : 0;
    const mixedCurrencies = seenCurrencies.size > 1 ? [...seenCurrencies] : [];

    // ── Hierarchy: load campaigns/adsets/ads from DB ──
    const adAccountIds = adAccounts.map((a) => a.adAccountId);
    const campaigns = await Campaign.find({ tokenId: token._id, adAccountId: { $in: adAccountIds } }).sort({ name: 1 }).lean();

    const hierarchy = [];
    if (campaigns.length > 0) {
      const campaignIds = campaigns.map((c) => c.campaignId);
      const adsets = await AdSet.find({ tokenId: token._id, campaignId: { $in: campaignIds } }).lean();
      const adsetIds = adsets.map((a) => a.adsetId);
      const ads = await Ad.find({ tokenId: token._id, adsetId: { $in: adsetIds } }).lean();

      const adsetsByCampaign = new Map();
      const adsByAdSet = new Map();
      adsets.forEach((as) => {
        if (!adsetsByCampaign.has(as.campaignId)) adsetsByCampaign.set(as.campaignId, []);
        adsetsByCampaign.get(as.campaignId).push(as);
      });
      ads.forEach((ad) => {
        if (!adsByAdSet.has(ad.adsetId)) adsByAdSet.set(ad.adsetId, []);
        adsByAdSet.get(ad.adsetId).push(ad);
      });

      // Fetch insights per entity (parallel batches)
      const campaignMetricsMap = {};
      const adsetMetricsMap = {};
      const adMetricsMap = {};

      // Campaign-level insights (batch)
      const campaignInsightsResults = await Promise.allSettled(
        campaigns.map((c) => fetchCampaignInsights(c.campaignId, token.accessToken, dateSince, dateUntil))
      );
      campaignInsightsResults.forEach((result, i) => {
        if (result.status === "fulfilled") {
          campaignMetricsMap[campaigns[i].campaignId] = sumMetrics(result.value);
        }
      });

      // AdSet-level insights (batch per campaign)
      const adsetInsightsResults = await Promise.allSettled(
        adsets.map((a) => fetchAdSetInsights(a.adsetId, token.accessToken, dateSince, dateUntil))
      );
      adsetInsightsResults.forEach((result, i) => {
        if (result.status === "fulfilled") {
          adsetMetricsMap[adsets[i].adsetId] = sumMetrics(result.value);
        }
      });

      // Ad-level insights (batch — limit to 50 most recent ads per adset to avoid rate limits)
      const sortedAds = ads.sort((a, b) => (b.updatedTime || "").localeCompare(a.updatedTime || ""));
      const recentAds = sortedAds.slice(0, 50);
      const adInsightsResults = await Promise.allSettled(
        recentAds.map((a) => fetchAdInsights(a.adId, token.accessToken, dateSince, dateUntil))
      );
      adInsightsResults.forEach((result, i) => {
        if (result.status === "fulfilled") {
          adMetricsMap[recentAds[i].adId] = sumMetrics(result.value);
        }
      });

      // Build tree with metrics and parent name maps
      const campaignIdToName = {};
      const adAccountIdToName = {};
      campaigns.forEach((c) => {
        campaignIdToName[c.campaignId] = c.name;
        if (c.adAccountId) adAccountIdToName[c.adAccountId] = "";
      });
      adAccounts.forEach((acc) => {
        adAccountIdToName[acc.adAccountId] = acc.name;
      });
      // Fill any ad accounts referenced by adsets/ads but not in adAccounts
      adsets.forEach((as) => {
        if (as.adAccountId && !(as.adAccountId in adAccountIdToName)) {
          adAccountIdToName[as.adAccountId] = as.adAccountId;
        }
      });

      hierarchy.push(
        ...campaigns.map((campaign) => {
          const campMetrics = campaignMetricsMap[campaign.campaignId] || emptyInsights();
          const children = (adsetsByCampaign.get(campaign.campaignId) || []).map((adset) => {
            const asMetrics = adsetMetricsMap[adset.adsetId] || emptyInsights();
            return {
              ...adset,
              type: "adset",
              metrics: asMetrics,
              adAccountId: adset.adAccountId,
              adAccountName: adAccountIdToName[adset.adAccountId] || "",
              campaignId: adset.campaignId,
              campaignName: campaignIdToName[adset.campaignId] || "",
              children: (adsByAdSet.get(adset.adsetId) || []).map((ad) => ({
                ...ad,
                type: "ad",
                metrics: adMetricsMap[ad.adId] || emptyInsights(),
                adAccountId: ad.adAccountId,
                adAccountName: adAccountIdToName[ad.adAccountId] || "",
                campaignId: ad.campaignId,
                campaignName: campaignIdToName[ad.campaignId] || "",
              })),
            };
          });

          return {
            ...campaign,
            type: "campaign",
            metrics: campMetrics,
            adAccountId: campaign.adAccountId,
            adAccountName: adAccountIdToName[campaign.adAccountId] || "",
            children,
          };
        })
      );
    }

    res.json({
      success: true,
      data: {
        combined: { ...combined, since: dateSince, until: dateUntil },
        accounts: accountsData,
        mixedCurrencies,
        hierarchy,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
