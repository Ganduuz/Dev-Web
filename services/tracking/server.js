const express = require("express");
const app = express();

app.use(express.json());

let trackingData = [];

// TEST SERVICE
app.get("/", (req, res) => {
    res.json({ status: "Tracking service OK 🚀" });
});

// GET tracking
app.get("/tracking", (req, res) => {
    res.json(trackingData);
});

// UPDATE tracking (ex: position chauffeur)
app.post("/tracking", (req, res) => {
    const update = {
        id: trackingData.length + 1,
        timestamp: new Date(),
        ...req.body
    };

    trackingData.push(update);
    res.json(update);
});

app.listen(3003, () => {
    console.log("Tracking service running on 3003");
});