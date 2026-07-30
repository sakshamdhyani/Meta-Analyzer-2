import mongoose from "mongoose";

const adSetSchema = new mongoose.Schema(
  {
    tokenId: { type: mongoose.Schema.Types.ObjectId, ref: "Token", required: true, index: true },
    adAccountId: { type: String, required: true, index: true },
    campaignId: { type: String, required: true, index: true },
    adsetId: { type: String, required: true, trim: true },
    name: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "" },
    effectiveStatus: { type: String, trim: true, default: "" },
    dailyBudget: { type: Number, default: null },
    lifetimeBudget: { type: Number, default: null },
    billingEvent: { type: String, trim: true, default: "" },
    optimizationGoal: { type: String, trim: true, default: "" },
    targeting: { type: Object, default: {} },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    updatedTime: { type: String, default: "" },
    raw: { type: Object, default: {} },
  },
  { timestamps: true }
);

adSetSchema.index({ tokenId: 1, adsetId: 1 }, { unique: true });

export default mongoose.model("AdSet", adSetSchema);
