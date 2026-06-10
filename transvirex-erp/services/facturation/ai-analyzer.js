/**
 * Module d'analyse IA pour validation et structuration des données de facturation
 */

const VALIDATION_RULES = {
  clientNom: {
    minLength: 2,
    maxLength: 100,
    pattern: /^[a-zA-Z0-9\s\-.,&'éèêëàâäôöûüçÉÈÊËÀÂÄÔÖÛÜÇ]+$/,
    required: true,
  },
  clientAdresse: {
    minLength: 5,
    maxLength: 200,
    required: false,
  },
  montant: {
    min: 0.01,
    max: 999999.99,
    required: true,
  },
  dateEcheance: {
    required: false,
    minDaysFromNow: 1,
  },
  tva: {
    min: 0,
    max: 100,
    required: false,
    default: 20,
  },
};

/**
 * Classe d'analyse IA pour factures
 */
class FacturationAIAnalyzer {
  /**
   * Analyse et valide les données du formulaire
   */
  static analyzeFormData(formData) {
    const errors = [];
    const warnings = [];
    const cleanData = { ...formData };

    // Validation du nom du client
    if (!cleanData.clientNom) {
      errors.push("Le nom du client est obligatoire");
    } else {
      cleanData.clientNom = cleanData.clientNom.trim();

      if (
        cleanData.clientNom.length < VALIDATION_RULES.clientNom.minLength
      ) {
        errors.push(
          `Le nom du client doit contenir au moins ${VALIDATION_RULES.clientNom.minLength} caractères`
        );
      }

      if (
        cleanData.clientNom.length > VALIDATION_RULES.clientNom.maxLength
      ) {
        errors.push(
          `Le nom du client ne doit pas dépasser ${VALIDATION_RULES.clientNom.maxLength} caractères`
        );
      }

      if (!VALIDATION_RULES.clientNom.pattern.test(cleanData.clientNom)) {
        errors.push("Le nom du client contient des caractères invalides");
      }
    }

    // Validation du montant
    if (!cleanData.montant && cleanData.montant !== 0) {
      errors.push("Le montant est obligatoire");
    } else {
      const montantNum = parseFloat(cleanData.montant);
      if (isNaN(montantNum)) {
        errors.push("Le montant doit être un nombre valide");
      } else if (montantNum < VALIDATION_RULES.montant.min) {
        errors.push(
          `Le montant doit être supérieur à ${VALIDATION_RULES.montant.min}€`
        );
      } else if (montantNum > VALIDATION_RULES.montant.max) {
        errors.push(
          `Le montant ne doit pas dépasser ${VALIDATION_RULES.montant.max}€`
        );
      } else {
        cleanData.montant = montantNum;
      }
    }

    // Validation de la date d'échéance
    if (cleanData.dateEcheance) {
      const dateEch = new Date(cleanData.dateEcheance);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(dateEch.getTime())) {
        errors.push("La date d'échéance n'est pas valide");
      } else if (dateEch < today) {
        warnings.push(
          "La date d'échéance est dans le passé - elle a été ajustée"
        );
        cleanData.dateEcheance = new Date(
          today.setDate(today.getDate() + 30)
        );
      }
    } else {
      // Définir une date d'échéance par défaut (30 jours)
      const defaultEcheance = new Date();
      defaultEcheance.setDate(defaultEcheance.getDate() + 30);
      cleanData.dateEcheance = defaultEcheance;
      warnings.push("Date d'échéance définie par défaut à 30 jours");
    }

    // Validation de la TVA
    if (cleanData.tva) {
      const tvaNum = parseFloat(cleanData.tva);
      if (isNaN(tvaNum)) {
        errors.push("La TVA doit être un nombre valide");
      } else if (
        tvaNum < VALIDATION_RULES.tva.min ||
        tvaNum > VALIDATION_RULES.tva.max
      ) {
        errors.push(
          `La TVA doit être entre ${VALIDATION_RULES.tva.min}% et ${VALIDATION_RULES.tva.max}%`
        );
      } else {
        cleanData.tva = tvaNum;
      }
    } else {
      cleanData.tva = VALIDATION_RULES.tva.default;
    }

    // Analyse des lignes de facturation
    if (cleanData.lignes && Array.isArray(cleanData.lignes)) {
      cleanData.lignes = cleanData.lignes.map((ligne) => ({
        ...ligne,
        quantite: parseFloat(ligne.quantite) || 1,
        prixUnitaire: parseFloat(ligne.prixUnitaire) || 0,
      }));

      // Vérifier la cohérence du total
      const sommeDetails = cleanData.lignes.reduce(
        (sum, ligne) => sum + ligne.quantite * ligne.prixUnitaire,
        0
      );

      if (Math.abs(sommeDetails - cleanData.montant) > 0.01) {
        warnings.push(
          `Discordance détectée: somme des lignes (${sommeDetails.toFixed(2)}€) != montant (${cleanData.montant.toFixed(2)}€)`
        );
      }
    }

    // Nettoyage des notes
    if (cleanData.notes) {
      cleanData.notes = cleanData.notes.trim().substring(0, 500);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      cleanData,
      confidence: this.calculateConfidence(errors, warnings),
    };
  }

  /**
   * Calcule le score de confiance de l'analyse
   */
  static calculateConfidence(errors, warnings) {
    let confidence = 100;
    confidence -= errors.length * 30;
    confidence -= warnings.length * 10;
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Détecte et corrige les anomalies courantes
   */
  static autoCorrect(formData) {
    const corrected = { ...formData };

    // Correction des espacements multiples
    if (corrected.clientNom) {
      corrected.clientNom = corrected.clientNom.replace(/\s+/g, " ").trim();
    }

    if (corrected.clientAdresse) {
      corrected.clientAdresse = corrected.clientAdresse
        .replace(/\s+/g, " ")
        .trim();
    }

    // Correction de la capitalisation
    if (corrected.clientNom) {
      corrected.clientNom = this.capitalizeWords(corrected.clientNom);
    }

    // Suppression des caractères de devises
    if (corrected.montant) {
      corrected.montant = parseFloat(
        corrected.montant
          .toString()
          .replace(/[€$£,]/g, "")
          .replace(/\s/g, "")
      );
    }

    return corrected;
  }

  /**
   * Met en majuscule la première lettre de chaque mot
   */
  static capitalizeWords(str) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Génère un résumé de la facturation pour l'IA
   */
  static generateSummary(facture) {
    return {
      reference: facture.reference,
      client: facture.clientNom,
      montant: `${facture.montant.toFixed(2)}€`,
      statut: facture.statut,
      dateCreation: new Date(facture.createdAt).toLocaleDateString("fr-FR"),
      dateEcheance: facture.dateEcheance
        ? new Date(facture.dateEcheance).toLocaleDateString("fr-FR")
        : "Non définie",
      notes: facture.notes ? facture.notes.substring(0, 100) : "Aucune",
    };
  }

  /**
   * Extrait les informations client d'un texte non structuré
   */
  static extractClientInfo(text) {
    const lines = text.split("\n");
    const result = {
      clientNom: "",
      clientAdresse: "",
    };

    // Heuristique simple: première ligne = nom, reste = adresse
    if (lines.length > 0) {
      result.clientNom = lines[0].trim();
      if (lines.length > 1) {
        result.clientAdresse = lines.slice(1).join(", ").trim();
      }
    }

    return result;
  }
}

module.exports = FacturationAIAnalyzer;
