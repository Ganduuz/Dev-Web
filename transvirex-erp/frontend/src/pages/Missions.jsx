import { useState, useEffect } from "react";
import { getMissions, createMission, updateStatut, assignerMission, signalerIncident, deleteMission } from "../services/api";
import { useAuth } from "../context/AuthContext";

const STATUTS = ["en_attente","assignee","en_cours","livree","incident","annulee"];
const PRIORITES = ["basse","normale","haute","urgente"];

const BADGE = {
  en_attente:"badge-gray", assignee:"badge-blue", en_cours:"badge-amber",
  livree:"badge-green", incident:"badge-red", annulee:"badge-gray",
};
const PBADGE = { basse:"badge-gray", normale:"badge-blue", haute:"badge-amber", urgente:"badge-red" };

export default function Missions() {
  const { user } = useAuth();
  const [missions, setMissions]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [showModal,setShowModal]  = useState(false);
  const [showInc,  setShowInc]    = useState(null);
  const [filter,   setFilter]     = useState({ statut:"", priorite:"" });
  const [form,     setForm]       = useState({ chauffeurId:"", clientNom:"", adresseDepart:"", adresseArrivee:"", dateDepart:"", priorite:"normale", notes:"" });
  const [incForm,  setIncForm]    = useState({ type:"", description:"" });
  const [msg,      setMsg]        = useState("");

  const isDispatcher = ["dispatcher","admin"].includes(user?.role);

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filter.statut)   params.statut   = filter.statut;
      if (filter.priorite) params.priorite = filter.priorite;
      if (user?.role === "chauffeur") params.chauffeurId = user._id;
      const res = await getMissions(params);
      setMissions(res.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createMission(form);
      setShowModal(false);
      setForm({ chauffeurId:"", clientNom:"", adresseDepart:"", adresseArrivee:"", dateDepart:"", priorite:"normale", notes:"" });
      setMsg("Mission créée ✅"); load();
    } catch (err) { setMsg("Erreur : " + (err.response?.data?.error || err.message)); }
  }

  async function handleStatut(id, statut) {
    try { await updateStatut(id, statut); load(); } catch {}
  }

  async function handleIncident(e) {
    e.preventDefault();
    try {
      await signalerIncident(showInc, incForm);
      setShowInc(null); setIncForm({ type:"", description:"" }); load();
    } catch (err) { alert(err.response?.data?.error || "Erreur"); }
  }

  async function handleDelete(id) {
    if (!window.confirm("Supprimer cette mission ?")) return;
    await deleteMission(id); load();
  }

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">🚚 Missions</span>
        <div className="topbar-actions">
          <select value={filter.statut} onChange={e => setFilter({...filter, statut:e.target.value})} style={{width:140}}>
            <option value="">Tous statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filter.priorite} onChange={e => setFilter({...filter, priorite:e.target.value})} style={{width:140}}>
            <option value="">Toutes priorités</option>
            {PRIORITES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {isDispatcher && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nouvelle mission</button>
          )}
        </div>
      </div>

      <div className="page-content">
        {msg && <div className="alert alert-success">{msg}</div>}

        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner"/> Chargement...</div>
          ) : missions.length === 0 ? (
            <div className="empty-state"><div className="icon">🚚</div><p>Aucune mission trouvée</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Départ</th>
                    <th>Arrivée</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Priorité</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {missions.map(m => (
                    <tr key={m._id}>
                      <td><b>{m.reference}</b></td>
                      <td>{m.clientNom}</td>
                      <td style={{maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.adresseDepart}</td>
                      <td style={{maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.adresseArrivee}</td>
                      <td>{new Date(m.dateDepart).toLocaleDateString("fr-FR")}</td>
                      <td><span className={`badge ${BADGE[m.statut]}`}>{m.statut}</span></td>
                      <td><span className={`badge ${PBADGE[m.priorite]}`}>{m.priorite}</span></td>
                      <td>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          {user?.role === "chauffeur" && m.statut === "assignee" && (
                            <button className="btn btn-green btn-sm" onClick={() => handleStatut(m._id,"en_cours")}>▶ Démarrer</button>
                          )}
                          {user?.role === "chauffeur" && m.statut === "en_cours" && (
                            <button className="btn btn-green btn-sm" onClick={() => handleStatut(m._id,"livree")}>✅ Livrer</button>
                          )}
                          {["chauffeur","dispatcher","admin"].includes(user?.role) && !["livree","annulee"].includes(m.statut) && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowInc(m._id)}>⚠️ Incident</button>
                          )}
                          {isDispatcher && (
                            <>
                              <select
                                style={{padding:"4px 8px",fontSize:12,borderRadius:6,border:"1px solid var(--border)"}}
                                value={m.statut}
                                onChange={e => handleStatut(m._id, e.target.value)}
                              >
                                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button className="btn btn-red btn-sm" onClick={() => handleDelete(m._id)}>🗑</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal créer mission ──────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">Nouvelle mission</div>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ID Chauffeur</label>
                  <input value={form.chauffeurId} onChange={e=>setForm({...form,chauffeurId:e.target.value})} placeholder="ID MongoDB du chauffeur" required/>
                </div>
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <input value={form.clientNom} onChange={e=>setForm({...form,clientNom:e.target.value})} placeholder="Nom du client" required/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Adresse de départ</label>
                <input value={form.adresseDepart} onChange={e=>setForm({...form,adresseDepart:e.target.value})} placeholder="Ex: 10 rue de Paris, Lyon" required/>
              </div>
              <div className="form-group">
                <label className="form-label">Adresse d'arrivée</label>
                <input value={form.adresseArrivee} onChange={e=>setForm({...form,adresseArrivee:e.target.value})} placeholder="Ex: 5 avenue Victor Hugo, Marseille" required/>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Date de départ</label>
                  <input type="datetime-local" value={form.dateDepart} onChange={e=>setForm({...form,dateDepart:e.target.value})} required/>
                </div>
                <div className="form-group">
                  <label className="form-label">Priorité</label>
                  <select value={form.priorite} onChange={e=>setForm({...form,priorite:e.target.value})}>
                    {PRIORITES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={3} placeholder="Instructions particulières..."/>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer la mission</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal incident ────────────────────────────────────────────────── */}
      {showInc && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowInc(null)}>
          <div className="modal">
            <div className="modal-title">⚠️ Signaler un incident</div>
            <form onSubmit={handleIncident}>
              <div className="form-group">
                <label className="form-label">Type d'incident</label>
                <select value={incForm.type} onChange={e=>setIncForm({...incForm,type:e.target.value})} required>
                  <option value="">Choisir...</option>
                  <option value="colis_abime">Colis abîmé</option>
                  <option value="client_absent">Client absent</option>
                  <option value="adresse_incorrecte">Adresse incorrecte</option>
                  <option value="accident">Accident</option>
                  <option value="retard">Retard</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea value={incForm.description} onChange={e=>setIncForm({...incForm,description:e.target.value})} rows={3} placeholder="Décrivez l'incident..." required/>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowInc(null)}>Annuler</button>
                <button type="submit" className="btn btn-red">Signaler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
