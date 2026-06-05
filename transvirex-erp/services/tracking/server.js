const express  = require("express");
const mongoose = require("mongoose");
global.crypto  = require("crypto");

const app = express();
app.use(express.json());

const MONGO_URL = "mongodb://mongo:27017/erp";

mongoose.connect(MONGO_URL)
  .then(() => console.log("Tracking service — MongoDB connecté ✅"))
  .catch(err => console.error("MongoDB erreur ❌", err));

const TrackingSchema = new mongoose.Schema({
  missionId:   { type: String, required: true, index: true },
  chauffeurId: { type: String, required: true },
  statut:      { type: String, required: true },
  localisation: {
    adresse: String,
    lat:     Number,
    lng:     Number,
  },
  message: String,
}, { timestamps: true });

const Tracking = mongoose.model("Tracking", TrackingSchema);

// ── GET /tracking/stats — AVANT les routes avec params ───────────────────────
app.get("/tracking/stats", async (req, res) => {
  try {
    const total     = await Tracking.countDocuments();
    const livrees   = await Tracking.countDocuments({ statut: "livree" });
    const incidents = await Tracking.countDocuments({ statut: "incident" });
    res.json({ total, livrees, incidents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /tracking ─────────────────────────────────────────────────────────────
app.get("/tracking", async (req, res) => {
  try {
    const { missionId, chauffeurId } = req.query;
    const filter = {};
    if (missionId)   filter.missionId   = missionId;
    if (chauffeurId) filter.chauffeurId = chauffeurId;
    const events = await Tracking.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /tracking/mission/:missionId ─────────────────────────────────────────
app.get("/tracking/mission/:missionId", async (req, res) => {
  try {
    const events = await Tracking.find({ missionId: req.params.missionId }).sort({ createdAt: 1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /tracking/chauffeur/:chauffeurId/derniere ─────────────────────────────
app.get("/tracking/chauffeur/:chauffeurId/derniere", async (req, res) => {
  try {
    const last = await Tracking.findOne({ chauffeurId: req.params.chauffeurId }).sort({ createdAt: -1 });
    if (!last) return res.status(404).json({ error: "Aucun tracking trouvé" });
    res.json(last);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /tracking ────────────────────────────────────────────────────────────
app.post("/tracking", async (req, res) => {
  try {
    const { missionId, chauffeurId, statut, localisation, message } = req.body;
    if (!missionId || !chauffeurId || !statut)
      return res.status(400).json({ error: "missionId, chauffeurId et statut requis" });
    const event = await Tracking.create({ missionId, chauffeurId, statut, localisation, message });
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "tracking" }));

app.listen(3003, () => console.log("Tracking service running on port 3003 🚀"));