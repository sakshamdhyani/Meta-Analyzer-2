import express from "express";
import AdAccount from "../models/AdAccount.js";
import Token from "../models/Token.js";

const router = express.Router();

// Add one ad account to a token
router.post("/:tokenId/adaccounts", async (req, res) => {
  try {
    const { adAccountId, name, note } = req.body;
    if (!adAccountId) {
      return res.status(400).json({ success: false, message: "adAccountId is required" });
    }

    const account = await AdAccount.create({
      tokenId: req.params.tokenId,
      adAccountId: adAccountId.trim(),
      name: name || "",
      note: note || "",
    });

    // Fetch currency from FB after creating account
    try {
      const token = await Token.findById(req.params.tokenId);
      if (token) {
        const fbUrl = `https://graph.facebook.com/v19.0/act_${adAccountId.trim()}?fields=currency&access_token=${token.accessToken}`;
        const fbRes = await fetch(fbUrl);
        const fbData = await fbRes.json();
        if (fbData.currency) {
          await AdAccount.findByIdAndUpdate(account._id, { currency: fbData.currency });
          account.currency = fbData.currency;
        }
      }
    } catch {
      // Currency fetch is best-effort — don't fail the request
    }

    res.status(201).json({ success: true, data: account });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Ad account already linked to this token." });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// Bulk add ad accounts to a token
router.post("/:tokenId/adaccounts/bulk", async (req, res) => {
  try {
    const rawIds = (req.body.accounts || []).map((a) => (a.adAccountId || a.id || "").trim()).filter(Boolean);
    if (rawIds.length === 0) {
      return res.status(400).json({ success: false, message: "No accounts provided" });
    }

    // Look up existing accounts to avoid duplicates and skip
    const tokenId = req.params.tokenId;
    const existing = await AdAccount.find({ tokenId, adAccountId: { $in: rawIds } }).lean();
    const existingIds = new Set(existing.map((e) => e.adAccountId));
    const newIds = rawIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) {
      return res.status(409).json({ success: false, message: "All accounts already linked to this token.", data: existing });
    }

    const docs = newIds.map((id) => ({ tokenId, adAccountId: id, name: "", currency: "" }));
    const result = await AdAccount.insertMany(docs, { ordered: false });

    // Best-effort: fetch currency for each new account from FB
    const token = await Token.findById(tokenId);
    if (token) {
      const currencyUpdates = [];
      for (const doc of result) {
        try {
          const fbUrl = `https://graph.facebook.com/v19.0/act_${doc.adAccountId}?fields=currency&access_token=${token.accessToken}`;
          const fbRes = await fetch(fbUrl);
          const fbData = await fbRes.json();
          if (fbData.currency) {
            currencyUpdates.push(AdAccount.findByIdAndUpdate(doc._id, { currency: fbData.currency }));
          }
        } catch {
          // skip
        }
        if (currencyUpdates.length >= 5) {
          await Promise.all(currencyUpdates);
          currencyUpdates.length = 0;
        }
      }
      await Promise.all(currencyUpdates);
    }

    const all = await AdAccount.find({ tokenId }).lean();
    res.status(201).json({ success: true, data: all, added: result.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete a single ad account
router.delete("/:id", async (req, res) => {
  try {
    const account = await AdAccount.findByIdAndDelete(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: "Ad account not found" });
    }
    res.json({ success: true, message: "Ad account removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
