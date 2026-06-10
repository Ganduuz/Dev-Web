const express  = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
global.crypto  = require("crypto");

const { generateFacturePDF, getArchivedPDF } = require("./pdf-generator");
const FacturationAIAnalyzer = require("./ai-analyzer");

const app = express();
app.use(express.json());

// ✅ FIX Bug #2 : CORS manuel (pas besoin de dépendance)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.use(express.static(path.join(__dirname, "../../archives")));

const MONGO_URL = process.env.MONGO_URL || "mongodb://mongo:27017/erp";

mongoose.connect(MONGO_URL)
  .then(() => console.log("Facturation service — MongoDB connecté ✅"))
  .catch(err => console.error("MongoDB erreur ❌", err));

const FactureSchema = new mongoose.Schema({
  reference:    { type: String, unique: true },
  missionId:    { type: String, required: true, unique: true },
  clientNom:    { type: String, required: true },
  clientAdresse: { type: String },
  montant:      { type: Number, required: true },
  tva:          { type: Number, default: 20 },
  statut:       { type: String, enum: ["en_attente","envoyee","payee","en_retard","annulee"], default: "en_attente" },
  dateEcheance: { type: Date },
  datePaiement: { type: Date },
  notes:        { type: String },
  relances:     [{ message: String, date: { type: Date, default: Date.now } }],
  pdfFilename:  { type: String },
  pdfUrl:       { type: String },
  lignes:       [{ description: String, quantite: Number, prixUnitaire: Number }],
  analysisResult: {
    confidence: Number,
    errors: [String],
    warnings: [String],
    timestamp: Date,
  },
}, { timestamps: true });

FactureSchema.pre("save", async function () {
  if (!this.reference) {
    const count = await mongoose.model("Facture").countDocuments();
    this.reference = `FAC-${String(count + 1).padStart(4, "0")}`;
  }
});

const Facture = mongoose.model("Facture", FactureSchema);

// ════════════════════════════════════════════════════════════
// ✅ FIX Bug #1 : Routes STATIQUES en premier, /:id en dernier
// ════════════════════════════════════════════════════════════

// ── Health ────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", service: "facturation" }));

