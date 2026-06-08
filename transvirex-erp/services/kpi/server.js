const express  = require("express");
const mongoose = require("mongoose");
global.crypto  = require("crypto");

const app = express();
app.use(express.json());

const MONGO_URL = "mongodb://mongo:27017/erp";
mongoose.connect(MONGO_URL)
  .then(() => console.log("KPI service — MongoDB connecté ✅"))
  .catch(err => console.error("MongoDB erreur ❌", err));

// Schémas
const DeliverySchema = new mongoose.Schema({}, { strict: false, collection: "deliveries" });
const IncidentSchema = new mongoose.Schema({}, { strict: false, collection: "incidents" });
const InvoiceSchema  = new mongoose.Schema({}, { strict: false, collection: "invoices" });
const DriverSchema   = new mongoose.Schema({}, { strict: false, collection: "drivers" });
const KpiSchema      = new mongoose.Schema({}, { strict: false, collection: "kpi_dashboard" });

const Delivery = mongoose.model("Delivery2", DeliverySchema);
const Incident = mongoose.model("Incident2", IncidentSchema);
const Invoice  = mongoose.model("Invoice2",  InvoiceSchema);
const Driver   = mongoose.model("Driver2",   DriverSchema);
const Kpi      = mongoose.model("Kpi",       KpiSchema);

// GET /kpi/dashboard — tableau de bord complet direction
app.get("/kpi/dashboard", async (req, res) => {
  try {
    const [deliveries, incidents, invoices, drivers, kpis] = await Promise.all([
      Delivery.find(),
      Incident.find(),
      Invoice.find(),
      Driver.find(),
      Kpi.find().sort({ Period: -1 }).limit(4),
    ]);

    // Livraisons par statut
    const byStatut = deliveries.reduce((acc, d) => {
      acc[d.Status] = (acc[d.Status] || 0) + 1;
      return acc;
    }, {});

    // Livraisons par hub
    const byHub = deliveries.reduce((acc, d) => {
      acc[d.Hub_ID] = (acc[d.Hub_ID] || 0) + 1;
      return acc;
    }, {});

    // Livraisons par priorité
    const byPriorite = deliveries.reduce((acc, d) => {
      acc[d.Priority] = (acc[d.Priority] || 0) + 1;
      return acc;
    }, {});

    // Revenue total factures
    const revenuTotal = invoices.reduce((s, i) => s + (i.Total_Amount || 0), 0);
    const revenuPaye  = invoices.filter(i => i.Status === "Payée").reduce((s, i) => s + (i.Total_Amount || 0), 0);
    const facturesEnAttente = invoices.filter(i => i.Status === "En attente");
    const facturesEnRetard = invoices.filter(i => i.Status === "en_retard" || i.Status === "En retard");

    // Incidents par type
    const incidentsByType = incidents.reduce((acc, i) => {
      acc[i.Incident_Type] = (acc[i.Incident_Type] || 0) + 1;
      return acc;
    }, {});

    // Drivers par hub
    const driversByHub = drivers.reduce((acc, d) => {
      acc[d.Hub] = (acc[d.Hub] || 0) + 1;
      return acc;
    }, {});

    res.json({
      livraisons: {
        total: deliveries.length,
        byStatut,
        byHub,
        byPriorite,
      },
      incidents: {
        total: incidents.length,
        byType: incidentsByType,
        resolus: incidents.filter(i => i.Status === "Résolu").length,
      },
      facturation: {
        revenuTotal,
        revenuPaye,
        factures: invoices.length,
        enAttente: { count: facturesEnAttente.length, montant: facturesEnAttente.reduce((s, i) => s + (i.Total_Amount || 0), 0) },
        enRetard: { count: facturesEnRetard.length, montant: facturesEnRetard.reduce((s, i) => s + (i.Total_Amount || 0), 0) },
      },
      chauffeurs: {
        total: drivers.length,
        actifs: drivers.filter(d => d.Status === "Actif").length,
        byHub: driversByHub,
        topRated: drivers.sort((a,b) => b.Rating - a.Rating).slice(0,3).map(d => ({
          nom: `${d.First_Name} ${d.Last_Name}`,
          rating: d.Rating,
          hub: d.Hub,
        })),
      },
      kpiHistorique: kpis,
    });
      incidents: {
        total: incidents.length,
        byType: incidentsByType,
        resolus: incidents.filter(i => i.Status === "Résolu").length,
      },
      facturation: {
        revenuTotal,
        revenuPaye,
        factures: invoices.length,
        enAttente: invoices.filter(i => i.Status === "En attente").length,
      },
      chauffeurs: {
        total: drivers.length,
        actifs: drivers.filter(d => d.Status === "Actif").length,
        byHub: driversByHub,
        topRated: drivers.sort((a,b) => b.Rating - a.Rating).slice(0,3).map(d => ({
          nom: `${d.First_Name} ${d.Last_Name}`,
          rating: d.Rating,
          hub: d.Hub,
        })),
      },
      kpiHistorique: kpis,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /kpi/performance-par-hub
app.get("/kpi/performance-par-hub", async (req, res) => {
  try {
    const deliveries = await Delivery.find();
    const hubs = [...new Set(deliveries.map(d => d.Hub_ID))];
    const result = hubs.map(hub => {
      const hubDeliveries = deliveries.filter(d => d.Hub_ID === hub);
      const livrees  = hubDeliveries.filter(d => d.Status === "Livrée").length;
      const incidents = hubDeliveries.filter(d => d.Status === "Incident").length;
      return {
        hub,
        total:    hubDeliveries.length,
        livrees,
        incidents,
        tauxReussite: hubDeliveries.length > 0 ? ((livrees / hubDeliveries.length) * 100).toFixed(1) : 0,
      };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("/health", (req, res) => res.json({ status: "ok", service: "kpi" }));
app.listen(3007, () => console.log("KPI service running on port 3007 🚀"));