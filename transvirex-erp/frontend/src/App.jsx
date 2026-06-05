import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Login         from "./pages/Login";
import Layout        from "./components/Layout";
import Dashboard     from "./pages/Dashboard";
import Missions      from "./pages/Missions";
import Tracking      from "./pages/Tracking";
import Facturation   from "./pages/Facturation";
import Users         from "./pages/Users";
import Notifications from "./pages/Notifications";
import Drivers       from "./pages/Drivers";
import Direction     from "./pages/Direction";

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"/></div>;
  if (!user)   return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index             element={<Dashboard />} />
        <Route path="missions"   element={<Missions />} />
        <Route path="tracking"   element={<Tracking />} />
        <Route path="drivers"    element={
          <PrivateRoute roles={["dispatcher","direction","admin"]}><Drivers /></PrivateRoute>
        }/>
        <Route path="facturation" element={
          <PrivateRoute roles={["facturation","direction","admin"]}><Facturation /></PrivateRoute>
        }/>
        <Route path="direction"  element={
          <PrivateRoute roles={["direction","admin"]}><Direction /></PrivateRoute>
        }/>
        <Route path="notifications" element={<Notifications />} />
        <Route path="users"      element={
          <PrivateRoute roles={["admin"]}><Users /></PrivateRoute>
        }/>
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
