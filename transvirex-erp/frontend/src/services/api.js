import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:3000" });
// ── Interceptor : ajoute le token JWT automatiquement ────────────────────────
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login    = (data) => API.post("/users/login",    data);
export const register = (data) => API.post("/users/register", data);
export const getMe    = ()     => API.get("/users/me");

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers      = (params) => API.get("/users",      { params });
export const getUser       = (id)     => API.get(`/users/${id}`);
export const updateUser    = (id, d)  => API.put(`/users/${id}`, d);
export const deleteUser    = (id)     => API.delete(`/users/${id}`);

// ── Missions ──────────────────────────────────────────────────────────────────
export const getMissions       = (params) => API.get("/missions",                    { params });
export const getMission        = (id)     => API.get(`/missions/${id}`);
export const createMission     = (data)   => API.post("/missions",                   data);
export const updateStatut      = (id, s)  => API.patch(`/missions/${id}/statut`,     { statut: s });
export const assignerMission   = (id, d)  => API.patch(`/missions/${id}/assigner`,   d);
export const signalerIncident  = (id, d)  => API.post(`/missions/${id}/incidents`,   d);
export const deleteMission     = (id)     => API.delete(`/missions/${id}`);

// ── Drivers / Chauffeurs ──────────────────────────────────────────────────────────────────
export const getDrivers       = (params) => API.get("/drivers", { params });
export const getDriver        = (id)     => API.get(`/drivers/${id}`);

// ── Tracking ──────────────────────────────────────────────────────────────────
export const getTracking          = (params) => API.get("/tracking",                          { params });
export const getTrackingMission   = (id)     => API.get(`/tracking/mission/${id}`);
export const getTrackingChauffeur = (id)     => API.get(`/tracking/chauffeur/${id}/derniere`);
export const addTracking          = (data)   => API.post("/tracking",                         data);
export const getTrackingStats     = ()       => API.get("/tracking/stats");
export const getKpiDashboard      = ()       => API.get("/kpi/dashboard");
export const getKpiPerformanceByHub = ()     => API.get("/kpi/performance-par-hub");

// ── Facturation ───────────────────────────────────────────────────────────────
export const getFactures     = (params) => API.get("/facturation",              { params });
export const getFacture      = (id)     => API.get(`/facturation/${id}`);
export const getFactureStats = ()       => API.get("/facturation/stats");
export const createFacture   = (data)   => API.post("/facturation",             data);
export const updateFactStatut= (id, s)  => API.patch(`/facturation/${id}/statut`, { statut: s });
export const addRelance      = (id, d)  => API.post(`/facturation/${id}/relances`, d);
export const deleteFacture   = (id)     => API.delete(`/facturation/${id}`);export const analyzeFactureData = (data) => API.post("/facturation/analyze", data);
export const generateFacturePDF = (id) => API.post(`/facturation/${id}/generate-pdf`);
export const downloadFacturePDF = (id) => API.get(`/facturation/${id}/download-pdf`, { responseType: "blob" });
export const validateFacture = (id) => API.post(`/facturation/${id}/validate`);
export const listArchivedPDFs = () => API.get("/facturation/pdfs/list");
export const getCompletedMissions = () => API.get("/missions", { params: { statut: "livree" } });

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications  = (userId, role) => API.get(`/notification/user/${userId}`, { params: { role } });
export const marquerLu         = (id)     => API.patch(`/notification/${id}/lire`);
export const toutMarquerLu     = (userId, role) => API.patch(`/notification/user/${userId}/tout-lire`, null, { params: { role } });
export const createNotification= (data)   => API.post("/notification",            data);
