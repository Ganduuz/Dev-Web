const express = require("express");
const axios = require("axios");
global.crypto = require("crypto");
const app = express();
app.use(express.json());

const forward = (serviceUrl) => async (req, res) => {
    try {
        const path = req.originalUrl.replace(/^\/[^/]+/, "");

        const response = await axios({
            method: req.method,
            url: serviceUrl + path,
            data: req.body
        });

        res.json(response.data);
    } catch (err) {
        res.status(500).json({
            error: err.response?.data || err.message
        });
    }
};

app.get("/", (req, res) => {
    res.json({ message: "Gateway OK 🚀" });
});

app.use("/users", forward("http://user:3001"));
app.use("/missions", forward("http://mission:3002"));
app.use("/facturation", forward("http://facturation:3004"));
app.use("/tracking", forward("http://tracking:3003"));
app.use("/notification", forward("http://notification:3005"));

app.listen(3000, () => {
    console.log("Gateway running on port 3000");
});