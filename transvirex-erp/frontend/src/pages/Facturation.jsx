import { useState, useEffect } from "react";
import { getFactures, getFactureStats, createFacture, updateFactStatut, addRelance, deleteFacture, getCompletedMissions } from "../services/api";

const STATUTS = ["en_attente","envoyee","payee","en_retard","annulee"];
const BADGE = { en_attente:"badge-gray", envoyee:"badge-blue", payee:"badge-green", en_retard:"badge-red", annulee:"badge-gray" };

export default function Facturation() {
  const [factures, setFactures] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showModal,setShowModal]= useState(false);
  const [showRel,  setShowRel]  = useState(null);
  const [filter,   setFilter]   = useState("");
  const [missionSearch, setMissionSearch] = useState("");
  const [form,     setForm]     = useState({ missionId:"", clientNom:"", montant:"", notes:"", dateEcheance:"" });
  const [relMsg,   setRelMsg]   = useState("");
  const [msg,      setMsg]      = useState("");

  const missionReferenceMap = Object.fromEntries(livraisons.map(m => [m._id, m.reference]));
  const filteredLivraisons = livraisons.filter(m => {
    const query = missionSearch.toLowerCase();
    return (
      m.reference?.toLowerCase().includes(query) ||
      m.clientNom?.toLowerCase().includes(query) ||
      m.adresseDepart?.toLowerCase().includes(query) ||
      m.adresseArrivee?.toLowerCase().includes(query)
    );
  });

