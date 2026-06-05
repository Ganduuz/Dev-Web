import { useState, useEffect } from "react";
import { getUsers, deleteUser, register } from "../services/api";

const ROLES = ["chauffeur","dispatcher","facturation","direction","admin"];
const BADGE = { chauffeur:"badge-blue", dispatcher:"badge-amber", facturation:"badge-green", direction:"badge-gray", admin:"badge-red" };

export default function Users() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showModal,setShowModal]= useState(false);
  const [filter,   setFilter]   = useState("");
  const [form,     setForm]     = useState({ nom:"", prenom:"", email:"", password:"", role:"chauffeur" });
  const [msg,      setMsg]      = useState("");

  async function load() {
    setLoading(true);
    try {
      const params = filter ? { role: filter } : {};
      const res = await getUsers(params);
      setUsers(res.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [filter]);

  async function handleCreate(e) {
    e.preventDefault();
    try {
      await register(form);
      setShowModal(false);
      setForm({ nom:"", prenom:"", email:"", password:"", role:"chauffeur" });
      setMsg("Utilisateur créé ✅"); load();
    } catch (err) { alert(err.response?.data?.error || "Erreur"); }
  }

  async function handleDelete(id) {
    if (!window.confirm("Supprimer cet utilisateur ?")) return;
    await deleteUser(id); load();
  }

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">👥 Utilisateurs</span>
        <div className="topbar-actions">
          <select value={filter} onChange={e=>setFilter(e.target.value)} style={{width:150}}>
            <option value="">Tous les rôles</option>
            {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ Nouvel utilisateur</button>
        </div>
      </div>
      <div className="page-content">
        {msg && <div className="alert alert-success">{msg}</div>}
        <div className="card">
          {loading ? (
            <div className="loading"><div className="spinner"/></div>
          ) : users.length === 0 ? (
            <div className="empty-state"><div className="icon">👥</div><p>Aucun utilisateur</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Créé le</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id}>
                      <td><b>{u.prenom} {u.nom}</b></td>
                      <td>{u.email}</td>
                      <td><span className={`badge ${BADGE[u.role] || "badge-gray"}`}>{u.role}</span></td>
                      <td><span className={`badge ${u.actif ? "badge-green" : "badge-red"}`}>{u.actif ? "Actif" : "Inactif"}</span></td>
                      <td>{new Date(u.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td>
                        <button className="btn btn-red btn-sm" onClick={()=>handleDelete(u._id)}>🗑 Supprimer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="modal">
            <div className="modal-title">Nouvel utilisateur</div>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Prénom</label>
                  <input value={form.prenom} onChange={e=>setForm({...form,prenom:e.target.value})} required/>
                </div>
                <div className="form-group">
                  <label className="form-label">Nom</label>
                  <input value={form.nom} onChange={e=>setForm({...form,nom:e.target.value})} required/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required/>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Mot de passe</label>
                  <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={6}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Rôle</label>
                  <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
                    {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
