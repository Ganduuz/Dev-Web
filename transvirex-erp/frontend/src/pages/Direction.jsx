import { useState, useEffect } from "react";
import { getKpiDashboard, getKpiPerformanceByHub } from "../services/api";

const formatMoney = (value) => `${Number(value || 0).toLocaleString("fr-FR")}€`;
const formatCount = (value) => `${value ?? 0}`;

export default function Direction() {
  const [kpi, setKpi] = useState(null);
  const [perf, setPerf] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getKpiDashboard(), getKpiPerformanceByHub()])
      .then(([dashboard, performance]) => {
        setKpi(dashboard.data);
        setPerf(performance.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const latest = kpi?.kpiHistorique?.[0] || null;

  if (loading) return <div className="loading"><div className="spinner"/> Chargement des KPIs...</div>;
  if (!kpi) return <div className="empty-state"><div className="icon">📊</div><p>Données non disponibles</p></div>;

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">📊 Tableau de bord Direction</span>
        <span style={{ fontSize: 12, color: "var(--gray)" }}>Résumé des KPI et des statistiques admin</span>
      </div>

      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">📦</div>
            <div>
              <div className="stat-value">{formatCount(kpi.livraisons?.total)}</div>
              <div className="stat-label">Total livraisons</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">✅</div>
            <div>
              <div className="stat-value">{formatMoney(kpi.facturation?.revenuPaye)}</div>
              <div className="stat-label">Revenu payé</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon amber">⏳</div>
            <div>
              <div className="stat-value">{formatCount(kpi.facturation?.enAttente?.count)}</div>
              <div className="stat-label">En attente · {formatMoney(kpi.facturation?.enAttente?.montant)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">⚠️</div>
            <div>
              <div className="stat-value">{formatCount(kpi.facturation?.enRetard?.count)}</div>
              <div className="stat-label">En retard · {formatMoney(kpi.facturation?.enRetard?.montant)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">💰</div>
            <div>
              <div className="stat-value">{formatMoney(kpi.facturation?.revenuTotal)}</div>
              <div className="stat-label">Revenu total</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">🚗</div>
            <div>
              <div className="stat-value">{formatCount(kpi.chauffeurs?.actifs)}</div>
              <div className="stat-label">Chauffeurs actifs</div>
            </div>
          </div>
        </div>

        {latest && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">📅 Dernière période KPI</div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon blue">⏱</div>
                <div>
                  <div className="stat-value">{latest.On_Time_Delivery_Percent ?? 0}%</div>
                  <div className="stat-label">Livraisons à l'heure</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon amber">⭐</div>
                <div>
                  <div className="stat-value">{latest.Customer_Satisfaction ?? 0}/5</div>
                  <div className="stat-label">Satisfaction client</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon blue">🚗</div>
                <div>
                  <div className="stat-value">{latest.Active_Drivers ?? 0}</div>
                  <div className="stat-label">Chauffeurs actifs</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon red">⚠️</div>
                <div>
                  <div className="stat-value">{latest.Incidents_Count ?? 0}</div>
                  <div className="stat-label">Incidents</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon green">💶</div>
                <div>
                  <div className="stat-value">{formatMoney(latest.Revenue)}</div>
                  <div className="stat-label">Revenus période</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
          <div className="card">
            <div className="card-title">🚚 Livraisons par statut</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {Object.entries(kpi.livraisons.byStatut || {}).map(([statut, count]) => (
                <div key={statut} style={{ minWidth: 120, background: "var(--gray-l)", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--navy)" }}>{count}</div>
                  <div style={{ fontSize: 12, color: "var(--gray)" }}>{statut}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">📦 Priorités</div>
            {Object.entries(kpi.livraisons.byPriorite || {}).map(([priority, count]) => (
              <div key={priority} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span>{priority}</span>
                <span className="badge badge-blue">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="card">
            <div className="card-title">🏢 Hubs les plus sollicités</div>
            {Object.entries(kpi.livraisons.byHub || {}).map(([hub, count]) => (
              <div key={hub} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span>{hub}</span>
                <span className="badge badge-blue">{count}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">⚠️ Incidents par type</div>
            {Object.entries(kpi.incidents.byType || {}).map(([type, count]) => (
              <div key={type} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: 13 }}>
                <span>{type}</span>
                <span className="badge badge-red">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-title">🏆 Meilleurs chauffeurs</div>
          {kpi.chauffeurs.topRated.map((chauffeur, idx) => (
            <div key={chauffeur.nom || idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: ["#FFD700", "#C0C0C0", "#CD7F32"][idx], display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "white", fontSize: 16 }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{chauffeur.nom}</div>
                <div style={{ fontSize: 11, color: "var(--gray)" }}>{chauffeur.hub}</div>
              </div>
              <div style={{ color: "var(--amber)", fontWeight: 700 }}>⭐ {chauffeur.rating}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
