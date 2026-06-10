const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// Créer répertoire d'archivage s'il n'existe pas
const ARCHIVE_DIR = path.join(__dirname, "../../archives/factures");
if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

/**
 * Génère une facture PDF professionnelle
 * @param {Object} factureData - Données de la facture
 * @returns {Promise<{path: string, filename: string}>}
 */
async function generateFacturePDF(factureData) {
  return new Promise((resolve, reject) => {
    try {
      const {
        reference,
        clientNom,
        clientAdresse = "Non spécifiée",
        montant,
        dateCreation = new Date(),
        dateEcheance,
        notes = "",
        lignes = [],
        companyName = "TRANSVIREX ERP",
        companyAdresse = "123 Rue de l'Innovation, 75000 Paris",
        companyPhone = "+33 1 23 45 67 89",
        companyEmail = "contact@transvirex.fr",
        companyLogo = "",
        tva = 20,
      } = factureData;

      const filename = `${reference}_${Date.now()}.pdf`;
      const filepath = path.join(ARCHIVE_DIR, filename);

      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
      });

      // Stream vers fichier
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // ─── EN-TÊTE ───────────────────────────────────
      doc.fontSize(20).font("Helvetica-Bold").text("FACTURE", 50, 50);

      // Infos entreprise (à gauche)
      doc
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(companyName, 50, 100);
      doc.fontSize(9).font("Helvetica").text(companyAdresse, 50, 120);
      doc.text(`Tél: ${companyPhone}`, 50, 135);
      doc.text(`Email: ${companyEmail}`, 50, 150);

      // Numéro et dates (à droite)
      doc.fontSize(11).font("Helvetica-Bold");
      doc.text(`N° Facture: ${reference}`, 350, 100);

      doc.fontSize(9).font("Helvetica");
      const dateFormat = (date) =>
        new Date(date).toLocaleDateString("fr-FR");
      doc.text(`Date: ${dateFormat(dateCreation)}`, 350, 120);
      if (dateEcheance) {
        doc.text(`Échéance: ${dateFormat(dateEcheance)}`, 350, 135);
      }

      // ─── CLIENT ────────────────────────────────────
      doc.fontSize(10).font("Helvetica-Bold").text("FACTURÉ À:", 50, 200);
      doc.fontSize(9).font("Helvetica");
      doc.text(clientNom, 50, 220);
      doc.text(clientAdresse, 50, 235);

      // ─── TABLEAU DE LIGNES ─────────────────────────
      const tableTop = 280;
      const tableData = [
        { label: "Description", width: 280, x: 50 },
        { label: "Quantité", width: 80, x: 330 },
        { label: "Prix unitaire", width: 80, x: 410 },
        { label: "Total", width: 80, x: 490 },
      ];

      // En-têtes du tableau
      doc.fontSize(9).font("Helvetica-Bold");
      tableData.forEach((col) => {
        doc.text(col.label, col.x, tableTop);
      });

      // Ligne de séparation
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      let currentY = tableTop + 25;
      let totalHT = 0;

      // Remplir les lignes
      if (lignes && lignes.length > 0) {
        lignes.forEach((ligne) => {
          const { description = "", quantite = 1, prixUnitaire = 0 } = ligne;
          const total = quantite * prixUnitaire;
          totalHT += total;

          doc.fontSize(8).font("Helvetica");
          doc.text(description, 50, currentY, { width: 280, ellipsis: true });
          doc.text(quantite.toString(), 330, currentY);
          doc.text(`${prixUnitaire.toFixed(2)} €`, 410, currentY);
          doc.text(`${total.toFixed(2)} €`, 490, currentY);

          currentY += 20;
        });
      } else {
        // Ligne unique avec le montant total
        doc.fontSize(8).font("Helvetica");
        doc.text("Montant facturé", 50, currentY, {
          width: 280,
          ellipsis: true,
        });
        doc.text("1", 330, currentY);
        doc.text(`${montant.toFixed(2)} €`, 410, currentY);
        doc.text(`${montant.toFixed(2)} €`, 490, currentY);
        totalHT = montant;
        currentY += 20;
      }

      // Ligne de séparation
      currentY += 5;
      doc
        .moveTo(50, currentY)
        .lineTo(550, currentY)
        .stroke();

      // ─── TOTAUX ────────────────────────────────────
      currentY += 15;

      const montantHT = totalHT || montant;
      const montantTVA = montantHT * (tva / 100);
      const montantTTC = montantHT + montantTVA;

      doc.fontSize(9).font("Helvetica");
      doc.text("Montant HT", 380, currentY);
      doc.text(`${montantHT.toFixed(2)} €`, 490, currentY);

      currentY += 20;
      doc.text(`TVA (${tva}%)`, 380, currentY);
      doc.text(`${montantTVA.toFixed(2)} €`, 490, currentY);

      currentY += 20;
      doc.fontSize(11).font("Helvetica-Bold");
      doc.text("MONTANT TTC", 380, currentY);
      doc.text(`${montantTTC.toFixed(2)} €`, 490, currentY);

      // ─── NOTES ─────────────────────────────────────
      if (notes) {
        doc.fontSize(8).font("Helvetica").text("Notes:", 50, currentY + 40);
        doc.text(notes, 50, currentY + 55, { width: 500 });
      }

      // ─── PIED DE PAGE ──────────────────────────────
      const pageHeight = doc.page.height;
      doc.fontSize(8).font("Helvetica");
      doc.text(
        "Merci de votre confiance | Conditions de paiement: 30 jours",
        50,
        pageHeight - 50,
        { align: "center" }
      );
      doc.text(
        "TRANSVIREX ERP - Tous droits réservés",
        50,
        pageHeight - 30,
        { align: "center" }
      );

      // Finaliser le PDF
      doc.end();

      stream.on("finish", () => {
        resolve({ path: filepath, filename, reference });
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Récupère un PDF archivé
 */
function getArchivedPDF(filename) {
  const filepath = path.join(ARCHIVE_DIR, filename);
  if (fs.existsSync(filepath)) {
    return filepath;
  }
  return null;
}

/**
 * Liste tous les PDFs archivés
 */
function listArchivedPDFs() {
  if (!fs.existsSync(ARCHIVE_DIR)) {
    return [];
  }
  return fs.readdirSync(ARCHIVE_DIR).filter((f) => f.endsWith(".pdf"));
}

module.exports = {
  generateFacturePDF,
  getArchivedPDF,
  listArchivedPDFs,
  ARCHIVE_DIR,
};
