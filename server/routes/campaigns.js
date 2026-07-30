import express from "express";
import Campaign from "../models/Campaign.js";
import AdSet from "../models/AdSet.js";
import Ad from "../models/Ad.js";
import Token from "../models/Token.js";

const router = express.Router();

// ─── Helpers ────────────────────────────────────────────────

async function fbGet(urlStr) {
  const res = await fetch(urlStr);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    const msg = data.error?.message || `FB API error (${res.status})`;
    throw new Error(msg);
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
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

function safeInt(v) {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

// ─── Try multiple endpoint strategies ───────────────────────

async function tryFetchCampaigns(base, actId, accessToken) {
  const campaignFields = [
    "id", "name", "objective", "status", "effective_status", "buying_type",
    "daily_budget", "lifetime_budget", "spend_cap",
    "start_time", "stop_time", "updated_time",
  ].join(",");

  // Strategy 1: /act_xxx/campaigns (System User token)
  try {
    const raw = await fetchAllPages(
      `${base}/campaigns?fields=${encodeURIComponent(campaignFields)}&limit=100&access_token=${accessToken}`
    );
    if (raw.length > 0) return { campaigns: raw, strategy: "act" };
  } catch (err) {
    console.log(`Strategy 1 (act_xxx) failed: ${err.message}`);
  }

  // Strategy 2: /me/campaigns (regular user token with ads_read)
  try {
    const raw = await fetchAllPages(
      `https://graph.facebook.com/v19.0/me/campaigns?fields=${encodeURIComponent(campaignFields)}&limit=100&access_token=${accessToken}`
    );
    if (raw.length > 0) return { campaigns: raw, strategy: "me" };
  } catch (err) {
    console.log(`Strategy 2 (me/campaigns) failed: ${err.message}`);
  }

  // Strategy 3: Search campaigns directly
  try {
    const raw = await fetchAllPages(
      `https://graph.facebook.com/v19.0/search?type=adcampaign&limit=100&fields=${encodeURIComponent(campaignFields)}&access_token=${accessToken}`
    );
    if (raw.length > 0) return { campaigns: raw, strategy: "search" };
  } catch (err) {
    console.log(`Strategy 3 (search) failed: ${err.message}`);
  }

  return { campaigns: [], strategy: null };
}

// ─── Sync ───────────────────────────────────────────────────

router.post("/sync/:tokenId", async (req, res) => {
  try {
    const { adAccountId, includeAds = true } = req.body;
    if (!adAccountId) {
      return res.status(400).json({ success: false, message: "adAccountId is required" });
    }

    const token = await Token.findById(req.params.tokenId).lean();
    if (!token) {
      return res.status(404).json({ success: false, message: "Token not found" });
    }

    const actId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const base = `https://graph.facebook.com/v19.0/${actId}`;
    const tokenRef = token._id;

    // ── Fetch campaigns with fallback strategies ──
    const { campaigns, strategy } = await tryFetchCampaigns(base, actId, token.accessToken);

    if (campaigns.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Could not fetch campaigns. Your token may need 'ads_read' + 'ads_management' permissions, or you may need a Business System User token. " +
          "Try generating a System User access token from Business Manager.",
        triedStrategies: ["act_xxx/campaigns", "me/campaigns", "search"],
      });
    }

    // Upsert campaigns
    const campaignIds = campaigns.map((c) => c.id);
    const campaignOps = campaigns.map((c) => ({
      updateOne: {
        filter: { tokenId: tokenRef, campaignId: c.id },
        update: {
          $set: {
            adAccountId,
            name: pick(c, "name"),
            objective: pick(c, "objective"),
            status: pick(c, "status"),
            effectiveStatus: pick(c, "effective_status"),
            buyingType: pick(c, "buying_type"),
            dailyBudget: safeInt(c.daily_budget),
            lifetimeBudget: safeInt(c.lifetime_budget),
            spendCap: safeInt(c.spend_cap),
            startTime: pick(c, "start_time"),
            stopTime: pick(c, "stop_time"),
            updatedTime: pick(c, "updated_time"),
            raw: c,
          },
        },
        upsert: true,
      },
    }));

    if (campaignOps.length > 0) {
      await Campaign.bulkWrite(campaignOps, { ordered: false });
    }

    // ── AdSets ──
    const adsetFields = [
      "id", "name", "status", "effective_status",
      "daily_budget", "lifetime_budget", "billing_event", "optimization_goal",
      "targeting", "start_time", "end_time", "updated_time",
    ].join(",");

    const adsetPromises = campaigns.map(async (campaign) => {
      try {
        // Try act_xxx/adsets first, fallback to me/adsets
        let adsets = [];
        try {
          const raw = await fetchAllPages(
            `${base}/adsets?campaign_id=${campaign.id}&fields=${encodeURIComponent(adsetFields)}&limit=100&access_token=${token.accessToken}`
          );
          adsets = raw;
        } catch {
          try {
            const raw = await fetchAllPages(
              `https://graph.facebook.com/v19.0/me/adsets?campaign_id=${campaign.id}&fields=${encodeURIComponent(adsetFields)}&limit=100&access_token=${token.accessToken}`
            );
            adsets = raw;
          } catch { /* skip */ }
        }

        if (adsets.length === 0) return [];

        const ops = adsets.map((a) => ({
          updateOne: {
            filter: { tokenId: tokenRef, adsetId: a.id },
            update: {
              $set: {
                adAccountId,
                campaignId: campaign.id,
                name: pick(a, "name"),
                status: pick(a, "status"),
                effectiveStatus: pick(a, "effective_status"),
                dailyBudget: safeInt(a.daily_budget),
                lifetimeBudget: safeInt(a.lifetime_budget),
                billingEvent: pick(a, "billing_event"),
                optimizationGoal: pick(a, "optimization_goal"),
                targeting: a.targeting || {},
                startTime: pick(a, "start_time"),
                endTime: pick(a, "end_time"),
                updatedTime: pick(a, "updated_time"),
                raw: a,
              },
            },
            upsert: true,
          },
        }));

        if (ops.length > 0) await AdSet.bulkWrite(ops, { ordered: false });
        return adsets.map((a) => ({ ...a, campaignId: campaign.id }));
      } catch (err) {
        console.error(`Adsets failed for ${campaign.id}: ${err.message}`);
        return [];
      }
    });

    const adsetResults = (await Promise.allSettled(adsetPromises)).flatMap((r) =>
      r.status === "fulfilled" ? r.value : []
    );

    // ── Ads ──
    let adsData = [];
    if (includeAds && adsetResults.length > 0) {
      const adFields = [
        "id", "name", "status", "effective_status",
        "adcreatives{id,title,body,object_story_spec,thumbnail_url}",
        "updated_time",
      ].join(",");

      const adPromises = adsetResults.map(async (adset) => {
        try {
          let ads = [];
          try {
            const raw = await fetchAllPages(
              `${base}/ads?adset_id=${adset.id}&fields=${encodeURIComponent(adFields)}&limit=100&access_token=${token.accessToken}`
            );
            ads = raw;
          } catch {
            try {
              const raw = await fetchAllPages(
                `https://graph.facebook.com/v19.0/me/ads?adset_id=${adset.id}&fields=${encodeURIComponent(adFields)}&limit=100&access_token=${token.accessToken}`
              );
              ads = raw;
            } catch { /* skip */ }
          }
          return ads.map((a) => ({ ...a, adsetId: adset.id, campaignId: adset.campaignId }));
        } catch {
          return [];
        }
      });

      const adResults = (await Promise.allSettled(adPromises)).flatMap((r) =>
        r.status === "fulfilled" ? r.value : []
      );
      adsData = adResults;

      if (adsData.length > 0) {
        const ops = adsData.map((a) => {
          const creative = a.adcreatives?.data?.[0] || a.adcreatives || {};
          const thumbnail = creative.thumbnail_url || "";
          const osSpec = creative.object_story_spec || {};
          let title = pick(creative, "title");
          let body = pick(creative, "message");
          let linkUrl = "";

          if (!title && osSpec.link_data) title = osSpec.link_data.title || "";
          if (!body && osSpec.link_data) body = osSpec.link_data.message || "";
          if (osSpec.link_data?.link) linkUrl = osSpec.link_data.link;
          if (creative.object_story_id) linkUrl = `https://facebook.com/${creative.object_story_id}`;

          return {
            updateOne: {
              filter: { tokenId: tokenRef, adId: a.id },
              update: {
                $set: {
                  adAccountId,
                  adsetId: a.adsetId,
                  campaignId: a.campaignId,
                  name: pick(a, "name"),
                  status: pick(a, "status"),
                  effectiveStatus: pick(a, "effective_status"),
                  creativeId: creative.id || "",
                  title,
                  body,
                  thumbnailUrl: thumbnail,
                  linkUrl,
                  callToAction: "",
                  updatedTime: pick(a, "updated_time"),
                  raw: a,
                },
              },
              upsert: true,
            },
          };
        });

        if (ops.length > 0) await Ad.bulkWrite(ops, { ordered: false });
      }
    }

    // ── Summary ──
    const savedCampaigns = await Campaign.find({ tokenId: tokenRef, adAccountId }).countDocuments();
    const savedAds = await Ad.find({ tokenId: tokenRef, adAccountId }).countDocuments();

    res.status(201).json({
      success: true,
      data: {
        campaignsSynced: campaigns.length,
        adsetsSynced: adsetResults.length,
        adsSynced: adsData.length,
        savedCampaigns,
        savedAds,
        strategy,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── List campaigns ─────────────────────────────────────────

router.get("/:tokenId", async (req, res) => {
  try {
    const token = await Token.findById(req.params.tokenId).lean();
    if (!token) {
      return res.status(404).json({ success: false, message: "Token not found" });
    }

    const { adAccountId } = req.query;
    let campaignQuery = { tokenId: token._id };
    if (adAccountId) campaignQuery.adAccountId = adAccountId;

    const campaigns = await Campaign.find(campaignQuery).sort({ name: 1 }).lean();
    if (campaigns.length === 0) {
      return res.json({ success: true, data: [] });
    }

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

    const tree = campaigns.map((campaign) => ({
      ...campaign,
      type: "campaign",
      children: (adsetsByCampaign.get(campaign.campaignId) || []).map((adset) => ({
        ...adset,
        type: "adset",
        children: (adsByAdSet.get(adset.adsetId) || []).map((ad) => ({ ...ad, type: "ad" })),
      })),
    }));

    res.json({ success: true, data: tree });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
