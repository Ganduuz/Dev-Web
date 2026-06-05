import { useState, useEffect } from "react";
import { getFactures, getFactureStats, createFacture, updateFactStatut, addRelance, deleteFacture } from "../services/api";

const STATUTS = ["en_attente","envoyee","payee","en_retard","annulee"];
const BADGE = { en_attente:"badge-gray", envoyee:"badge-blue", payee:"badge-green", en_retard:"badge-red", annulee:"badge-gray" };

export default function Facturation() {
  const [factures, setFactures] = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showModal,setShowModal]= useState(false);
  const [showRel,  setShowRel]  = useState(null);
  const [filter,   setFilter]   = useState("");
  const [form,     setForm]     = useState({ missionId:"", clientNom:"", montant:"", notes:"" });
  const [relMsg,   setRelMsg]   = useState("");
  const [msg,      setMsg]      = useState("");

async function load() {
  setLoading(true);
  try {
    const params = filter ? { statut: filter } : {};

    const results = await Promise.allSettled([
      getFactures(params),
      getFactureStats()
    ]);

    const f = results[0];
    const s = results[1];

    if (f.status === "fulfilled") setFactures(f.value.data);
    else console.error("Factures error:", f.reason);

    if (s.status === "fulfilled") setStats(s.value.data);
    else console.error("Stats error:", s.reason);

  } finally {
    setLoading(false);
  }
}
  useEffect(() => { load(); }, [filter]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await createFacture({ ...form, montant: parseFloat(form.montant) });
      setShowModal(false); setForm({ missionId:"", clientNom:"", montant:"", notes:"" });
      setMsg("Facture créée ✅"); load();
    } catch (err) { alert(err.response?.data?.error || "Erreur"); }
  }

  async function handleStatut(id, statut) {
    try { await updateFactStatut(id, statut); load(); } catch {}
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
                      <td style={{fontSize:11}}>{f.missionId}</td>
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
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ID Mission</label>
                  <input value={form.missionId} onChange={e=>setForm({...form,missionId:e.target.value})} required placeholder="ID MongoDB de la mission"/>
                </div>
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
