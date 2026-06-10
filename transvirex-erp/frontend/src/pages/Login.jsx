import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { login } from "../services/api";
import bg from "../assets/bg-login.jpeg";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "password" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

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
    <div
      style={{
        height: "100vh",
        width: "100%",
        position: "relative",
        fontFamily: "Arial, sans-serif",
        display: "flex",
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      {/* BACKGROUND IMAGE */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          zIndex: 0
        }}
      />

      {/* SIMPLE DARK OVERLAY (IMPORTANT) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          zIndex: 1
        }}
      />

      {/* CARD */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "380px",
          padding: "30px",
          borderRadius: "16px",
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.2)",
          textAlign: "center"
        }}
      >
        {/* LOGO */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "40px" }}>🚚</div>
          <h1 style={{ margin: "10px 0", color: "#0b2c5e" }}>
            TRANSVIREX
          </h1>
          <p style={{ color: "#3f3e3e" }}>ERP Logistique — Connexion</p>
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              background: "#ffe5e5",
              color: "#d60000",
              padding: "10px",
              borderRadius: "8px",
              marginBottom: "15px",
              fontSize: "14px"
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          {/* EMAIL */}
          <div style={{ marginBottom: "15px", textAlign: "left" }}>
            <label>Email</label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#fff",
                borderRadius: "8px",
                padding: "8px",
                marginTop: "5px"
              }}
            >
              <span style={{ marginRight: "8px" }}>📧</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                style={{
                  border: "none",
                  outline: "none",
                  width: "100%"
                }}
                required
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div style={{ marginBottom: "20px", textAlign: "left" }}>
            <label>Mot de passe</label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "#fff",
                borderRadius: "8px",
                padding: "8px",
                marginTop: "5px"
              }}
            >
              <span style={{ marginRight: "8px" }}>🔒</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
                style={{
                  border: "none",
                  outline: "none",
                  width: "100%"
                }}
                required
              />
            </div>
          </div>

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading || attempts >= 5}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(90deg, #7c3aed, #a855f7)",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            {attempts >= 5
              ? "Accès bloqué"
              : loading
              ? "Connexion..."
              : "Se connecter →"}
          </button>
        </form>

        {/* FOOTER */}
        <div
          style={{
            marginTop: "15px",
            fontSize: "12px",
            color: "#555"
          }}
        >
          🔒 Accès sécurisé
        </div>
      </div>
    </div>
  );
}