// ── GET /facturation/stats ────────────────────────────────
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /facturation/analyze ← AVANT /:id ───────────────
app.post("/facturation/analyze", async (req, res) => {
  try {
    const corrected = FacturationAIAnalyzer.autoCorrect(req.body);
    const analysis  = FacturationAIAnalyzer.analyzeFormData(corrected);
    res.json({
      isValid:    analysis.isValid,
      confidence: analysis.confidence,
      errors:     analysis.errors,
      warnings:   analysis.warnings,
      cleanData:  analysis.cleanData,
      message:    analysis.isValid
        ? `✅ Données valides (confiance: ${analysis.confidence}%)`
        : `❌ Erreurs détectées (confiance: ${analysis.confidence}%)`,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /facturation/pdfs/list ← AVANT /:id ──────────────
app.get("/facturation/pdfs/list", async (req, res) => {
  try {
    const factures = await Facture.find({ pdfFilename: { $exists: true, $ne: null } })
      .select("reference clientNom montant pdfFilename pdfUrl createdAt")
      .sort({ createdAt: -1 });
    res.json({ total: factures.length, pdfs: factures });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /facturation ──────────────────────────────────────
app.get("/facturation", async (req, res) => {
  try {
    const filter = req.query.statut ? { statut: req.query.statut } : {};
    const factures = await Facture.find(filter).sort({ createdAt: -1 });
    res.json(factures);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /facturation ─────────────────────────────────────
// ── POST /facturation ─────────────────────────────────────
app.post("/facturation", async (req, res) => {
  try {
    const { missionId, clientNom, montant, clientAdresse, tva, notes, dateEcheance, lignes } = req.body;
    if (!missionId || !clientNom || !montant)
      return res.status(400).json({ error: "missionId, clientNom et montant requis" });

    const facture = await Facture.create({
      missionId, clientNom, montant, clientAdresse, tva, notes, dateEcheance, lignes
    });

    // ✅ Recharger depuis la DB pour avoir la référence générée par pre("save")
    const factureComplete = await Facture.findById(facture._id);

    // Générer le PDF avec la bonne référence
    try {
      const pdfResult = await generateFacturePDF({
        reference:     factureComplete.reference,  // ✅ plus undefined
        clientNom:     factureComplete.clientNom,
        clientAdresse: factureComplete.clientAdresse || "Non spécifiée",
        montant:       factureComplete.montant,
        tva:           factureComplete.tva || 20,
        dateCreation:  factureComplete.createdAt,
        dateEcheance:  factureComplete.dateEcheance,
        notes:         factureComplete.notes,
        lignes:        factureComplete.lignes || [],
      });

      const pdfUrl = `/factures/${pdfResult.filename}`;
      await Facture.findByIdAndUpdate(facture._id, {
        pdfFilename: pdfResult.filename,
        pdfUrl,
      });
      factureComplete.pdfUrl      = pdfUrl;
      factureComplete.pdfFilename = pdfResult.filename;
    } catch (pdfErr) {
      console.error("PDF auto-génération échouée:", pdfErr.message);
    }

    res.status(201).json(factureComplete);
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ error: "Facture déjà existante pour cette mission" });
    res.status(500).json({ error: err.message });
  }
});

// ── GET /facturation/:id ──────────────────────────────────
app.get("/facturation/:id", async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id);
    if (!facture) return res.status(404).json({ error: "Facture non trouvée" });
    res.json(facture);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PATCH /facturation/:id/statut ────────────────────────
app.patch("/facturation/:id/statut", async (req, res) => {
  try {
    const { statut } = req.body;
    const update = { statut };
    if (statut === "payee") update.datePaiement = new Date();
    const facture = await Facture.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!facture) return res.status(404).json({ error: "Facture non trouvée" });
    res.json(facture);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /facturation/:id/relances ────────────────────────
app.post("/facturation/:id/relances", async (req, res) => {
  try {
    const facture = await Facture.findByIdAndUpdate(
      req.params.id,
      { $push: { relances: { message: req.body.message } }, statut: "en_retard" },
      { new: true }
    );
    if (!facture) return res.status(404).json({ error: "Facture non trouvée" });
    res.json(facture);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /facturation/:id/generate-pdf ───────────────────
app.post("/facturation/:id/generate-pdf", async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id);
    if (!facture) return res.status(404).json({ error: "Facture non trouvée" });

    const pdfResult = await generateFacturePDF({
      reference:     facture.reference,
      clientNom:     facture.clientNom,
      clientAdresse: facture.clientAdresse || "Non spécifiée",
      montant:       facture.montant,
      tva:           facture.tva || 20,
      dateCreation:  facture.createdAt,
      dateEcheance:  facture.dateEcheance,
      notes:         facture.notes,
      lignes:        facture.lignes || [],
    });

    const pdfUrl = `/factures/${pdfResult.filename}`;
    await Facture.findByIdAndUpdate(req.params.id, {
      pdfFilename: pdfResult.filename,
      pdfUrl,
    });

    res.json({ success: true, message: "PDF généré avec succès", pdfUrl, filename: pdfResult.filename });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /facturation/:id/download-pdf ────────────────────
app.get("/facturation/:id/download-pdf", async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id);
    if (!facture || !facture.pdfFilename)
      return res.status(404).json({ error: "PDF non disponible pour cette facture" });

    const pdfPath = getArchivedPDF(facture.pdfFilename);
    if (!pdfPath || !fs.existsSync(pdfPath))
      return res.status(404).json({ error: "Fichier PDF non trouvé sur le disque" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${facture.reference}.pdf"`);
    fs.createReadStream(pdfPath).pipe(res);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /facturation/:id/validate ───────────────────────
app.post("/facturation/:id/validate", async (req, res) => {
  try {
    const facture = await Facture.findById(req.params.id);
    if (!facture) return res.status(404).json({ error: "Facture non trouvée" });

    const analysis = FacturationAIAnalyzer.analyzeFormData({
      clientNom:     facture.clientNom,
      clientAdresse: facture.clientAdresse,
      montant:       facture.montant,
      dateEcheance:  facture.dateEcheance,
      notes:         facture.notes,
      lignes:        facture.lignes,
      tva:           facture.tva,
    });

    await Facture.findByIdAndUpdate(req.params.id, {
      analysisResult: {
        confidence: analysis.confidence,
        errors:     analysis.errors,
        warnings:   analysis.warnings,
        timestamp:  new Date(),
      },
    });

    res.json({
      isValid:    analysis.isValid,
      confidence: analysis.confidence,
      errors:     analysis.errors,
      warnings:   analysis.warnings,
      facture:    FacturationAIAnalyzer.generateSummary(facture),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /facturation/:id ───────────────────────────────
app.delete("/facturation/:id", async (req, res) => {
  try {
    await Facture.findByIdAndDelete(req.params.id);
    res.json({ message: "Facture supprimée" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Facturation service running on port ${PORT} 🚀`));