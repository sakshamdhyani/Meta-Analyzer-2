import mongoose from "mongoose";

const adSchema = new mongoose.Schema(
  {
    tokenId: { type: mongoose.Schema.Types.ObjectId, ref: "Token", required: true, index: true },
    adAccountId: { type: String, required: true, index: true },
    adsetId: { type: String, required: true, index: true },
    campaignId: { type: String, required: true, index: true },
    adId: { type: String, required: true, trim: true },
    name: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "" },
    effectiveStatus: { type: String, trim: true, default: "" },
    creativeId: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, default: "" },
    body: { type: String, trim: true, default: "" },
    imageUrl: { type: String, trim: true, default: "" },
    thumbnailUrl: { type: String, trim: true, default: "" },
    callToAction: { type: String, trim: true, default: "" },
    linkUrl: { type: String, trim: true, default: "" },
    updatedTime: { type: String, default: "" },
    raw: { type: Object, default: {} },
  },
  { timestamps: true }
);

adSchema.index({ tokenId: 1, adId: 1 }, { unique: true });

export default mongoose.model("Ad", adSchema);
