import { useState, useEffect } from "react";
import { getMissions, getFactureStats, getTrackingStats } from "../services/api";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API_BASE = "http://localhost:3000";

const STATUT_BADGE = {
  en_attente:"badge-gray", assignee:"badge-blue", en_cours:"badge-amber",
  livree:"badge-green", incident:"badge-red", annulee:"badge-gray",
  "Livrée":"badge-green", "En cours":"badge-amber", "En attente":"badge-gray",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [missions,   setMissions]   = useState([]);
  const [kpi,        setKpi]        = useState(null);
  const [factStats,  setFactStats]  = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      getMissions().catch(() => ({ data: [] })),
      getFactureStats().catch(() => null),
      axios.get(`${API_BASE}/kpi/dashboard`, { headers }).catch(() => null),
    ]).then(([m, f, k]) => {
      setMissions(m.data);
      setFactStats(f?.data || null);
      setKpi(k?.data || null);
    }).finally(() => setLoading(false));
  }, []);

  const enCours   = missions.filter(m => m.statut === "en_cours").length;
  const livrees   = missions.filter(m => m.statut === "livree").length;
  const incidents = missions.filter(m => m.statut === "incident").length;
  const recentes  = [...missions].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0,5);

  if (loading) return <div className="loading"><div className="spinner"/> Chargement...</div>;

  const isDirection = ["direction","admin"].includes(user?.role);

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">Bonjour, {user?.prenom} 👋</span>
        <span style={{ fontSize:12, color:"var(--gray)" }}>
          {new Date().toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
        </span>
      </div>

      <div className="page-content">

        {/* ── KPIs historiques (direction) ──────────────────────────────── */}
        {isDirection && kpi?.kpiHistorique?.[0] && (
          <div style={{ marginBottom:24 }}>
            <h3 style={{ fontFamily:"var(--font-head)", color:"var(--navy)", fontSize:14, marginBottom:12 }}>
              📊 KPIs — Dernière période
            </h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">📦</div>
                <div>
                  <div className="stat-value">{kpi.kpiHistorique[0].Total_Deliveries?.toLocaleString()}</div>
                  <div className="stat-label">Livraisons totales</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">⏱</div>
                <div>
                  <div className="stat-value">{kpi.kpiHistorique[0].On_Time_Delivery_Percent}%</div>
                  <div className="stat-label">Livraisons à l'heure</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon amber">⭐</div>
                <div>
                  <div className="stat-value">{kpi.kpiHistorique[0].Customer_Satisfaction}/5</div>
                  <div className="stat-label">Satisfaction client</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">💰</div>
                <div>
                  <div className="stat-value">{(kpi.kpiHistorique[0].Revenue/1000).toFixed(0)}k€</div>
                  <div className="stat-label">Revenus</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue">🚗</div>
                <div>
                  <div className="stat-value">{kpi.kpiHistorique[0].Active_Drivers}</div>
                  <div className="stat-label">Chauffeurs actifs</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red">⚠️</div>
                <div>
                  <div className="stat-value">{kpi.kpiHistorique[0].Incidents_Count}</div>
                  <div className="stat-label">Incidents</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Stats ERP temps réel ──────────────────────────────────────── */}
        <h3 style={{ fontFamily:"var(--font-head)", color:"var(--navy)", fontSize:14, marginBottom:12 }}>
          🚚 Missions — Temps réel
        </h3>
        <div className="stats-grid" style={{ marginBottom:24 }}>
          <div className="stat-card">
            <div className="stat-icon blue">📋</div>
            <div><div className="stat-value">{missions.length}</div><div className="stat-label">Total missions</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">⏳</div>
            <div><div className="stat-value">{enCours}</div><div className="stat-label">En cours</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div><div className="stat-value">{livrees}</div><div className="stat-label">Livrées</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">⚠️</div>
            <div><div className="stat-value">{incidents}</div><div className="stat-label">Incidents</div></div>
          </div>
          {factStats && <>
            <div className="stat-card">
              <div className="stat-icon amber">💶</div>
              <div>
                <div className="stat-value">{factStats.enAttente?.montant?.toFixed(0) || 0}€</div>
                <div className="stat-label">En attente facturation ({factStats.enAttente?.count})</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">💰</div>
              <div>
                <div className="stat-value">{factStats.payees?.montant?.toFixed(0) || 0}€</div>
                <div className="stat-label">Facturé & payé ({factStats.payees?.count})</div>
              </div>
            </div>
          </>}
        </div>

        <div style={{ display:"grid", gridTemplateColumns: isDirection ? "1fr 1fr" : "1fr", gap:20 }}>
          {/* ── Missions récentes ──────────────────────────────────────── */}
          <div className="card">
            <div className="card-title">📋 Missions récentes</div>
            {recentes.length === 0 ? (
              <div className="empty-state"><div className="icon">🚚</div><p>Aucune mission</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Référence</th>
                      <th>Client</th>
                      <th>Statut</th>
                      <th>Priorité</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentes.map(m => (
                      <tr key={m._id}>
                        <td><b>{m.reference}</b></td>
                        <td>{m.clientNom}</td>
                        <td><span className={`badge ${STATUT_BADGE[m.statut] || "badge-gray"}`}>{m.statut}</span></td>
                        <td><span className={`badge ${m.priorite==="urgente"?"badge-red":m.priorite==="haute"?"badge-amber":"badge-gray"}`}>{m.priorite}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Top chauffeurs (direction) ──────────────────────────────── */}
          {isDirection && kpi?.chauffeurs && (
            <div className="card">
              <div className="card-title">🏆 Top chauffeurs</div>
              {kpi.chauffeurs.topRated.map((c, i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", background:"var(--blue-light)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"var(--blue)", fontSize:14 }}>
                    {i+1}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>{c.nom}</div>
                    <div style={{ fontSize:11, color:"var(--gray)" }}>{c.hub}</div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:4, color:"var(--amber)", fontWeight:700 }}>
                    ⭐ {c.rating}
                  </div>
                </div>
              ))}

              <div style={{ marginTop:16 }}>
                <div className="card-title">🏢 Chauffeurs par hub</div>
                {Object.entries(kpi.chauffeurs.byHub).map(([hub, count]) => (
                  <div key={hub} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid var(--border)", fontSize:13 }}>
                    <span>{hub}</span>
                    <span className="badge badge-blue">{count} chauffeurs</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Livraisons par hub (direction) ───────────────────────────── */}
        {isDirection && kpi?.livraisons && (
          <div className="card" style={{ marginTop:20 }}>
            <div className="card-title">📍 Livraisons par statut</div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {Object.entries(kpi.livraisons.byStatut).map(([statut, count]) => (
                <div key={statut} style={{ background:"var(--gray-l)", borderRadius:8, padding:"10px 16px", textAlign:"center" }}>
                  <div style={{ fontWeight:700, fontSize:18, color:"var(--navy)" }}>{count}</div>
                  <div style={{ fontSize:11, color:"var(--gray)" }}>{statut}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
