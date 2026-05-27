const express = require("express");
const app = express();

app.use(express.json());
const crypto = require("crypto");
let missions = [];

// CREATE mission
app.post("/missions", (req, res) => {
    const mission = {
        id: missions.length + 1,
        ...req.body
    };
    missions.push(mission);
    res.json(mission);
});

// GET missions
app.get("/missions", (req, res) => {
    res.json(missions);
});

app.listen(3002, () => {
    console.log("Mission service running on 3002");
});