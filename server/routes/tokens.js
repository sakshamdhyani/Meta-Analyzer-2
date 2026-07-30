import express from "express";
import Token from "../models/Token.js";
import AdAccount from "../models/AdAccount.js";

const router = express.Router();

// List all tokens with their ad accounts populated
router.get("/", async (req, res) => {
  try {
    const tokens = await Token.find().sort({ createdAt: -1 }).lean();
    const tokenIds = tokens.map((t) => t._id);
    const adAccounts = await AdAccount.find({ tokenId: { $in: tokenIds } }).lean();

    const grouped = tokens.map((token) => ({
      ...token,
      adAccounts: adAccounts.filter((a) => a.tokenId.equals(token._id)),
    }));

    res.json({ success: true, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get one token with its ad accounts
router.get("/:id", async (req, res) => {
  try {
    const token = await Token.findById(req.params.id);
    if (!token) {
      return res.status(404).json({ success: false, message: "Token not found" });
    }

    const adAccounts = await AdAccount.find({ tokenId: token._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { ...token.toObject(), adAccounts } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create a new token
router.post("/", async (req, res) => {
  try {
    const { accessToken, label, note, adAccounts } = req.body;

    if (!accessToken) {
      return res.status(400).json({ success: false, message: "Access token is required" });
    }

    const token = await Token.create({
      accessToken,
      label: label || "",
      note: note || "",
    });

    // Optionally bulk-create ad accounts
    if (adAccounts && Array.isArray(adAccounts) && adAccounts.length > 0) {
      const docs = adAccounts.map((a) => ({
        tokenId: token._id,
        adAccountId: a.adAccountId || a.id,
        name: a.name || "",
        currency: a.currency || "",
        note: a.note || "",
      }));
      await AdAccount.insertMany(docs, { ordered: false });
    }

    // Return with populated ad accounts
    const populated = await Token.findById(token._id).lean();
    const accounts = await AdAccount.find({ tokenId: token._id }).lean();

    res.status(201).json({ success: true, data: { ...populated, adAccounts: accounts } });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "This access token already exists." });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update a token
router.put("/:id", async (req, res) => {
  try {
    const token = await Token.findByIdAndUpdate(
      req.params.id,
      { label: req.body.label ?? "", note: req.body.note ?? "" },
      { new: true, runValidators: true }
    );

    if (!token) {
      return res.status(404).json({ success: false, message: "Token not found" });
    }

    const adAccounts = await AdAccount.find({ tokenId: token._id }).lean();
    res.json({ success: true, data: { ...token.toObject(), adAccounts } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete a token (cascades to ad accounts via pre hook)
router.delete("/:id", async (req, res) => {
  try {
    const token = await Token.findByIdAndDelete(req.params.id);
    if (!token) {
      return res.status(404).json({ success: false, message: "Token not found" });
    }
    res.json({ success: true, message: "Token removed" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
