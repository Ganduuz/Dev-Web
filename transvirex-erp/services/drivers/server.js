const express  = require("express");
const mongoose = require("mongoose");
global.crypto  = require("crypto");

const app = express();
app.use(express.json());

const MONGO_URL = process.env.MONGO_URL || "mongodb://mongo:27017/erp";
mongoose.connect(MONGO_URL)
  .then(() => console.log("Drivers service — MongoDB connecté ✅"))
  .catch(err => console.error("MongoDB erreur ❌", err));

const DriverSchema = new mongoose.Schema({
  Driver_ID:     String,
  First_Name:    String,
  Last_Name:     String,
  Phone:         String,
  Email:         String,
  Vehicle_Type:  String,
  License_Plate: String,
  Status:        { type: String, default: "Actif" },
  Hub:           String,
  Join_Date:     Date,
  Rating:        Number,
  userId:        String, // lien avec le compte user
}, { timestamps: true });

const Driver = mongoose.model("Driver", DriverSchema);

// GET /drivers/stats
app.get("/drivers/stats", async (req, res) => {
  try {
    const total  = await Driver.countDocuments();
    const actifs = await Driver.countDocuments({ Status: "Actif" });
    const byHub  = await Driver.aggregate([{ $group: { _id: "$Hub", count: { $sum: 1 } } }]);
    const avgRating = await Driver.aggregate([{ $group: { _id: null, avg: { $avg: "$Rating" } } }]);
    res.json({ total, actifs, byHub, avgRating: avgRating[0]?.avg?.toFixed(1) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /drivers
app.get("/drivers", async (req, res) => {
  try {
    const { status, hub } = req.query;
    const filter = {};
    if (status) filter.Status = status;
    if (hub)    filter.Hub    = hub;
    const drivers = await Driver.find(filter).sort({ Rating: -1 });
    res.json(drivers);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /drivers/:id
app.get("/drivers/:id", async (req, res) => {
  try {
    const driver = await Driver.findOne({ Driver_ID: req.params.id }) || await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ error: "Chauffeur non trouvé" });
    res.json(driver);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /drivers
app.post("/drivers", async (req, res) => {
  try {
    const driver = await Driver.create(req.body);
    res.status(201).json(driver);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /drivers/:id
app.put("/drivers/:id", async (req, res) => {
  try {
    const driver = await Driver.findOneAndUpdate(
      { Driver_ID: req.params.id },
      req.body,
      { new: true }
    );
    res.json(driver);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "drivers" }));
app.listen(3006, () => console.log("Drivers service running on port 3006 🚀"));