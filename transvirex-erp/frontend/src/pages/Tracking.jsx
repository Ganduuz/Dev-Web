import { useState, useEffect } from "react";
// ⚠️ Ajout de getMissions ici
import { getTracking, addTracking, getTrackingStats, getMissions } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Tracking() {
  const { user } = useAuth();
  const [events,  setEvents]  = useState([]);
  const [stats,   setStats]   = useState(null);
  const [missions, setMissions] = useState([]); // Nouveau state pour stocker les missions
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState({ missionId:"", statut:"en_cours", message:"", localisation:{ adresse:"" } });
  const [msg,     setMsg]     = useState("");

  async function load() {
    setLoading(true);
    try {
      // ⚠️ On charge les missions en même temps que les événements et les stats
      const [e, s, m] = await Promise.all([
        getTracking(), 
        getTrackingStats(),
        getMissions() // Appel à l'API pour récupérer les missions
      ]);
      setEvents(e.data); 
      setStats(s.data);
      setMissions(m.data); // Sauvegarde des missions dans le state
    } catch (err) {
      console.error("Erreur de chargement :", err);
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const mission = missions.find(m => m._id === form.missionId);
    if (!mission) {
      setMsg("Sélectionnez une mission avant d'ajouter un événement.");
      return;
    }
    if (!mission.chauffeurId) {
      setMsg("La mission sélectionnée n'a pas encore de chauffeur assigné.");
      return;
    }

    try {
      const payload = {
        missionId: mission._id,
        chauffeurId: mission.chauffeurId,
        statut: form.statut,
        localisation: form.localisation,
        message: form.message,
      };
      await addTracking(payload);
      setMsg("Événement ajouté ✅");
      load();
      setForm({ missionId:"", statut:"en_cours", message:"", localisation:{ adresse:"" } });
    } catch (err) {
      const errorBody = err.response?.data;
      const errorText = typeof errorBody === "object" ? JSON.stringify(errorBody) : errorBody;
      setMsg("Erreur : " + (err.response?.data?.error || errorText || err.message));
    }
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
              
              {/* ── NOUVEAU SELECT POUR LA MISSION ── */}
              <div className="form-group">
                <label className="form-label">Mission</label>
                <select value={form.missionId} onChange={e=>setForm({...form,missionId:e.target.value})} required>
                  <option value="">-- Sélectionner une mission --</option>
                  {missions.map(m => (
                    <option key={m._id} value={m._id}>
                      {m.reference} - {m.clientNom}
                    </option>
                  ))}
                </select>
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