async function load() {
  setLoading(true);
  try {
    const params = filter ? { statut: filter } : {};

    const results = await Promise.allSettled([
      getFactures(params),
      getFactureStats(),
      getCompletedMissions(),
    ]);

    const f = results[0];
    const s = results[1];
    const l = results[2];

    if (f.status === "fulfilled") setFactures(f.value.data);
    else console.error("Factures error:", f.reason);

    if (s.status === "fulfilled") setStats(s.value.data);
    else console.error("Stats error:", s.reason);

    if (l.status === "fulfilled") setLivraisons(l.value.data);
    else console.error("Livraisons error:", l.reason);

  } finally {
    setLoading(false);
  }
}
  useEffect(() => { load(); }, [filter]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createFacture({
        ...form,
        montant: parseFloat(form.montant),
        dateEcheance: form.dateEcheance ? new Date(form.dateEcheance).toISOString() : undefined,
      });
      setShowModal(false);
      setForm({ missionId:"", clientNom:"", montant:"", notes:"", dateEcheance:"" });
      setMsg("Facture créée ✅");
      setTimeout(() => setMsg(""), 3000);
      load();
    } catch (err) { alert(err.response?.data?.error || "Erreur"); }
  }

  function handleSelectMission(missionId) {
    const mission = livraisons.find(m => m._id === missionId);
    setMissionSearch("");
    setForm(prev => ({
      missionId,
      clientNom: mission?.clientNom || "",
      montant: mission?.montant || "",
      notes: mission ? `Facture générée depuis mission ${mission.reference}` : prev.notes,
      dateEcheance: prev.dateEcheance,
    }));
  }

  async function handleStatut(id, statut) {
    try { await updateFactStatut(id, statut); load(); } catch {}
  }

  async function handleGenerateFromMission(mission) {
    try {
      await createFacture({
        missionId: mission._id,
        clientNom: mission.clientNom,
        montant: mission.montant || 0,
        notes: mission.notes || "Facture générée depuis mission livrée",
        dateEcheance: new Date(new Date().setDate(new Date().getDate() + 15)),
      });
      setMsg("Facture générée depuis livraison ✅");
      setTimeout(() => setMsg(""), 3000);
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors de la génération");
    }
  }

  async function handleRelance(e) {
    e.preventDefault();
    try {
      await addRelance(showRel, { message: relMsg });
      setShowRel(null); setRelMsg(""); load();
    } catch (err) { alert(err.response?.data?.error || "Erreur"); }
  }

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">💶 Facturation</span>
        <div className="topbar-actions">
          <select value={filter} onChange={e=>setFilter(e.target.value)} style={{width:150}}>
            <option value="">Tous statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Nouvelle facture</button>
        </div>
      </div>
      <div className="page-content">
        {msg && <div className="alert alert-success">{msg}</div>}

        {/* Stats */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">📄</div>
              <div><div className="stat-value">{stats.total}</div><div className="stat-label">Total factures</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">💰</div>
              <div><div className="stat-value">{stats.payees?.montant?.toFixed(0)}€</div><div className="stat-label">Payées ({stats.payees?.count})</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">⏳</div>
              <div><div className="stat-value">{stats.enAttente?.montant?.toFixed(0)}€</div><div className="stat-label">En attente ({stats.enAttente?.count})</div></div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">🔴</div>
              <div><div className="stat-value">{stats.enRetard?.montant?.toFixed(0)}€</div><div className="stat-label">En retard ({stats.enRetard?.count})</div></div>
            </div>
          </div>
        )}

        {livraisons.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">🚚 Livraisons terminées</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Réf mission</th>
                    <th>Client</th>
                    <th>Date livraison</th>
                    <th>Montant</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {livraisons.map(m => (
                    <tr key={m._id}>
                      <td>{m.reference}</td>
                      <td>{m.clientNom}</td>
                      <td>{m.dateLivraison ? new Date(m.dateLivraison).toLocaleDateString("fr-FR") : "—"}</td>
                      <td>{m.montant || 0}€</td>
                      <td>
                        <button className="btn btn-primary btn-sm" onClick={() => handleGenerateFromMission(m)}>
                          Générer facture
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner"/></div>
          ) : factures.length === 0 ? (
            <div className="empty-state"><div className="icon">💶</div><p>Aucune facture</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Mission</th>
                    <th>Montant</th>
                    <th>Échéance</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {factures.map(f => (
                    <tr key={f._id}>
                      <td><b>{f.reference}</b></td>
                      <td>{f.clientNom}</td>
                      <td style={{fontSize:11}}>{missionReferenceMap[f.missionId] || f.missionId}</td>
                      <td><b>{f.montant}€</b></td>
                      <td>{f.dateEcheance ? new Date(f.dateEcheance).toLocaleDateString("fr-FR") : "—"}</td>
                      <td><span className={`badge ${BADGE[f.statut]}`}>{f.statut}</span></td>
                      <td>
                        <div style={{display:"flex",gap:6}}>
                          <select
                            style={{padding:"4px 8px",fontSize:12,borderRadius:6,border:"1px solid var(--border)"}}
                            value={f.statut}
                            onChange={e=>handleStatut(f._id, e.target.value)}
                          >
                            {STATUTS.map(s=><option key={s} value={s}>{s}</option>)}
                          </select>
                          <button className="btn btn-ghost btn-sm" onClick={()=>setShowRel(f._id)}>📨 Relance</button>
                          <button className="btn btn-red btn-sm" onClick={async()=>{ await deleteFacture(f._id); load(); }}>🗑</button>
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

      {/* Modal créer facture */}
      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">Nouvelle facture</div>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Mission terminée</label>
                <input
                  type="search"
                  value={missionSearch}
                  onChange={e => setMissionSearch(e.target.value)}
                  placeholder="Rechercher par référence, client ou adresse"
                  style={{ marginBottom: 10, width: "100%", padding: "10px", borderRadius: 8, border: "1px solid var(--border)" }}
                />
                <select value={form.missionId} onChange={e => handleSelectMission(e.target.value)} style={{ width: "100%" }} required>
                  <option value="">-- Choisir une mission livrée --</option>
                  {filteredLivraisons.length > 0 ? filteredLivraisons.map(m => (
                    <option key={m._id} value={m._id}>
                      {m.reference} — {m.clientNom} — {m.adresseDepart.split(",")[0]}
                    </option>
                  )) : (
                    <option value="" disabled>Aucune mission livrée disponible</option>
                  )}
                </select>
                <small style={{ color: "var(--gray)", marginTop: 8, display: "block" }}>
                  Recherchez et sélectionnez une mission livrée pour préremplir automatiquement le formulaire.
                </small>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <input value={form.clientNom} onChange={e=>setForm({...form,clientNom:e.target.value})} required placeholder="Nom du client"/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Montant (€)</label>
                <input type="number" step="0.01" value={form.montant} onChange={e=>setForm({...form,montant:e.target.value})} required placeholder="Ex: 150.00"/>
              </div>
              <div className="form-group">
                <label className="form-label">Date d'échéance</label>
                <input type="date" value={form.dateEcheance} onChange={e=>setForm({...form,dateEcheance:e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} rows={2}/>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal relance */}
      {showRel && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowRel(null)}>
          <div className="modal">
            <div className="modal-title">📨 Envoyer une relance</div>
            <form onSubmit={handleRelance}>
              <div className="form-group">
                <label className="form-label">Message de relance</label>
                <textarea value={relMsg} onChange={e=>setRelMsg(e.target.value)} rows={4} placeholder="Bonjour, nous vous rappelons que la facture..." required/>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowRel(null)}>Annuler</button>
                <button type="submit" className="btn btn-amber" style={{background:"var(--amber)",color:"white"}}>Envoyer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
