import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import tokenRouter from "./routes/tokens.js";
import adAccountRouter from "./routes/adaccounts.js";
import fbRouter from "./routes/fb.js";
import insightsRouter from "./routes/insights.js";
import campaignsRouter from "./routes/campaigns.js";
import { connectDB } from "./config/db.js";

dotenv.config();

const app = express();

const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

app.use("/api/tokens", tokenRouter);
app.use("/api/adaccounts", adAccountRouter);
app.use("/api/fb", fbRouter);
app.use("/api/insights", insightsRouter);
app.use("/api/campaigns", campaignsRouter);

app.get("/", (req, res) => {
  res.json({ message: "FB Ad Accounts Manager API running" });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start();
