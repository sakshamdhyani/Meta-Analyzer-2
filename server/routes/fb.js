import express from "express";
const router = express.Router();

// Proxy FB Graph API so the frontend never handles the token
// GET /api/fb/adaccounts?access_token=<token>
router.get("/adaccounts", async (req, res) => {
  try {
    const { access_token } = req.query;
    if (!access_token) {
      return res.status(400).json({ success: false, message: "access_token query param is required" });
    }

    const url = new URL("https://graph.facebook.com/v19.0/me/adaccounts");
    url.searchParams.set("access_token", access_token);
    url.searchParams.set("fields", "id,name,account_status,currency,timezone_name,amount_spent");

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok || data.error) {
      return res.status(400).json({ success: false, message: data.error?.message || "Facebook API error", raw: data });
    }

    const accounts = (data.data || []).map((acc) => ({
      id: acc.id,
      name: acc.name,
      status: acc.account_status,
      currency: acc.currency,
      timezone: acc.timezone_name,
      amountSpent: acc.amount_spent,
    }));

    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
