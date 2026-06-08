import { useState, useEffect } from "react";
import { getNotifications, marquerLu, toutMarquerLu } from "../services/api";
import { useAuth } from "../context/AuthContext";

const TYPE_BADGE = { info:"badge-blue", alerte:"badge-red", succes:"badge-green", erreur:"badge-red" };
const TYPE_ICON  = { info:"ℹ️", alerte:"⚠️", succes:"✅", erreur:"❌" };

export default function Notifications() {
  const { user }  = useAuth();
  const [notifs,   setNotifs]  = useState([]);
  const [loading,  setLoading] = useState(true);

  async function load() {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await getNotifications(user._id, user.role);
      setNotifs(res.data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [user]);

  async function handleLu(id) {
    await marquerLu(id); load();
  }

  async function handleToutLire() {
    if (!user?._id) return;
    await toutMarquerLu(user._id, user.role);
    load();
  }

  const nonLues = notifs.filter(n => !n.lu).length;

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">🔔 Notifications {nonLues > 0 && <span style={{background:"var(--red)",color:"white",borderRadius:"50%",padding:"1px 7px",fontSize:12,marginLeft:8}}>{nonLues}</span>}</span>
        <div className="topbar-actions">
          {nonLues > 0 && (
            <button className="btn btn-ghost" onClick={handleToutLire}>✓ Tout marquer comme lu</button>
          )}
        </div>
      </div>
      <div className="page-content">
        {loading ? (
          <div className="loading"><div className="spinner"/></div>
        ) : notifs.length === 0 ? (
          <div className="empty-state"><div className="icon">🔔</div><p>Aucune notification</p></div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {notifs.map(n => (
              <div
                key={n._id}
                className="card"
                style={{
                  display:"flex", alignItems:"flex-start", gap:14,
                  opacity: n.lu ? 0.6 : 1,
                  borderLeft: n.lu ? "3px solid var(--border)" : "3px solid var(--blue)",
                  padding:16,
                }}
              >
                <span style={{fontSize:22}}>{TYPE_ICON[n.type] || "🔔"}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                    <b style={{fontSize:14}}>{n.titre}</b>
                    <span className={`badge ${TYPE_BADGE[n.type] || "badge-gray"}`}>{n.type}</span>
                    {!n.lu && <span className="badge badge-blue" style={{fontSize:10}}>Nouveau</span>}
                  </div>
                  <p style={{fontSize:13,color:"var(--gray)",marginBottom:4}}>{n.message}</p>
                  <span style={{fontSize:11,color:"var(--gray)"}}>
                    {new Date(n.createdAt).toLocaleString("fr-FR")}
                  </span>
                </div>
                {!n.lu && (
                  <button className="btn btn-ghost btn-sm" onClick={() => handleLu(n._id)}>Lu</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
