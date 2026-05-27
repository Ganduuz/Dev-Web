const express = require("express");
const app = express();

app.use(express.json());

let factures = [];

// TEST ROUTE (très important)
app.get("/", (req, res) => {
    res.json({ status: "Facturation service OK 🚀" });
});

// GET facturations
app.get("/facturation", (req, res) => {
    res.json(factures);
});

// CREATE facturation
app.post("/facturation", (req, res) => {
    const facture = {
        id: factures.length + 1,
        ...req.body
    };
    factures.push(facture);
    res.json(facture);
});

app.listen(3004, () => {
    console.log("Facturation service running on 3004");
});