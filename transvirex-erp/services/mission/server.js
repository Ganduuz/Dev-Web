const express  = require("express");
const mongoose = require("mongoose");
const jwt      = require("jsonwebtoken");
const amqp     = require("amqplib");
global.crypto  = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET || "transvirex_secret_2026";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://rabbitmq";
const EVENT_EXCHANGE = "mission.events";

const app = express();
app.use(express.json());

async function publishMissionEvent(type, payload) {
  try {
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertExchange(EVENT_EXCHANGE, "fanout", { durable: false });
    channel.publish(EVENT_EXCHANGE, "", Buffer.from(JSON.stringify({ type, payload })));
    await channel.close();
    await conn.close();
  } catch (err) {
    console.error("Erreur publication événement mission:", err);
  }
}

const MONGO_URL ="mongodb://mongo:27017/erp";

mongoose.connect(MONGO_URL)
  .then(() => console.log("Mission service — MongoDB connecté ✅"))
  .catch(err => console.error("MongoDB erreur ❌", err));

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Token manquant" });
  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Accès refusé" });
    next();
  };
}

// ── Modèle Mission ────────────────────────────────────────────────────────────
const MissionSchema = new mongoose.Schema({
  reference:         { type: String, unique: true, sparse: true },
  chauffeurId:       { type: String, required: true },
  dispatcherId:      { type: String },
  clientNom:         { type: String, required: true },
  clientEmail:       { type: String },
  clientTelephone:   { type: String },
  adresseDepart:     { type: String, required: true },
  adresseArrivee:    { type: String, required: true },
  dateDepart:        { type: Date,   required: true },
  dateLivraison:     { type: Date },
  statut:            { type: String, enum: ["en_attente","acceptee","refusee","assignee","en_cours","livree","incident","annulee"], default: "en_attente" },
  priorite:          { type: String, enum: ["basse","normale","haute","urgente"], default: "normale" },
  notes:             { type: String },
  montant:           { type: Number, default: 0 },
  estimeeDuree:      { type: Number }, // en minutes
  dateAcceptation:   { type: Date },
  dateRefus:         { type: Date },
  raisonRefus:       { type: String },
  incidents:         [{ type: String, description: String, severity: String, date: Date }],
  rating:            { type: Number, min: 1, max: 5 },
  commentaireClient: { type: String },
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
app.get("/missions", authMiddleware, async (req, res) => {
  try {
    const { statut, chauffeurId, priorite } = req.query;
    const filter = {};
    if (statut)      filter.statut      = statut;
    if (chauffeurId) filter.chauffeurId = chauffeurId;
    if (priorite)    filter.priorite    = priorite;
    if (req.user.role === "chauffeur") filter.chauffeurId = req.user.userId;
    const missions = await Mission.find(filter).sort({ dateDepart: 1 });
    res.json(missions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /missions/:id ─────────────────────────────────────────────────────────
app.get("/missions/:id", authMiddleware, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role === "chauffeur") query.chauffeurId = req.user.userId;
    const mission = await Mission.findOne(query);
    if (!mission) return res.status(404).json({ error: "Mission non trouvée" });
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /missions ────────────────────────────────────────────────────────────
app.post("/missions", authMiddleware, requireRole(["dispatcher","admin"]), async (req, res) => {
  try {
    const mission = new Mission({ ...req.body, dispatcherId: req.user.userId });
    await mission.save();
    await publishMissionEvent("MISSION_CREATED", mission);
    if (mission.chauffeurId) {
      await publishMissionEvent("MISSION_PROPOSAL", mission);
    }
    res.status(201).json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /missions/:id/statut ────────────────────────────────────────────────
app.patch("/missions/:id/statut", authMiddleware, async (req, res) => {
  try {
    const { statut } = req.body;
    const update = { statut };
    if (statut === "livree") update.dateLivraison = new Date();
    const query = { _id: req.params.id };
    if (req.user.role === "chauffeur") query.chauffeurId = req.user.userId;
    const mission = await Mission.findOneAndUpdate(query, update, { new: true });
    if (!mission) return res.status(404).json({ error: "Mission non trouvée" });
    if (statut === "livree") {
      await publishMissionEvent("MISSION_DELIVERED", mission);
    } else {
      await publishMissionEvent("MISSION_STATUS_UPDATED", mission);
    }
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /missions/:id/assigner ──────────────────────────────────────────────
app.patch("/missions/:id/assigner", authMiddleware, requireRole(["dispatcher","admin"]), async (req, res) => {
  try {
    const { chauffeurId } = req.body;
    const mission = await Mission.findByIdAndUpdate(
      req.params.id,
      { chauffeurId, statut: "assignee" },
      { new: true }
    );
    if (!mission) return res.status(404).json({ error: "Mission non trouvée" });
    await publishMissionEvent("MISSION_PROPOSAL", mission);
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /missions/:id/accepter ──────────────────────────────────────────────
app.patch("/missions/:id/accepter", authMiddleware, requireRole(["chauffeur"]), async (req, res) => {
  try {
    const query = { _id: req.params.id, chauffeurId: req.user.userId };
    const mission = await Mission.findOneAndUpdate(
      query,
      { statut: "acceptee", dateAcceptation: new Date() },
      { new: true }
    );
    if (!mission) return res.status(404).json({ error: "Mission non trouvée ou accès refusé" });
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /missions/:id/refuser ───────────────────────────────────────────────
app.patch("/missions/:id/refuser", authMiddleware, requireRole(["chauffeur"]), async (req, res) => {
  try {
    const { raison } = req.body;
    const query = { _id: req.params.id, chauffeurId: req.user.userId };
    const mission = await Mission.findOneAndUpdate(
      query,
      { statut: "refusee", dateRefus: new Date(), raisonRefus: raison },
      { new: true }
    );
    if (!mission) return res.status(404).json({ error: "Mission non trouvée ou accès refusé" });
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /missions/:id/terminer ──────────────────────────────────────────────
app.patch("/missions/:id/terminer", authMiddleware, requireRole(["chauffeur"]), async (req, res) => {
  try {
    const query = { _id: req.params.id, chauffeurId: req.user.userId };
    const mission = await Mission.findOneAndUpdate(
      query,
      { statut: "livree", dateLivraison: new Date() },
      { new: true }
    );
    if (!mission) return res.status(404).json({ error: "Mission non trouvée ou accès refusé" });
    await publishMissionEvent("MISSION_DELIVERED", mission);
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /missions/:id/incidents ──────────────────────────────────────────────
app.post("/missions/:id/incidents", authMiddleware, async (req, res) => {
  try {
    const { type, description } = req.body;
    const incident = { type, description, date: new Date() };
    const query = { _id: req.params.id };
    if (req.user.role === "chauffeur") query.chauffeurId = req.user.userId;
    const mission = await Mission.findOneAndUpdate(
      query,
      { statut: "incident", $push: { incidents: incident } },
      { new: true }
    );
    if (!mission) return res.status(404).json({ error: "Mission non trouvée" });
    await publishMissionEvent("MISSION_INCIDENT", { missionId: req.params.id, incident });
    res.json(mission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /missions/:id ──────────────────────────────────────────────────────
app.delete("/missions/:id", authMiddleware, requireRole(["admin"]), async (req, res) => {
  try {
    await Mission.findByIdAndDelete(req.params.id);
    res.json({ message: "Mission supprimée" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /missions/stats/dashboard ─────────────────────────────────────────────
app.get("/missions/stats/dashboard", authMiddleware, requireRole(["dispatcher","direction","admin"]), async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalLivraisons = await Mission.countDocuments({ statut: "livree" });
    const livraisonsAujourdhui = await Mission.countDocuments({ statut: "livree", dateLivraison: { $gte: startOfDay } });
    const livraisonsMois = await Mission.countDocuments({ statut: "livree", dateLivraison: { $gte: startOfMonth } });
    
    const retards = await Mission.countDocuments({ 
      statut: "livree", 
      dateLivraison: { $gt: "$dateDepart" } 
    });
    
    const incidents = await Mission.countDocuments({ statut: "incident" });
    const enCours = await Mission.countDocuments({ statut: { $in: ["acceptee", "en_cours"] } });
    
    const missions = await Mission.find({ statut: "livree" }).select("dateDepart dateLivraison");
    const totalHeures = missions.reduce((sum, m) => {
      if (m.dateLivraison && m.dateDepart) {
        sum += (m.dateLivraison - m.dateDepart) / (1000 * 60 * 60);
      }
      return sum;
    }, 0);
    const heuremoyenne = missions.length ? (totalHeures / missions.length).toFixed(2) : 0;
    
    res.json({
      totalLivraisons,
      livraisonsAujourdhui,
      livraisonsMois,
      retards,
      incidents,
      enCours,
      heuremoyenne,
      tauxReussite: missions.length ? ((totalLivraisons - retards) / totalLivraisons * 100).toFixed(1) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /missions/stats/chauffeurs ────────────────────────────────────────────
app.get("/missions/stats/chauffeurs", authMiddleware, requireRole(["dispatcher","direction","admin"]), async (req, res) => {
  try {
    const chauffeurs = await Mission.aggregate([
      { $match: { statut: "livree" } },
      { $group: {
        _id: "$chauffeurId",
        totalLivraisons: { $sum: 1 },
        totalHeures: { 
          $sum: { 
            $divide: [
              { $subtract: ["$dateLivraison", "$dateDepart"] },
              3600000
            ]
          }
        },
        rating: { $avg: "$rating" }
      }},
      { $sort: { totalLivraisons: -1 } }
    ]);
    res.json(chauffeurs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /missions/historique ─────────────────────────────────────────────────
app.get("/missions/historique", authMiddleware, async (req, res) => {
  try {
    const filter = { chauffeurId: req.user.userId, statut: { $in: ["livree", "incident", "annulee"] } };
    if (req.user.role !== "chauffeur") delete filter.chauffeurId;
    const missions = await Mission.find(filter).sort({ dateLivraison: -1 }).limit(50);
    res.json(missions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "mission" }));

app.listen(3002, () => console.log("Mission service running on port 3002 🚀"));