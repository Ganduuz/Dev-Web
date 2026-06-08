import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login } from "../services/api";

export default function Login() {
  const [form,      setForm]      = useState({ email: "", password: "" });
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [attempts,  setAttempts]  = useState(0);
  const { loginUser } = useAuth();
  const navigate      = useNavigate();

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); 
    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.token, res.data.user);
      setAttempts(0);
      navigate("/");
    } catch (err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      let errorMsg = `Email ou mot de passe incorrect (tentative ${newAttempts}/5)`;
      if (newAttempts >= 5) {
        errorMsg = "Trop de tentatives. Veuillez contacter l'administrateur";
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <h1>TRANSVIREX</h1>
          <p>ERP Logistique — Connexion</p>
        </div>

        {error && <div className="error-msg">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              placeholder="votre@email.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading || attempts >= 5}>
            {attempts >= 5 ? "Accès bloqué" : loading ? "Connexion..." : "Se connecter →"}
          </button>
        </form>
      </div>
    </div>
  );
}
