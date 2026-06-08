import { useState, useEffect } from "react";
import { getMissions, getDrivers, createMission, updateStatut, assignerMission, signalerIncident, deleteMission } from "../services/api";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const API_BASE = "http://localhost:3000";

const STATUTS = ["en_attente","acceptee","assignee","en_cours","livree","incident","annulee"];
const PRIORITES = ["basse","normale","haute","urgente"];

const BADGE = {
  en_attente:"badge-gray", acceptee:"badge-blue", assignee:"badge-blue", en_cours:"badge-amber",
  livree:"badge-green", incident:"badge-red", annulee:"badge-gray", refusee:"badge-red"
};
const PBADGE = { basse:"badge-gray", normale:"badge-blue", haute:"badge-amber", urgente:"badge-red" };

export default function Missions() {
  const { user } = useAuth();
  const [missions, setMissions]   = useState([]);
  const [historique, setHistorique] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [driverMap, setDriverMap] = useState({});
  const [assignChoix, setAssignChoix] = useState({});
  const [loading,  setLoading]    = useState(true);
  const [tab, setTab] = useState("actives"); // actives, historique
  const [showModal,setShowModal]  = useState(false);
  const [showInc,  setShowInc]    = useState(null);
  const [refuserModal, setRefuserModal] = useState(null);
  const [filter,   setFilter]     = useState({ statut:"", priorite:"" });
  const [form,     setForm]       = useState({ chauffeurId:"", clientNom:"", adresseDepart:"", adresseArrivee:"", dateDepart:"", priorite:"normale", notes:"", montant:"" });
  const [incForm,  setIncForm]    = useState({ type:"", description:"", severity:"medium" });
  const [refuseForm, setRefuseForm] = useState({ raison: "" });
  const [msg,      setMsg]        = useState("");

  const isChauffeur = user?.role === "chauffeur";
  const isDispatcher = ["dispatcher","admin"].includes(user?.role);
  const isDirection = ["direction","admin"].includes(user?.role);
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  async function load() {
    setLoading(true);
    try {
      const params = {};
      if (filter.statut)   params.statut   = filter.statut;
      if (filter.priorite) params.priorite = filter.priorite;
      
      let missionsList = [];
      let historiqueList = [];

      // Charger missions actuelles
      if (isChauffeur) {
        const res = await getMissions(params);
        missionsList = res.data.filter(m => !["livree","incident","annulee"].includes(m.statut));
        historiqueList = res.data.filter(m => ["livree","incident","annulee"].includes(m.statut));
      } else {
        const res = await getMissions(params);
        missionsList = res.data;
      }
      
      setMissions(missionsList);
      setHistorique(historiqueList);

      if (isDispatcher) {
        const driverRes = await getDrivers({ status: "Actif" });
        setDrivers(driverRes.data);
        setDriverMap(driverRes.data.reduce((acc, driver) => {
          const key = driver.userId || driver._id;
          acc[key] = `${driver.First_Name} ${driver.Last_Name}`;
          return acc;
        }, {}));
      }
    } catch (err) {
      console.error(err);
      setMsg("Erreur lors du chargement");
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { 
    load(); 
  }, [filter, isChauffeur]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createMission({...form, montant: parseFloat(form.montant || 0)});
      setShowModal(false);
      setForm({ chauffeurId:"", clientNom:"", adresseDepart:"", adresseArrivee:"", dateDepart:"", priorite:"normale", notes:"", montant:"" });
      setMsg("Mission créée ✅"); 
      setTimeout(() => setMsg(""), 3000);
      load();
    } catch (err) { 
      setMsg("Erreur : " + (err.response?.data?.error || err.message)); 
    }
  }

  async function handleAssign(id) {
    const chauffeurId = assignChoix[id];
    if (!chauffeurId) {
      setMsg("Sélectionnez un chauffeur avant d'assigner.");
      setTimeout(() => setMsg(""), 3000);
      return;
    }
    try {
      await assignerMission(id, { chauffeurId });
      setMsg("Chauffeur affecté ✅");
      setTimeout(() => setMsg(""), 3000);
      load();
    } catch (err) {
      setMsg("Erreur d'affectation");
      setTimeout(() => setMsg(""), 3000);
    }
  }

  async function handleStatut(id, statut) {
    try { 
      await updateStatut(id, statut); 
      setMsg(`Mission ${statut} ✅`);
      setTimeout(() => setMsg(""), 3000);
      load(); 
    } catch (err) {
      setMsg("Erreur : " + err.message);
    }
  }

  async function handleAccepter(id) {
    try {
      await axios.patch(`${API_BASE}/missions/${id}/accepter`, {}, { headers });
      setMsg("Mission acceptée ✅");
      setTimeout(() => setMsg(""), 3000);
      load();
    } catch (err) {
      setMsg("Erreur : " + (err.response?.data?.error || err.message));
    }
  }

  async function handleRefuser(id) {
    try {
      await axios.patch(`${API_BASE}/missions/${id}/refuser`, { raison: refuseForm.raison }, { headers });
      setRefuserModal(null);
      setRefuseForm({ raison: "" });
      setMsg("Mission refusée");
      setTimeout(() => setMsg(""), 3000);
      load();
    } catch (err) {
      setMsg("Erreur : " + (err.response?.data?.error || err.message));
    }
  }

  async function handleTerminer(id) {
    try {
      await axios.patch(`${API_BASE}/missions/${id}/terminer`, {}, { headers });
      setMsg("Livraison terminée ✅");
      setTimeout(() => setMsg(""), 3000);
      load();
    } catch (err) {
      setMsg("Erreur : " + (err.response?.data?.error || err.message));
    }
  }

  async function handleIncident(e) {
    e.preventDefault();
    try {
      await signalerIncident(showInc, incForm);
      setShowInc(null); 
      setIncForm({ type:"", description:"", severity:"medium" }); 
      setMsg("Incident signalé");
      setTimeout(() => setMsg(""), 3000);
      load();
    } catch (err) { 
      setMsg("Erreur : " + (err.response?.data?.error || err.message));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Supprimer cette mission ?")) return;
    try {
      await deleteMission(id); 
      load();
    } catch (err) {
      setMsg("Erreur");
    }
  }

  const displayMissions = tab === "actives" ? missions : historique;

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">🚚 Missions</span>
        <div className="topbar-actions">
          {isChauffeur && (
            <div style={{display:"flex",gap:8}}>
              <button 
                className={`btn ${tab === "actives" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setTab("actives")}
              >
                📋 Actives ({missions.length})
              </button>
              <button 
                className={`btn ${tab === "historique" ? "btn-primary" : "btn-ghost"}`}
                onClick={() => setTab("historique")}
              >
                📜 Historique ({historique.length})
              </button>
            </div>
          )}
          {!isChauffeur && (
            <>
              <select value={filter.statut} onChange={e => setFilter({...filter, statut:e.target.value})} style={{width:140}}>
                <option value="">Tous statuts</option>
                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filter.priorite} onChange={e => setFilter({...filter, priorite:e.target.value})} style={{width:140}}>
                <option value="">Toutes priorités</option>
                {PRIORITES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </>
          )}
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
          ) : displayMissions.length === 0 ? (
            <div className="empty-state"><div className="icon">🚚</div><p>{tab === "actives" ? "Aucune mission active" : "Aucun historique"}</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Chauffeur</th>
                    <th>Départ → Arrivée</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Priorité</th>
                    {!isChauffeur && <th>Montant</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayMissions.map(m => (
                    <tr key={m._id}>
                      <td><b>{m.reference}</b></td>
                      <td>{m.clientNom}</td>
                      <td>{driverMap[m.chauffeurId] || m.chauffeurId || "—"}</td>
                      <td style={{fontSize:12,maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {m.adresseDepart?.split(',')[0]} → {m.adresseArrivee?.split(',')[0]}
                      </td>
                      <td>{new Date(m.dateDepart).toLocaleDateString("fr-FR", {year:'2-digit',month:'2-digit',day:'2-digit'})}</td>
                      <td><span className={`badge ${BADGE[m.statut]}`}>{m.statut}</span></td>
                      <td><span className={`badge ${PBADGE[m.priorite]}`}>{m.priorite}</span></td>
                      {!isChauffeur && <td>{m.montant || 0}€</td>}
                      <td>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap",fontSize:12}}>
                          {/* CHAUFFEUR ACTIONS */}
                          {isChauffeur && m.statut === "assignee" && (
                            <>
                              <button className="btn btn-green btn-sm" onClick={() => handleAccepter(m._id)}>✅ Accepter</button>
                              <button className="btn btn-red btn-sm" onClick={() => setRefuserModal(m._id)}>❌ Refuser</button>
                            </>
                          )}
                          {isChauffeur && m.statut === "acceptee" && (
                            <button className="btn btn-amber btn-sm" onClick={() => handleStatut(m._id,"en_cours")}>▶ Démarrer</button>
                          )}
                          {isChauffeur && m.statut === "en_cours" && (
                            <button className="btn btn-green btn-sm" onClick={() => handleTerminer(m._id)}>✅ Terminer</button>
                          )}
                          {/* INCIDENT */}
                          {["chauffeur","dispatcher","admin"].includes(user?.role) && !["livree","annulee","refusee"].includes(m.statut) && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowInc(m._id)}>⚠️ Incident</button>
                          )}
                          {/* DISPATCHER ACTIONS */}
                          {isDispatcher && m.statut === "en_attente" && (
                            <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
                              <select
                                style={{padding:"4px 8px",fontSize:12,borderRadius:6,border:"1px solid var(--border)"}}
                                value={assignChoix[m._id] || ""}
                                onChange={e => setAssignChoix({...assignChoix, [m._id]: e.target.value})}
                              >
                                <option value="">Choisir un chauffeur</option>
                                {drivers.map(d => (
                                  <option key={d._id} value={d.userId || d._id}>{d.First_Name} {d.Last_Name} {d.Hub ? `(${d.Hub})` : ""}</option>
                                ))}
                              </select>
                              <button className="btn btn-blue btn-sm" onClick={() => handleAssign(m._id)}>📋 Assigner</button>
                            </div>
                          )}
                          {isDispatcher && m.statut !== "en_attente" && (
                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(m._id)}>🗑</button>
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
                  <label className="form-label">Chauffeur</label>
                  <select value={form.chauffeurId} onChange={e=>setForm({...form,chauffeurId:e.target.value})} required>
                    <option value="">-- Sélectionner un chauffeur --</option>
                    {drivers.length > 0 ? drivers.map(d => (
                      <option key={d._id} value={d.userId || d._id}>
                        {d.First_Name} {d.Last_Name} {d.Hub ? `(${d.Hub})` : ""}
                      </option>
                    )) : <option value="" disabled>Aucun chauffeur actif</option>}
                  </select>
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
                <input value={form.adresseArrivee} onChange={e=>setForm({...form,adresseArrivee:e.target.value})} placeholder="Ex: 5 avenue Hugo, Marseille" required/>
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
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Montant (€)</label>
                  <input type="number" step="0.01" value={form.montant} onChange={e=>setForm({...form,montant:e.target.value})} placeholder="0.00"/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2} placeholder="Instructions particulières..."/>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer la mission</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal refuser mission ──────────────────────────────────────────── */}
      {refuserModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRefuserModal(null)}>
          <div className="modal">
            <div className="modal-title">❌ Refuser la mission</div>
            <form onSubmit={e => {
              e.preventDefault();
              handleRefuser(refuserModal);
            }}>
              <div className="form-group">
                <label className="form-label">Raison du refus</label>
                <textarea value={refuseForm.raison} onChange={e=>setRefuseForm({raison:e.target.value})} rows={3} placeholder="Expliquez pourquoi vous refusez cette mission..." required/>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setRefuserModal(null)}>Annuler</button>
                <button type="submit" className="btn btn-red">Refuser la mission</button>
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
                <label className="form-label">Sévérité</label>
                <select value={incForm.severity} onChange={e=>setIncForm({...incForm,severity:e.target.value})}>
                  <option value="low">Faible</option>
                  <option value="medium">Moyen</option>
                  <option value="high">Élevée</option>
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