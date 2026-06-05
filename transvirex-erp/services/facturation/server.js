const express  = require("express");
const mongoose = require("mongoose");
global.crypto  = require("crypto");

const app = express();
app.use(express.json());

const MONGO_URL ="mongodb://mongo:27017/erp";

mongoose.connect(MONGO_URL)
  .then(() => console.log("Facturation service — MongoDB connecté ✅"))
  .catch(err => console.error("MongoDB erreur ❌", err));

const FactureSchema = new mongoose.Schema({
  reference:    { type: String, unique: true },
  missionId:    { type: String, required: true, unique: true },
  clientNom:    { type: String, required: true },
  montant:      { type: Number, required: true },
  statut:       { type: String, enum: ["en_attente","envoyee","payee","en_retard","annulee"], default: "en_attente" },
  dateEcheance: { type: Date },
  datePaiement: { type: Date },
  notes:        { type: String },
  relances:     [{ message: String, date: { type: Date, default: Date.now } }],
}, { timestamps: true });

FactureSchema.pre("save", function (next) {
  (async () => {
    try {
      const count = await mongoose.model("Facture").countDocuments();

      if (!this.reference) {
        this.reference = `FAC-${String(count + 1).padStart(4, "0")}`;
      }

      next();
    } catch (err) {
      next(err);
    }
  })();
});

const Facture = mongoose.model("Facture", FactureSchema);

// ── GET /facturation/stats — KPIs (AVANT /:id) ────────────────────────────────
app.get("/facturation/stats", async (req, res) => {
  try {
    const total   = await Facture.countDocuments();
    const payees  = await Facture.find({ statut: "payee" });
    const attente = await Facture.find({ statut: "en_attente" });
    const retard  = await Facture.find({ statut: "en_retard" });
    const somme   = (arr) => arr.reduce((s, f) => s + f.montant, 0);
    res.json({
      total,
      payees:    { count: payees.length,  montant: somme(payees)  },
      enAttente: { count: attente.length, montant: somme(attente) },
      enRetard:  { count: retard.length,  montant: somme(retard)  },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /facturation ──────────────────────────────────────────────────────────
app.get("/facturation", async (req, res) => {
  try {
    const { statut } = req.query;
    const filter = statut ? { statut } : {};
    const factures = await Facture.find(filter).sort({ createdAt: -1 });
    res.json(factures);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /facturation/:id ──────────────────────────────────────────────────────
app.get("/facturation/:id", async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id);
    if (!facture) return res.status(404).json({ error: "Facture non trouvée" });
    res.json(facture);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /facturation ─────────────────────────────────────────────────────────
app.post("/facturation", async (req, res) => {
  try {
    const { missionId, clientNom, montant, notes, dateEcheance } = req.body;
    if (!missionId || !clientNom || !montant)
      return res.status(400).json({ error: "missionId, clientNom et montant requis" });
    const facture = await Facture.create({ missionId, clientNom, montant, notes, dateEcheance });
    res.status(201).json(facture);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: "Facture déjà existante pour cette mission" });
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /facturation/:id/statut ─────────────────────────────────────────────
app.patch("/facturation/:id/statut", async (req, res) => {
  try {
    const { statut } = req.body;
    const update = { statut };
    if (statut === "payee") update.datePaiement = new Date();
    const facture = await Facture.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!facture) return res.status(404).json({ error: "Facture non trouvée" });
    res.json(facture);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /facturation/:id/relances ────────────────────────────────────────────
app.post("/facturation/:id/relances", async (req, res) => {
  try {
    const { message } = req.body;
    const facture = await Facture.findByIdAndUpdate(
      req.params.id,
      { $push: { relances: { message } }, statut: "en_retard" },
      { new: true }
    );
    if (!facture) return res.status(404).json({ error: "Facture non trouvée" });
    res.json(facture);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /facturation/:id ───────────────────────────────────────────────────
app.delete("/facturation/:id", async (req, res) => {
  try {
    await Facture.findByIdAndDelete(req.params.id);
    res.json({ message: "Facture supprimée" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "facturation" }));

app.listen(3004, () => console.log("Facturation service running on port 3004 🚀"));