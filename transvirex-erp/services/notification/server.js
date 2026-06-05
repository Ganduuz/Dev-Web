const express  = require("express");
const mongoose = require("mongoose");
global.crypto  = require("crypto");

const app = express();
app.use(express.json());

const MONGO_URL = "mongodb://mongo:27017/erp";

mongoose.connect(MONGO_URL)
  .then(() => console.log("Notification service — MongoDB connecté ✅"))
  .catch(err => console.error("MongoDB erreur ❌", err));

const NotificationSchema = new mongoose.Schema({
  userId:  { type: String, required: true, index: true },
  titre:   { type: String, required: true },
  message: { type: String, required: true },
  type:    { type: String, default: "info" },
  lu:      { type: Boolean, default: false },
  payload: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

const Notification = mongoose.model("Notification", NotificationSchema);

// ── GET /notification/user/:userId — AVANT /:id ───────────────────────────────
app.get("/notification/user/:userId", async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.params.userId })
      .sort({ createdAt: -1 }).limit(30);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /notification/user/:userId/tout-lire — AVANT /:id ──────────────────
app.patch("/notification/user/:userId/tout-lire", async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.params.userId, lu: false }, { lu: true });
    res.json({ message: "Toutes les notifications marquées comme lues" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /notification ─────────────────────────────────────────────────────────
app.get("/notification", async (req, res) => {
  try {
    const { userId, lu } = req.query;
    const filter = {};
    if (userId) filter.userId = userId;
    if (lu !== undefined) filter.lu = lu === "true";
    const notifs = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /notification ────────────────────────────────────────────────────────
app.post("/notification", async (req, res) => {
  try {
    const { userId, titre, message, type, payload } = req.body;
    if (!userId || !titre || !message)
      return res.status(400).json({ error: "userId, titre et message requis" });
    const notif = await Notification.create({ userId, titre, message, type, payload });
    res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /notification/:id/lire ──────────────────────────────────────────────
app.patch("/notification/:id/lire", async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id, { lu: true }, { new: true }
    );
    if (!notif) return res.status(404).json({ error: "Notification non trouvée" });
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /notification/:id ──────────────────────────────────────────────────
app.delete("/notification/:id", async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification supprimée" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "notification" }));

app.listen(3005, () => console.log("Notification service running on port 3005 🚀"));