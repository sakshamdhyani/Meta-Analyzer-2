import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
  {
    tokenId: { type: mongoose.Schema.Types.ObjectId, ref: "Token", required: true, index: true },
    adAccountId: { type: String, required: true, index: true },
    campaignId: { type: String, required: true, trim: true },
    name: { type: String, trim: true, default: "" },
    objective: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "" },
    effectiveStatus: { type: String, trim: true, default: "" },
    buyingType: { type: String, trim: true, default: "" },
    dailyBudget: { type: Number, default: null },
    lifetimeBudget: { type: Number, default: null },
    spendCap: { type: Number, default: null },
    startTime: { type: String, default: "" },
    stopTime: { type: String, default: "" },
    updatedTime: { type: String, default: "" },
    raw: { type: Object, default: {} },
  },
  { timestamps: true }
);

campaignSchema.index({ tokenId: 1, campaignId: 1 }, { unique: true });

export default mongoose.model("Campaign", campaignSchema);
