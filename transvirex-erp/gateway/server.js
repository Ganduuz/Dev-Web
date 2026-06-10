const express = require("express");
const axios   = require("axios");
global.crypto = require("crypto");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin",  "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Strip prefix pour user (/users/login → /login)
const forwardStrip = (prefix, serviceUrl) => async (req, res) => {
  try {
    const path = req.originalUrl.replace(prefix, "") || "/";
    const response = await axios({
      method:  req.method,
      url:     serviceUrl + path,
      data:    req.body,
      headers: { ...req.headers, Authorization: req.headers.authorization || "" },
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    const errorBody = err.response?.data;
    const errorMessage = typeof errorBody === "object"
      ? errorBody.error || JSON.stringify(errorBody)
      : errorBody || err.message;
    res.status(status).json({ error: errorMessage });
  }
};

// Garde le chemin complet
const forwardFull = (serviceUrl) => async (req, res) => {
  try {
    const response = await axios({
      method:  req.method,
      url:     serviceUrl + req.originalUrl,
      data:    req.body,
      headers: { ...req.headers, Authorization: req.headers.authorization || "" },
    });
    res.status(response.status).json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json({ error: err.response?.data || err.message });
  }
};

app.get("/", (req, res) => res.json({ message: "Transvirex Gateway 🚀", version: "2.0.0" }));

app.use("/users",        forwardStrip("/users",   "http://user:3001"));
app.use("/missions",     forwardFull("http://mission:3002"));
app.use("/tracking",     forwardFull("http://tracking:3003"));
app.use("/facturation",  forwardFull("http://facturation:3004"));
app.use("/notification", forwardFull("http://notification:3005"));
app.use("/drivers",      forwardFull("http://drivers:3006"));
app.use("/kpi",          forwardFull("http://kpi:3007"));

app.get("/health", async (req, res) => {
  const services = {
    user:         "http://user:3001/health",
    mission:      "http://mission:3002/health",
    tracking:     "http://tracking:3003/health",
    facturation:  "http://facturation:3004/health",
    notification: "http://notification:3005/health",
    drivers:      "http://drivers:3006/health",
    kpi:          "http://kpi:3007/health",
  };
  const results = {};
  for (const [name, url] of Object.entries(services)) {
    try {
      await axios.get(url, { timeout: 2000 });
      results[name] = "ok";
    } catch {
      results[name] = "down";
    }
  }
  res.json({ gateway: "ok", services: results });
});

app.listen(3000, () => console.log("Gateway v2.0 running on port 3000 🚀"));