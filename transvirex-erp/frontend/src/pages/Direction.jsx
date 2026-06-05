import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://localhost:3000";

export default function Direction() {
  const [kpi,     setKpi]     = useState(null);
  const [perf,    setPerf]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      axios.get(`${API_BASE}/kpi/dashboard`,           { headers }),
      axios.get(`${API_BASE}/kpi/performance-par-hub`, { headers }),
    ]).then(([k, p]) => {
      setKpi(k.data);
      setPerf(p.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner"/> Chargement des KPIs...</div>;
  if (!kpi)    return <div className="empty-state"><div className="icon">📊</div><p>Données non disponibles</p></div>;

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">📊 Tableau de bord Direction</span>
        <span style={{fontSize:12,color:"var(--gray)"}}>Données temps réel</span>
      </div>

      <div className="page-content">

        {/* KPI historique */}
        {kpi.kpiHistorique?.length > 0 && (
          <div className="card" style={{ marginBottom:20 }}>
            <div className="card-title">📅 Historique des KPIs</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Période</th>
                    <th>Livraisons</th>
                    <th>À l'heure (%)</th>
                    <th>Temps moyen (h)</th>
                    <th>Satisfaction</th>
                    <th>Revenus</th>
                    <th>Chauffeurs actifs</th>
                    <th>Incidents</th>
                  </tr>
                </thead>
                <tbody>
                  {kpi.kpiHistorique.map((k, i) => (
                    <tr key={i}>
                      <td><b>{typeof k.Period === "string" ? k.Period : new Date(k.Period).toLocaleDateString("fr-FR", {month:"long",year:"numeric"})}</b></td>
                      <td>{k.Total_Deliveries?.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${k.On_Time_Delivery_Percent >= 95 ? "badge-green" : k.On_Time_Delivery_Percent >= 90 ? "badge-amber" : "badge-red"}`}>
                          {k.On_Time_Delivery_Percent}%
                        </span>
                      </td>
                      <td>{k.Average_Delivery_Time_h}h</td>
                      <td><span style={{color:"var(--amber)",fontWeight:700}}>⭐ {k.Customer_Satisfaction}</span></td>
                      <td><b>{k.Revenue?.toLocaleString()}€</b></td>
                      <td>{k.Active_Drivers}</td>
                      <td><span className={`badge ${k.Incidents_Count > 20 ? "badge-red" : "badge-amber"}`}>{k.Incidents_Count}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
          {/* Performance par hub */}
          <div className="card">
            <div className="card-title">🏢 Performance par hub</div>
            {perf.map((h, i) => (
              <div key={i} style={{ padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontWeight:600, fontSize:13 }}>{h.hub}</span>
                  <span className={`badge ${parseFloat(h.tauxReussite) >= 90 ? "badge-green" : "badge-amber"}`}>
                    {h.tauxReussite}%
                  </span>
                </div>
                <div style={{ display:"flex", gap:12, fontSize:12, color:"var(--gray)" }}>
                  <span>📦 {h.total} total</span>
                  <span style={{color:"var(--accent)"}}>✅ {h.livrees} livrées</span>
                  <span style={{color:"var(--red)"}}>⚠️ {h.incidents} incidents</span>
                </div>
                {/* Barre de progression */}
                <div style={{ marginTop:6, background:"var(--gray-l)", borderRadius:4, height:6, overflow:"hidden" }}>
                  <div style={{ width:`${h.tauxReussite}%`, background:"var(--accent)", height:"100%", borderRadius:4, transition:"width 0.5s" }}/>
                </div>
              </div>
            ))}
          </div>

          {/* Facturation */}
          <div className="card">
            <div className="card-title">💶 Facturation</div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { label:"Revenu total", value:`${kpi.facturation.revenuTotal?.toLocaleString()}€`, icon:"💰", color:"var(--navy)" },
                { label:"Revenu payé",  value:`${kpi.facturation.revenuPaye?.toLocaleString()}€`,  icon:"✅", color:"var(--accent)" },
                { label:"Factures",     value:kpi.facturation.factures,                             icon:"📄", color:"var(--blue)" },
                { label:"En attente",   value:kpi.facturation.enAttente,                            icon:"⏳", color:"var(--amber)" },
              ].map((item, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                  <span style={{ fontSize:13, color:"var(--gray)" }}>{item.icon} {item.label}</span>
                  <span style={{ fontWeight:700, color:item.color, fontSize:15 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
          {/* Incidents */}
          <div className="card">
            <div className="card-title">⚠️ Incidents</div>
            <div style={{ display:"flex", gap:16, marginBottom:16 }}>
              <div style={{ textAlign:"center", flex:1, background:"var(--red-l)", borderRadius:8, padding:12 }}>
                <div style={{ fontSize:28, fontWeight:800, color:"var(--red)" }}>{kpi.incidents.total}</div>
                <div style={{ fontSize:11, color:"var(--gray)" }}>Total</div>
              </div>
              <div style={{ textAlign:"center", flex:1, background:"var(--accent-l)", borderRadius:8, padding:12 }}>
                <div style={{ fontSize:28, fontWeight:800, color:"var(--accent)" }}>{kpi.incidents.resolus}</div>
                <div style={{ fontSize:11, color:"var(--gray)" }}>Résolus</div>
              </div>
            </div>
            {Object.entries(kpi.incidents.byType || {}).map(([type, count]) => (
              <div key={type} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid var(--border)", fontSize:13 }}>
                <span>{type}</span>
                <span className="badge badge-red">{count}</span>
              </div>
            ))}
          </div>

          {/* Top chauffeurs */}
          <div className="card">
            <div className="card-title">🏆 Meilleurs chauffeurs</div>
            {kpi.chauffeurs.topRated.map((c, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:["#FFD700","#C0C0C0","#CD7F32"][i], display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"white", fontSize:16 }}>
                  {i+1}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600, fontSize:13 }}>{c.nom}</div>
                  <div style={{ fontSize:11, color:"var(--gray)" }}>{c.hub}</div>
                </div>
                <div style={{ color:"var(--amber)", fontWeight:700 }}>⭐ {c.rating}</div>
              </div>
            ))}

            <div style={{ marginTop:16 }}>
              <div style={{ fontWeight:600, fontSize:13, marginBottom:8, color:"var(--navy)" }}>Répartition par hub</div>
              {Object.entries(kpi.chauffeurs.byHub || {}).map(([hub, count]) => (
                <div key={hub} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:12 }}>
                  <span style={{ color:"var(--gray)" }}>{hub}</span>
                  <span className="badge badge-blue">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
