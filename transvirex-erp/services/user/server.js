const express  = require("express");
const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
global.crypto  = require("crypto");

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "transvirex_secret_2026";
const MONGO_URL  = process.env.MONGO_URL  || "mongodb://mongo:27017/erp";

// ── Connexion MongoDB ─────────────────────────────────────────────────────────
mongoose.connect(MONGO_URL)
  .then(() => console.log("User service — MongoDB connecté ✅"))
  .catch(err => console.error("MongoDB erreur ❌", err));

// ── Modèle User ───────────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({
  nom:      { type: String, required: true },
  prenom:   { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ["chauffeur","dispatcher","facturation","direction","admin"], default: "chauffeur" },
  actif:    { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model("User", UserSchema);

// ── Middleware JWT ────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Token manquant" });
  const token = header.split(" ")[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
}

// ── POST /register ────────────────────────────────────────────────────────────
app.post("/register", async (req, res) => {
  try {
    const { nom, prenom, email, password, role } = req.body;
    if (!nom || !prenom || !email || !password)
      return res.status(400).json({ error: "Champs requis manquants" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email déjà utilisé" });

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ nom, prenom, email, password: hashed, role });
    res.status(201).json({ id: user._id, email: user.email, nom: user.nom, prenom: user.prenom, role: user.role });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /login ───────────────────────────────────────────────────────────────
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, actif: true });
    if (!user) return res.status(401).json({ error: "Identifiants invalides" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Identifiants invalides" });

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    res.json({ token, user: { id: user._id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET / — liste tous les users ──────────────────────────────────────────────
app.get("/", authMiddleware, async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    const users = await User.find(filter).select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /me — profil courant ──────────────────────────────────────────────────
app.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /:id ──────────────────────────────────────────────────────────────────
app.get("/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /:id — modifier ───────────────────────────────────────────────────────
app.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { nom, prenom, email, role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { nom, prenom, email, role },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id ───────────────────────────────────────────────────────────────
app.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "Utilisateur supprimé" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "user" }));

app.listen(3001, () => console.log("User service running on port 3001 🚀"));
