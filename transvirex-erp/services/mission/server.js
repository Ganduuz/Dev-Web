const express  = require("express");
const mongoose = require("mongoose");
global.crypto  = require("crypto");

const app = express();
app.use(express.json());

const MONGO_URL ="mongodb://mongo:27017/erp";

mongoose.connect(MONGO_URL)
  .then(() => console.log("Mission service — MongoDB connecté ✅"))
  .catch(err => console.error("MongoDB erreur ❌", err));

// ── Modèle Mission ────────────────────────────────────────────────────────────
const MissionSchema = new mongoose.Schema({
  reference:      { type: String, unique: true, sparse: true },
  chauffeurId:    { type: String, required: true },
  dispatcherId:   { type: String },
  clientNom:      { type: String, required: true },
  adresseDepart:  { type: String, required: true },
  adresseArrivee: { type: String, required: true },
  dateDepart:     { type: Date,   required: true },
  dateLivraison:  { type: Date },
  statut:         { type: String, enum: ["en_attente","assignee","en_cours","livree","incident","annulee"], default: "en_attente" },
  priorite:       { type: String, enum: ["basse","normale","haute","urgente"], default: "normale" },
  notes:          { type: String },
  incidents:      [{ type: String, description: String, date: Date }],
}, { timestamps: true });

// ── Auto-référence sans next ──────────────────────────────────────────────────
MissionSchema.pre("save", async function () {
  if (!this.reference) {
    const count = await mongoose.model("Mission").countDocuments();
    this.reference = `MIS-${String(count + 1).padStart(4, "0")}`;
  }
});

const Mission = mongoose.model("Mission", MissionSchema);

// ── GET /missions ─────────────────────────────────────────────────────────────
app.get("/missions", async (req, res) => {
  try {
    const { statut, chauffeurId, priorite } = req.query;
    const filter = {};
    if (statut)      filter.statut      = statut;
    if (chauffeurId) filter.chauffeurId = chauffeurId;
    if (priorite)    filter.priorite    = priorite;
    const missions = await Mission.find(filter).sort({ dateDepart: 1 });
    res.json(missions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /missions/:id ─────────────────────────────────────────────────────────
app.get("/missions/:id", async (req, res) => {
  try {
    const mission = await Mission.findById(req.params.id);
    if (!mission) return res.status(404).json({ error: "Mission non trouvée" });
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /missions ────────────────────────────────────────────────────────────
app.post("/missions", async (req, res) => {
  try {
    const mission = new Mission(req.body);
    await mission.save();
    res.status(201).json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /missions/:id/statut ────────────────────────────────────────────────
app.patch("/missions/:id/statut", async (req, res) => {
  try {
    const { statut } = req.body;
    const update = { statut };
    if (statut === "livree") update.dateLivraison = new Date();
    const mission = await Mission.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!mission) return res.status(404).json({ error: "Mission non trouvée" });
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /missions/:id/assigner ──────────────────────────────────────────────
app.patch("/missions/:id/assigner", async (req, res) => {
  try {
    const { chauffeurId } = req.body;
    const mission = await Mission.findByIdAndUpdate(
      req.params.id,
      { chauffeurId, statut: "assignee" },
      { new: true }
    );
    if (!mission) return res.status(404).json({ error: "Mission non trouvée" });
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /missions/:id/incidents ──────────────────────────────────────────────
app.post("/missions/:id/incidents", async (req, res) => {
  try {
    const { type, description } = req.body;
    const mission = await Mission.findByIdAndUpdate(
      req.params.id,
      { statut: "incident", $push: { incidents: { type, description, date: new Date() } } },
      { new: true }
    );
    if (!mission) return res.status(404).json({ error: "Mission non trouvée" });
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /missions/:id ──────────────────────────────────────────────────────
app.delete("/missions/:id", async (req, res) => {
  try {
    await Mission.findByIdAndDelete(req.params.id);
    res.json({ message: "Mission supprimée" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "mission" }));

app.listen(3002, () => console.log("Mission service running on port 3002 🚀"));