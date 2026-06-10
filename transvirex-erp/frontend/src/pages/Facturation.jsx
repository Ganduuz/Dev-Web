import { useState, useEffect } from "react";
import {
  getFactures,
  getFactureStats,
  createFacture,
  updateFactStatut,
  addRelance,
  deleteFacture,
  getCompletedMissions,
  analyzeFactureData,
  generateFacturePDF,
  downloadFacturePDF,
  validateFacture,
  listArchivedPDFs,
} from "../services/api";

const STATUTS = ["en_attente", "envoyee", "payee", "en_retard", "annulee"];
const BADGE = {
  en_attente: "badge-gray",
  envoyee: "badge-blue",
  payee: "badge-green",
  en_retard: "badge-red",
  annulee: "badge-gray",
};

export default function FacturationEnhanced() {
  const [factures, setFactures] = useState([]);
  const [livraisons, setLivraisons] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRel, setShowRel] = useState(null);
  const [filter, setFilter] = useState("");
  const [missionSearch, setMissionSearch] = useState("");
  const [form, setForm] = useState({
    missionId: "",
    clientNom: "",
    clientAdresse: "",
    montant: "",
    tva: 20,
    notes: "",
    dateEcheance: "",
  });
  const [relMsg, setRelMsg] = useState("");
  const [msg, setMsg] = useState("");
  const [archivedPDFs, setArchivedPDFs] = useState([]);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(null);

  const missionReferenceMap = Object.fromEntries(
    livraisons.map((m) => [m._id, m.reference])
  );
  const filteredLivraisons = livraisons.filter((m) => {
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
        listArchivedPDFs(),
      ]);

      const f = results[0];
      const s = results[1];
      const l = results[2];
      const p = results[3];

      if (f.status === "fulfilled") setFactures(f.value.data);
      else console.error("Factures error:", f.reason);

      if (s.status === "fulfilled") setStats(s.value.data);
      else console.error("Stats error:", s.reason);

      if (l.status === "fulfilled") setLivraisons(l.value.data);
      else console.error("Livraisons error:", l.reason);

      if (p.status === "fulfilled") setArchivedPDFs(p.value.data?.pdfs || []);
      else console.error("PDFs error:", p.reason);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function handleAnalyzeForm() {
    setIsAnalyzing(true);
    try {
      const response = await analyzeFactureData({
        clientNom: form.clientNom,
        clientAdresse: form.clientAdresse,
        montant: parseFloat(form.montant),
        dateEcheance: form.dateEcheance,
        tva: parseFloat(form.tva),
        notes: form.notes,
      });

      setAnalysisResult(response.data);

      if (response.data.isValid) {
        setMsg(`✅ Données analysées - Confiance: ${response.data.confidence}%`);
      } else {
        setMsg(`⚠️ ${response.data.errors.length} erreur(s) détectée(s)`);
      }
    } catch (err) {
      setMsg("❌ Erreur lors de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();

    if (!analysisResult?.isValid) {
      setMsg("❌ Veuillez d'abord analyser et valider les données");
      return;
    }

    try {
      const newFacture = await createFacture({
        ...form,
        montant: parseFloat(form.montant),
        tva: parseFloat(form.tva),
        dateEcheance: form.dateEcheance
          ? new Date(form.dateEcheance).toISOString()
          : undefined,
      });

      setShowModal(false);
      setForm({
        missionId: "",
        clientNom: "",
        clientAdresse: "",
        montant: "",
        tva: 20,
        notes: "",
        dateEcheance: "",
      });
      setAnalysisResult(null);
      setMsg("✅ Facture créée avec succès!");

      setTimeout(() => setMsg(""), 3000);
      load();

      // Générer automatiquement le PDF
      setTimeout(() => {
        handleGeneratePDF(newFacture.data._id);
      }, 500);
    } catch (err) {
      alert(err.response?.data?.error || "Erreur");
    }
  }

  function handleSelectMission(missionId) {
    const mission = livraisons.find((m) => m._id === missionId);
    setMissionSearch("");
    setForm((prev) => ({
      ...prev,
      missionId,
      clientNom: mission?.clientNom || "",
      clientAdresse: mission?.adresseArrivee || "",
      montant: mission?.montant || "",
      notes: mission
        ? `Facture générée depuis mission ${mission.reference}`
        : prev.notes,
      dateEcheance: prev.dateEcheance,
    }));
    setAnalysisResult(null);
  }

  async function handleStatut(id, statut) {
    try {
      await updateFactStatut(id, statut);
      load();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleGeneratePDF(factureId) {
    setIsGeneratingPDF(factureId);
    try {
      const response = await generateFacturePDF(factureId);
      setMsg(`✅ PDF généré: ${response.data.filename}`);
      setTimeout(() => setMsg(""), 4000);
      load();
    } catch (err) {
      setMsg(`❌ Erreur PDF: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsGeneratingPDF(null);
    }
  }

  async function handleDownloadPDF(factureId, reference) {
    try {
      const response = await downloadFacturePDF(factureId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${reference}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erreur lors du téléchargement");
    }
  }

  async function handleGenerateFromMission(mission) {
    try {
      const newFacture = await createFacture({
        missionId: mission._id,
        clientNom: mission.clientNom,
        clientAdresse: mission.adresseArrivee || "",
        montant: mission.montant || 0,
        tva: 20,
        notes: mission.notes || "Facture générée depuis mission livrée",
        dateEcheance: new Date(new Date().setDate(new Date().getDate() + 30)),
      });

      setMsg("✅ Facture générée depuis livraison!");
      setTimeout(() => setMsg(""), 3000);

      // Générer automatiquement le PDF
      setTimeout(() => {
        handleGeneratePDF(newFacture.data._id);
      }, 300);

      load();
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors de la génération");
    }
  }

  async function handleRelance(e) {
    e.preventDefault();
    try {
      await addRelance(showRel, { message: relMsg });
      setShowRel(null);
      setRelMsg("");
      setMsg("📨 Relance envoyée");
      load();
    } catch (err) {
      alert(err.response?.data?.error || "Erreur");
    }
  }

  return (
    <div>
      <div className="topbar">
        <span className="topbar-title">💶 Facturation & Archivage PDF</span>
        <div className="topbar-actions">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: 150 }}
          >
            <option value="">Tous statuts</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Nouvelle facture
          </button>
        </div>
      </div>
      <div className="page-content">
        {msg && (
          <div
            className="alert"
            style={{
              background: msg.includes("✅")
                ? "#d4edda"
                : msg.includes("❌")
                  ? "#f8d7da"
                  : "#fff3cd",
              color: msg.includes("✅")
                ? "#155724"
                : msg.includes("❌")
                  ? "#721c24"
                  : "#856404",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              border: "1px solid currentColor",
            }}
          >
            {msg}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">📄</div>
              <div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total factures</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">💰</div>
              <div>
                <div className="stat-value">
                  {stats.payees?.montant?.toFixed(0)}€
                </div>
                <div className="stat-label">
                  Payées ({stats.payees?.count})
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">⏳</div>
              <div>
                <div className="stat-value">
                  {stats.enAttente?.montant?.toFixed(0)}€
                </div>
                <div className="stat-label">
                  En attente ({stats.enAttente?.count})
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">🔴</div>
              <div>
                <div className="stat-value">
                  {stats.enRetard?.montant?.toFixed(0)}€
                </div>
                <div className="stat-label">
                  En retard ({stats.enRetard?.count})
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple">📦</div>
              <div>
                <div className="stat-value">{archivedPDFs.length}</div>
                <div className="stat-label">PDFs archivés</div>
              </div>
            </div>
          </div>
        )}

        {/* PDFs archivés récents */}
        {archivedPDFs.length > 0 && (
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-title">📦 PDFs Archivés Récents</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "12px",
              }}
            >
              {archivedPDFs.slice(0, 5).map((pdf) => (
                <div
                  key={pdf._id}
                  style={{
                    padding: "12px",
                    background: "var(--bg-secondary)",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                    {pdf.reference}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--gray)" }}>
                    {pdf.clientNom}
                  </div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      color: "var(--primary)",
                      marginTop: "8px",
                    }}
                  >
                    {pdf.montant}€
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ width: "100%", marginTop: "8px" }}
                    onClick={() =>
                      handleDownloadPDF(pdf._id, pdf.reference)
                    }
                  >
                    📥 Télécharger
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Livraisons terminées */}
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
                  {livraisons.map((m) => (
                    <tr key={m._id}>
                      <td>{m.reference}</td>
                      <td>{m.clientNom}</td>
                      <td>
                        {m.dateLivraison
                          ? new Date(m.dateLivraison).toLocaleDateString(
                              "fr-FR"
                            )
                          : "—"}
                      </td>
                      <td>{m.montant || 0}€</td>
                      <td>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleGenerateFromMission(m)}
                        >
                          🧾 Créer facture & PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Factures */}
        <div className="card">
          {loading ? (
            <div className="loading">
              <div className="spinner" />
            </div>
          ) : factures.length === 0 ? (
            <div className="empty-state">
              <div className="icon">💶</div>
              <p>Aucune facture</p>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Client</th>
                    <th>Montant</th>
                    <th>Échéance</th>
                    <th>Statut</th>
                    <th>PDF</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {factures.map((f) => (
                    <tr key={f._id}>
                      <td>
                        <b>{f.reference}</b>
                      </td>
                      <td>{f.clientNom}</td>
                      <td>
                        <b>{f.montant}€</b>
                      </td>
                      <td>
                        {f.dateEcheance
                          ? new Date(f.dateEcheance).toLocaleDateString(
                              "fr-FR"
                            )
                          : "—"}
                      </td>
                      <td>
                        <span className={`badge ${BADGE[f.statut]}`}>
                          {f.statut}
                        </span>
                      </td>
                      <td>
                        {f.pdfUrl ? (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() =>
                              handleDownloadPDF(f._id, f.reference)
                            }
                          >
                            📥 Télécharger
                          </button>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleGeneratePDF(f._id)}
                            disabled={isGeneratingPDF === f._id}
                          >
                            {isGeneratingPDF === f._id
                              ? "⏳ Génération..."
                              : "📄 Générer"}
                          </button>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <select
                            style={{
                              padding: "4px 8px",
                              fontSize: 12,
                              borderRadius: 6,
                              border: "1px solid var(--border)",
                            }}
                            value={f.statut}
                            onChange={(e) =>
                              handleStatut(f._id, e.target.value)
                            }
                          >
                            {STATUTS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setShowRel(f._id)}
                          >
                            📨
                          </button>
                          <button
                            className="btn btn-red btn-sm"
                            onClick={async () => {
                              await deleteFacture(f._id);
                              load();
                            }}
                          >
                            🗑
                          </button>
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

      {/* Modal créer facture avec IA */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowModal(false)
          }
        >
          <div className="modal" style={{ maxHeight: "90vh", overflow: "auto" }}>
            <div className="modal-title">🤖 Nouvelle facture - Analyse IA</div>
            <form onSubmit={handleCreate}>
              {/* Mission */}
              <div className="form-group">
                <label className="form-label">Mission terminée</label>
                <input
                  type="search"
                  value={missionSearch}
                  onChange={(e) => setMissionSearch(e.target.value)}
                  placeholder="Rechercher par référence, client ou adresse"
                  style={{
                    marginBottom: 10,
                    width: "100%",
                    padding: "10px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                  }}
                />
                <select
                  value={form.missionId}
                  onChange={(e) => handleSelectMission(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="">
                    -- Choisir une mission livrée --
                  </option>
                  {filteredLivraisons.length > 0 ? (
                    filteredLivraisons.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.reference} — {m.clientNom} — {m.adresseDepart.split(",")[0]}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      Aucune mission livrée disponible
                    </option>
                  )}
                </select>
              </div>

              {/* Client */}
              <div className="form-group">
                <label className="form-label">Nom du client</label>
                <input
                  value={form.clientNom}
                  onChange={(e) =>
                    setForm({ ...form, clientNom: e.target.value })
                  }
                  placeholder="Nom du client"
                  required
                />
              </div>

              {/* Adresse */}
              <div className="form-group">
                <label className="form-label">Adresse du client</label>
                <input
                  value={form.clientAdresse}
                  onChange={(e) =>
                    setForm({ ...form, clientAdresse: e.target.value })
                  }
                  placeholder="Adresse de facturation"
                />
              </div>

              {/* Montant et TVA */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Montant HT (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.montant}
                    onChange={(e) =>
                      setForm({ ...form, montant: e.target.value })
                    }
                    placeholder="Ex: 150.00"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">TVA (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.tva}
                    onChange={(e) =>
                      setForm({ ...form, tva: e.target.value })
                    }
                    placeholder="20"
                  />
                </div>
              </div>

              {/* Échéance */}
              <div className="form-group">
                <label className="form-label">Date d'échéance</label>
                <input
                  type="date"
                  value={form.dateEcheance}
                  onChange={(e) =>
                    setForm({ ...form, dateEcheance: e.target.value })
                  }
                />
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes (optionnel)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm({ ...form, notes: e.target.value })
                  }
                  rows={2}
                  placeholder="Notes de facturation..."
                />
              </div>

              {/* Analyse IA */}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAnalyzeForm}
                disabled={!form.clientNom || !form.montant || isAnalyzing}
                style={{ width: "100%", marginBottom: 12 }}
              >
                {isAnalyzing ? "⏳ Analyse en cours..." : "🔍 Analyser les données"}
              </button>

              {/* Résultat analyse */}
              {analysisResult && (
                <div
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    marginBottom: "12px",
                    background: analysisResult.isValid
                      ? "#d4edda"
                      : "#f8d7da",
                    border: "1px solid",
                    borderColor: analysisResult.isValid ? "#c3e6cb" : "#f5c6cb",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      marginBottom: "8px",
                      color: analysisResult.isValid ? "#155724" : "#721c24",
                    }}
                  >
                    {analysisResult.isValid ? "✅" : "❌"}{" "}
                    Confiance: {analysisResult.confidence}%
                  </div>

                  {analysisResult.errors.length > 0 && (
                    <div style={{ marginBottom: "8px", color: "#721c24" }}>
                      <strong>Erreurs:</strong>
                      <ul style={{ marginTop: "4px", paddingLeft: "20px" }}>
                        {analysisResult.errors.map((err, i) => (
                          <li key={i} style={{ fontSize: "12px" }}>
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.warnings.length > 0 && (
                    <div style={{ color: "#856404" }}>
                      <strong>Avertissements:</strong>
                      <ul style={{ marginTop: "4px", paddingLeft: "20px" }}>
                        {analysisResult.warnings.map((warn, i) => (
                          <li key={i} style={{ fontSize: "12px" }}>
                            {warn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!analysisResult?.isValid}
                >
                  ✅ Créer facture & PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal relance */}
      {showRel && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowRel(null)
          }
        >
          <div className="modal">
            <div className="modal-title">📨 Envoyer une relance</div>
            <form onSubmit={handleRelance}>
              <div className="form-group">
                <label className="form-label">Message de relance</label>
                <textarea
                  value={relMsg}
                  onChange={(e) => setRelMsg(e.target.value)}
                  rows={4}
                  placeholder="Bonjour, nous vous rappelons que la facture..."
                  required
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowRel(null)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-amber"
                  style={{ background: "var(--amber)", color: "white" }}
                >
                  Envoyer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
