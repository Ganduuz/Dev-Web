import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = "http://localhost:3000";

export default function Drivers() {
  const [drivers,  setDrivers]  = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState({ status:"", hub:"" });

  async function load() {
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append("status", filter.status);
      if (filter.hub)    params.append("hub",    filter.hub);
      const [d, s] = await Promise.all([
        axios.get(`${API_BASE}/drivers?${params}`, { headers }),
        axios.get(`${API_BASE}/drivers/stats`,     { headers }),
      ]);
      setDrivers(d.data);
      setStats(s.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);

  const hubs = [...new Set(drivers.map(d => d.Hub).filter(Boolean))];

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">🚗 Chauffeurs</span>
        <div className="topbar-actions">
          <select value={filter.status} onChange={e=>setFilter({...filter,status:e.target.value})} style={{width:130}}>
            <option value="">Tous statuts</option>
            <option value="Actif">Actif</option>
            <option value="Inactif">Inactif</option>
          </select>
          <select value={filter.hub} onChange={e=>setFilter({...filter,hub:e.target.value})} style={{width:160}}>
            <option value="">Tous les hubs</option>
            {hubs.map(h=><option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      </div>

      <div className="page-content">
        {/* Stats */}
        {stats && (
          <div className="stats-grid" style={{ marginBottom:24 }}>
            <div className="stat-card">
              <div className="stat-icon blue">🚗</div>
              <div><div className="stat-value">{stats.total}</div><div className="stat-label">Total chauffeurs</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">✅</div>
              <div><div className="stat-value">{stats.actifs}</div><div className="stat-label">Actifs</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">⭐</div>
              <div><div className="stat-value">{stats.avgRating}</div><div className="stat-label">Note moyenne</div></div>
            </div>
          </div>
        )}

        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner"/></div>
          ) : drivers.length === 0 ? (
            <div className="empty-state"><div className="icon">🚗</div><p>Aucun chauffeur trouvé</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nom</th>
                    <th>Téléphone</th>
                    <th>Véhicule</th>
                    <th>Plaque</th>
                    <th>Hub</th>
                    <th>Note</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map(d => (
                    <tr key={d._id}>
                      <td style={{fontSize:11,color:"var(--gray)"}}>{d.Driver_ID}</td>
                      <td><b>{d.First_Name} {d.Last_Name}</b><br/><span style={{fontSize:11,color:"var(--gray)"}}>{d.Email}</span></td>
                      <td>{d.Phone}</td>
                      <td>{d.Vehicle_Type}</td>
                      <td><code style={{background:"var(--gray-l)",padding:"2px 6px",borderRadius:4,fontSize:11}}>{d.License_Plate}</code></td>
                      <td>{d.Hub}</td>
                      <td>
                        <span style={{ display:"flex", alignItems:"center", gap:4, color:"var(--amber)", fontWeight:600 }}>
                          ⭐ {d.Rating}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${d.Status === "Actif" ? "badge-green" : "badge-red"}`}>{d.Status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
