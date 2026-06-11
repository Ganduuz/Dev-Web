import { useState } from "react";

const API = "http://localhost:3000";

function AnomalyCard({ anomaly }) {
  const colors = { CRITIQUE: "#ef4444", ATTENTION: "#f59e0b", INFO: "#3b82f6" };
  const color = colors[anomaly.niveau] || "#6b7280";
  return (
    <div style={{ background: "#1e2235", borderRadius: 10, padding: 14, borderLeft: `4px solid ${color}`, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color, fontWeight: "bold", fontSize: 13 }}>{anomaly.niveau}</span>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{anomaly.type}</span>
      </div>
      <div style={{ color: "#e2e8f0", fontSize: 14, marginBottom: 4 }}>{anomaly.description}</div>
      <div style={{ color: "#94a3b8", fontSize: 12 }}>Action: {anomaly.action_recommandee}</div>
    </div>
  );
}

function KpiCard({ item }) {
  const colors = { bon: "#10b981", moyen: "#f59e0b", mauvais: "#ef4444" };
  const color = colors[item.statut] || "#6b7280";
  return (
    <div style={{ background: "#1e2235", borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "#e2e8f0", fontWeight: "bold", fontSize: 14 }}>{item.indicateur}</span>
        <span style={{ color, fontWeight: "bold", fontSize: 16 }}>{item.valeur}</span>
      </div>
      <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 4 }}>{item.interpretation}</div>
      <div style={{ color: "#6366f1", fontSize: 12 }}>Recommandation: {item.recommandation}</div>
    </div>
  );
}

function AssignmentCard({ assignment }) {
  const colors = { haute: "#ef4444", moyenne: "#f59e0b", basse: "#10b981" };
  const color = colors[assignment.priority] || "#6b7280";
  return (
    <div style={{ background: "#1e2235", borderRadius: 10, padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: "#e2e8f0", fontWeight: "bold" }}>{assignment.mission_id}</span>
        <span style={{ color, fontSize: 12, fontWeight: "bold", textTransform: "uppercase" }}>{assignment.priority}</span>
      </div>
      <div style={{ color: "#10b981", fontSize: 13, marginBottom: 4 }}>Chauffeur: {assignment.driver_name}</div>
      <div style={{ color: "#94a3b8", fontSize: 12 }}>{assignment.reason}</div>
    </div>
  );
}

function ResultPanel({ result }) {
  if (!result) return null;
  if (result.type === "optimize") {
    return (
      <div style={{ background: "#151827", borderRadius: 12, padding: 16, marginTop: 12 }}>
        <div style={{ color: "#6366f1", fontWeight: "bold", marginBottom: 12, fontSize: 15 }}>Optimisation des missions</div>
        <div style={{ background: "#1e2235", borderRadius: 8, padding: 10, marginBottom: 12, color: "#e2e8f0", fontSize: 13 }}>{result.data.summary}</div>
        {result.data.assignments?.map((a, i) => <AssignmentCard key={i} assignment={a} />)}
        {result.data.unassigned?.length > 0 && <div style={{ color: "#f59e0b", fontSize: 13 }}>Non assignees: {result.data.unassigned.join(", ")}</div>}
      </div>
    );
  }
  if (result.type === "anomalies") {
    return (
      <div style={{ background: "#151827", borderRadius: 12, padding: 16, marginTop: 12 }}>
        <div style={{ color: "#f59e0b", fontWeight: "bold", marginBottom: 8, fontSize: 15 }}>Anomalies detectees</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ background: "#1e2235", borderRadius: 8, padding: "8px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: "bold", color: result.data.score_sante >= 80 ? "#10b981" : result.data.score_sante >= 60 ? "#f59e0b" : "#ef4444" }}>{result.data.score_sante}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Score sante</div>
          </div>
          <div style={{ color: "#e2e8f0", fontSize: 13, flex: 1 }}>{result.data.resume}</div>
        </div>
        {result.data.anomalies?.map((a, i) => <AnomalyCard key={i} anomaly={a} />)}
      </div>
    );
  }
  if (result.type === "kpi") {
    return (
      <div style={{ background: "#151827", borderRadius: 12, padding: 16, marginTop: 12 }}>
        <div style={{ color: "#10b981", fontWeight: "bold", marginBottom: 8, fontSize: 15 }}>Analyse KPI</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <div style={{ background: "#1e2235", borderRadius: 8, padding: "8px 16px", textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 28, fontWeight: "bold", color: "#10b981" }}>{result.data.score_global}</div>
            <div style={{ fontSize: 11, color: "#94a3b8" }}>Score global</div>
          </div>
          <div style={{ flex: 2 }}>
            <div style={{ fontSize: 12, color: "#10b981", marginBottom: 4 }}>Points forts: {result.data.points_forts?.join(", ")}</div>
            <div style={{ fontSize: 12, color: "#f59e0b" }}>A ameliorer: {result.data.points_amelioration?.join(", ")}</div>
          </div>
        </div>
        {result.data.analyse?.map((k, i) => <KpiCard key={i} item={k} />)}
        <div style={{ background: "#1e2235", borderRadius: 8, padding: 10, color: "#94a3b8", fontSize: 12, marginTop: 8 }}>{result.data.conclusion}</div>
      </div>
    );
  }
  return null;
}

