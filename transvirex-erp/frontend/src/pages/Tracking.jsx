import { useState, useEffect } from "react";
import { getTracking, addTracking, getTrackingStats } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Tracking() {
  const { user } = useAuth();
  const [events,  setEvents]  = useState([]);
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ missionId:"", chauffeurId:"", statut:"en_cours", message:"", localisation:{ adresse:"" } });
  const [msg,     setMsg]     = useState("");

  async function load() {
    setLoading(true);
    try {
      const [e, s] = await Promise.all([getTracking(), getTrackingStats()]);
      setEvents(e.data); setStats(s.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await addTracking(form);
      setMsg("Événement ajouté ✅"); load();
      setForm({ missionId:"", chauffeurId:"", statut:"en_cours", message:"", localisation:{ adresse:"" } });
    } catch (err) { setMsg("Erreur : " + (err.response?.data?.error || err.message)); }
  }

  const BADGE = { en_cours:"badge-amber", livree:"badge-green", incident:"badge-red", en_attente:"badge-gray" };

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">📍 Tracking</span>
      </div>
      <div className="page-content">
        {msg && <div className="alert alert-success">{msg}</div>}

        {/* Stats */}
        {stats && (
          <div className="stats-grid" style={{ marginBottom:24 }}>
            <div className="stat-card">
              <div className="stat-icon blue">📦</div>
              <div><div className="stat-value">{stats.total}</div><div className="stat-label">Événements total</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">✅</div>
              <div><div className="stat-value">{stats.livrees}</div><div className="stat-label">Livrées</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">⚠️</div>
              <div><div className="stat-value">{stats.incidents}</div><div className="stat-label">Incidents</div></div>
            </div>
          </div>
        )}

        <div style={{ display:"grid", gridTemplateColumns:"1fr 340px", gap:20 }}>
          {/* Table événements */}
          <div className="card">
            <div className="card-title">Événements récents</div>
            {loading ? (
              <div className="loading"><div className="spinner"/></div>
            ) : events.length === 0 ? (
              <div className="empty-state"><div className="icon">📍</div><p>Aucun événement</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mission</th>
                      <th>Chauffeur</th>
                      <th>Statut</th>
                      <th>Localisation</th>
                      <th>Message</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(ev => (
                      <tr key={ev._id}>
                        <td><b style={{fontSize:11}}>{ev.missionId}</b></td>
                        <td style={{fontSize:11}}>{ev.chauffeurId}</td>
                        <td><span className={`badge ${BADGE[ev.statut] || "badge-gray"}`}>{ev.statut}</span></td>
                        <td>{ev.localisation?.adresse || "—"}</td>
                        <td>{ev.message || "—"}</td>
                        <td style={{fontSize:11}}>{new Date(ev.createdAt).toLocaleString("fr-FR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Formulaire ajout */}
          <div className="card">
            <div className="card-title">Ajouter un événement</div>
            <form onSubmit={handleAdd}>
              <div className="form-group">
                <label className="form-label">ID Mission</label>
                <input value={form.missionId} onChange={e=>setForm({...form,missionId:e.target.value})} placeholder="ID de la mission" required/>
              </div>
              <div className="form-group">
                <label className="form-label">ID Chauffeur</label>
                <input value={form.chauffeurId} onChange={e=>setForm({...form,chauffeurId:e.target.value})} placeholder="ID du chauffeur" required/>
              </div>
              <div className="form-group">
                <label className="form-label">Statut</label>
                <select value={form.statut} onChange={e=>setForm({...form,statut:e.target.value})}>
                  {["en_attente","assignee","en_cours","livree","incident","annulee"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Adresse / localisation</label>
                <input value={form.localisation.adresse} onChange={e=>setForm({...form,localisation:{adresse:e.target.value}})} placeholder="Ex: A7 sortie Lyon Sud"/>
              </div>
              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea value={form.message} onChange={e=>setForm({...form,message:e.target.value})} rows={3} placeholder="Information complémentaire..."/>
              </div>
              <button type="submit" className="btn btn-primary" style={{width:"100%"}}>Enregistrer</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
