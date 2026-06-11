import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifs } from "../context/NotifContext";

const NAV = [
  { to: "/",             icon: "📊", label: "Dashboard",     roles: null },
  { to: "/missions",     icon: "🚚", label: "Missions",      roles: null },
  { to: "/tracking",     icon: "📍", label: "Tracking",      roles: null },
  { to: "/facturation",  icon: "💶", label: "Facturation",   roles: ["facturation","direction","admin"] },
  { to: "/notifications",icon: "🔔", label: "Notifications", roles: null },
  { to: "/users",        icon: "👥", label: "Utilisateurs",  roles: ["admin","direction"] },
  { to: "/nexus",        icon: "🤖", label: "NEXUS AI",      roles: null },
];

export default function Layout() {
  const { user, logoutUser } = useAuth();
  const { nonLues } = useNotifs();
  const navigate = useNavigate();

  function handleLogout() {
    logoutUser();
    navigate("/login");
  }

  const initials = user
    ? `${user.prenom?.[0] || ""}${user.nom?.[0] || ""}`.toUpperCase()
    : "?";

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>TRANSVIREX</h1>
          <span>ERP Logistique</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.filter(n => !n.roles || n.roles.includes(user?.role)).map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) => isActive ? "active" : ""}
            >
              <span className="nav-icon">{n.icon}</span>
              {n.label}
              {n.to === "/notifications" && nonLues > 0 && (
                <span style={{
                  background: "var(--red)",
                  color: "white",
                  borderRadius: "50%",
                  padding: "1px 7px",
                  fontSize: 11,
                  marginLeft: "auto",
                  minWidth: 20,
                  textAlign: "center",
                }}>
                  {nonLues}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="name">{user?.prenom} {user?.nom}</div>
              <div className="role">{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              style={{ background:"none", color:"rgba(255,255,255,0.5)", fontSize:18, padding:4 }}
              title="Déconnexion"
            >↪</button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}