export default function NexusAI() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Bonjour ! Je suis NEXUS, votre agent IA logistique. Comment puis-je vous aider ?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/ai/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: input, session_id: "dashboard" }) });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply || data.error }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Erreur de connexion." }]); }
    setLoading(false);
  };

  const runOptimize = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/ai/optimize`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ missions: [{ id: "M1", client: "Client A", distance: 15 }], drivers: [{ id: "D1", nom: "Jean Dupont", disponible: true }] }) });
      const data = await res.json();
      setResult({ type: "optimize", data });
      setMessages(prev => [...prev, { role: "user", content: "Optimise les missions en cours" }, { role: "assistant", content: "Voici le resultat de l optimisation :" }]);
    } catch { } setLoading(false);
  };

  const runAnomalies = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/ai/anomalies`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ missions: [], trackings: [], drivers: [] }) });
      const data = await res.json();
      setResult({ type: "anomalies", data });
      setMessages(prev => [...prev, { role: "user", content: "Detecte les anomalies" }, { role: "assistant", content: "Voici les anomalies detectees :" }]);
    } catch { } setLoading(false);
  };

  const runKPI = async () => {
    setLoading(true); setResult(null);
    try {
      const res = await fetch(`${API}/ai/kpi-analysis`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kpi: { taux_livraison: "87%", retards: "45min", satisfaction: "4.2/5" } }) });
      const data = await res.json();
      setResult({ type: "kpi", data });
      setMessages(prev => [...prev, { role: "user", content: "Analyse les KPI" }, { role: "assistant", content: "Voici l analyse des KPI :" }]);
    } catch { } setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#0f1117", color: "#e2e8f0", fontFamily: "sans-serif" }}>
      <div style={{ padding: "14px 24px", background: "#1a1d2e", borderBottom: "1px solid #2d3748", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", fontSize: 17, color: "white" }}>N</div>
        <div><div style={{ fontWeight: "bold", fontSize: 17 }}>NEXUS AI</div><div style={{ fontSize: 11, color: "#10b981" }}>Agent operationnel</div></div>
      </div>
      <div style={{ padding: "10px 24px", background: "#1a1d2e", borderBottom: "1px solid #2d3748", display: "flex", gap: 8 }}>
        <button onClick={runOptimize} disabled={loading} style={{ padding: "7px 14px", background: "#6366f1", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Optimiser missions</button>
        <button onClick={runAnomalies} disabled={loading} style={{ padding: "7px 14px", background: "#f59e0b", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Anomalies</button>
        <button onClick={runKPI} disabled={loading} style={{ padding: "7px 14px", background: "#10b981", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>Analyser KPI</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "70%", padding: "10px 14px", borderRadius: 12, background: msg.role === "user" ? "#6366f1" : "#1e2235", color: "#e2e8f0", fontSize: 14 }}>{msg.content}</div>
          </div>
        ))}
        <ResultPanel result={result} />
        {loading && <div style={{ padding: "10px 14px", borderRadius: 12, background: "#1e2235", color: "#6366f1", width: "fit-content" }}>NEXUS analyse...</div>}
      </div>
      <div style={{ padding: 14, background: "#1a1d2e", borderTop: "1px solid #2d3748", display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendMessage()} placeholder="Posez une question a NEXUS..." style={{ flex: 1, padding: "11px 14px", borderRadius: 8, border: "1px solid #2d3748", background: "#0f1117", color: "#e2e8f0", fontSize: 14, outline: "none" }} />
        <button onClick={sendMessage} disabled={loading} style={{ padding: "11px 18px", background: "#6366f1", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: "bold" }}>Envoyer</button>
      </div>
    </div>
  );
}
