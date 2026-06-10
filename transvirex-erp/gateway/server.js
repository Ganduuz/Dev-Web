const express = require("express");
const axios   = require("axios");
global.crypto = require("crypto");
const http = require("http");

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
// Remplace forwardFull par cette version améliorée
const forwardFull = (serviceUrl) => async (req, res) => {
  try {
    const isDownload = req.originalUrl.includes("/download-pdf");
    const response = await axios({
      method:  req.method,
      url:     serviceUrl + req.originalUrl,
      data:    req.body,
      headers: { ...req.headers, Authorization: req.headers.authorization || "" },
      responseType: isDownload ? "arraybuffer" : "json",
    });

    if (isDownload) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", response.headers["content-disposition"] || "attachment");
      return res.status(response.status).send(Buffer.from(response.data));
    }

    res.status(response.status).json(response.data);

  } catch (err) {
    const status = err.response?.status || 500;
    const data = err.response?.data;

    let errorMsg;
    if (data instanceof ArrayBuffer || Buffer.isBuffer(data)) {
      try { errorMsg = JSON.parse(Buffer.from(data).toString()).error; }
      catch { errorMsg = "Erreur serveur"; }
    } else if (typeof data === "object" && data !== null) {
      errorMsg = data.error || JSON.stringify(data);
    } else {
      errorMsg = data || err.message;
    }

    res.status(status).json({ error: errorMsg });
  }
};
app.get("/", (req, res) => res.json({ message: "Transvirex Gateway 🚀", version: "2.0.0" }));
app.get("/facturation/:id/download-pdf", (req, res) => {
  const url = `http://facturation:3004${req.originalUrl}`;
  http.get(url, { headers: { authorization: req.headers.authorization || "" } }, (proxyRes) => {
    if (proxyRes.statusCode === 404) {
      return res.status(404).json({ error: "PDF non trouvé" });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", proxyRes.headers["content-disposition"] || `attachment; filename="facture.pdf"`);
    res.status(proxyRes.statusCode);
    proxyRes.pipe(res);
  }).on("error", (err) => {
    res.status(500).json({ error: err.message });
  });
});
app.use("/users",        forwardStrip("/users",   "http://user:3001"));
app.use("/missions",     forwardFull("http://mission:3002"));
app.use("/tracking",     forwardFull("http://tracking:3003"));
app.use("/facturation", forwardFull("http://facturation:3004"));
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