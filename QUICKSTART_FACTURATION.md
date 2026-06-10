# 🚀 Guide de Démarrage Rapide - Système Facturation IA

## 1️⃣ Installation des dépendances

### Backend (Facturation Service)
```bash
cd services/facturation
npm install
```

**Nouvelles dépendances:**
- `pdfkit@^0.13.0` - Génération PDF
- `dotenv@^16.0.3` - Gestion .env
- `axios@^1.6.0` - Requêtes HTTP

### Frontend
```bash
cd frontend
# Les dépendances sont déjà installées
# Vérifier que axios est présent
npm list axios
```

---

## 2️⃣ Configuration

### Backend
```bash
# Créer .env depuis template
cp services/facturation/.env.example services/facturation/.env

# Ou définir manuellement les variables
export MONGO_URL=mongodb://mongo:27017/erp
export PORT=3004
```

### Frontend
```javascript
// Dans src/services/api.js - déjà configuré
const API = axios.create({ baseURL: "http://localhost:3000" });
```

---

## 3️⃣ Démarrage

### Docker Compose (Recommandé)

```bash
cd transvirex-erp

# Démarrer tous les services
docker-compose up -d

# Vérifier facturation service
curl http://localhost:3004/health

# Réponse attendue:
# {"status":"ok","service":"facturation"}
```

### Manual (Développement)

```bash
# Terminal 1 - Facturation Service
cd services/facturation
npm start
# "Facturation service running on port 3004 🚀"

# Terminal 2 - Frontend (s'il n'est pas containerisé)
cd frontend
npm start
# "Compiled successfully!"
```

---

## 4️⃣ Premiers tests

### Tester l'API Analyse

```bash
# 1. Analyser des données invalides
curl -X POST http://localhost:3004/facturation/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "clientNom": "A",
    "montant": -50,
    "tva": 150
  }'

# Réponse: isValid: false, avec erreurs

# 2. Analyser des données valides
curl -X POST http://localhost:3004/facturation/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "clientNom": "Acme Corporation",
    "clientAdresse": "123 Rue de Paris",
    "montant": 500.50,
    "dateEcheance": "2025-12-31",
    "tva": 20,
    "notes": "Paiement dans 30 jours"
  }'

# Réponse: isValid: true, confidence: 100%
```

### Via Interface Frontend

1. Aller sur page **Facturation**
2. Cliquer **+ Nouvelle facture**
3. Remplir le formulaire
4. Cliquer **🔍 Analyser les données**
5. Voir les résultats IA
6. Si valide, cliquer **✅ Créer facture & PDF**

---

## 5️⃣ Vérifier les PDFs générés

### Localiser les fichiers

```bash
# Sur le serveur
ls -la archives/factures/

# Vous devriez voir:
# FAC-0001_1715000000000.pdf
# FAC-0002_1715001000000.pdf
# ...
```

### Vérifier via API

```bash
# Lister tous les PDFs archivés
curl http://localhost:3004/facturation/pdfs/list

# Réponse:
{
  "total": 5,
  "pdfs": [
    {
      "_id": "...",
      "reference": "FAC-0001",
      "clientNom": "Acme",
      "montant": 500.50,
      "pdfFilename": "FAC-0001_1715000000000.pdf",
      "pdfUrl": "/factures/FAC-0001_1715000000000.pdf"
    }
  ]
}
```

### Télécharger un PDF

```bash
# Depuis le terminal
curl -X GET http://localhost:3004/facturation/[FACTURE_ID]/download-pdf \
  --output facture.pdf

# Vérifier le fichier
file facture.pdf
# facture.pdf: PDF document, version 1.4
```

---

## 6️⃣ Workflows pratiques

### Workflow 1: Créer une facture manuelle

```
Frontend:
  1. Cliquer "+ Nouvelle facture"
  2. Remplir:
     - Nom client: "ACME Corp"
     - Adresse: "123 Rue de Paris"
     - Montant: "1500.00"
     - TVA: "20"
     - Date échéance: "2025-12-31"
  3. Cliquer "🔍 Analyser"
  4. Résultat: ✅ Données valides - Confiance 100%
  5. Cliquer "✅ Créer facture & PDF"

Backend:
  - Facture créée en BD
  - PDF généré automatiquement
  - Archivé dans /archives/factures/

Frontend:
  - Message: "✅ Facture créée avec succès!"
  - PDF visible dans "📦 PDFs Archivés Récents"
  - Bouton "📥 Télécharger" disponible
```

### Workflow 2: Générer depuis livraison

```
Frontend:
  1. Aller à "🚚 Livraisons terminées"
  2. Voir liste des missions livrées
  3. Cliquer "🧾 Créer facture & PDF" sur une mission

Backend:
  - Facture créée avec données mission
  - PDF généré automatiquement
  - Lien établi mission ↔ facture

Frontend:
  - Facture apparaît dans tableau
  - PDF téléchargeable immédiatement
```

### Workflow 3: Corriger et revalider

```
Frontend:
  1. Formulaire avec erreurs
  2. Cliquer "🔍 Analyser"
  3. Voir erreurs en rouge
  4. Corriger les champs
  5. Cliquer "🔍 Analyser" à nouveau
  6. Si ✅ valide, cliquer "✅ Créer"
```

---

## 7️⃣ Debugging

### Les PDFs ne sont pas générés

```bash
# 1. Vérifier que le répertoire existe
mkdir -p archives/factures
chmod 755 archives/factures

# 2. Vérifier les logs du service
docker logs transvirex-facturation-service

# 3. Vérifier pdfkit est installé
cd services/facturation
npm list pdfkit
```

### L'analyse IA toujours invalide

```javascript
// Vérifier les règles de validation dans ai-analyzer.js
// Montant doit être: 0.01 à 999999.99
// Nom client: 2-100 caractères
// Date: >= aujourd'hui

// Exemple valide:
{
  "clientNom": "AB",  // Min 2 caractères
  "montant": 0.01,    // Min 0.01
  "dateEcheance": "2025-12-31"  // Future
}
```

### Les fichiers PDF ne se téléchargent pas

```bash
# 1. Vérifier que le chemin statique est exposé
# Dans server.js ligne ~10:
app.use(express.static(path.join(__dirname, "../../archives")));

# 2. Vérifier l'URL est correcte
# Format: /factures/FAC-XXXX_timestamp.pdf

# 3. Tester avec curl
curl http://localhost:3004/factures/FAC-0001_1715000000000.pdf -o test.pdf
```

---

## 8️⃣ Structure des fichiers

```
transvirex-erp/
├── services/facturation/
│   ├── server.js              ← API endpoints
│   ├── pdf-generator.js       ← Génération PDF
│   ├── ai-analyzer.js         ← Logique IA
│   ├── package.json           ← Dépendances
│   └── .env.example           ← Configuration
├── archives/                  ← Archivage PDFs
│   └── factures/
│       ├── FAC-0001_xxx.pdf
│       └── FAC-0002_xxx.pdf
├── frontend/
│   ├── src/
│   │   ├── pages/Facturation.jsx     ← UI améliorée
│   │   └── services/api.js           ← API client
│   └── package.json
└── DOCUMENTATION_FACTURATION_IA.md   ← Documentation complète
```

---

## 9️⃣ Checklist de déploiement

- [ ] Installer dépendances backend
- [ ] Vérifier MongoDB connecté
- [ ] Créer répertoire archives/factures
- [ ] Vérifier permissions fichiers
- [ ] Tester API /health
- [ ] Tester analyse IA via API
- [ ] Tester génération PDF
- [ ] Vérifier téléchargement PDF
- [ ] Tester interface Frontend
- [ ] Vérifier archivage PDFs
- [ ] Documenter variables environnement

---

## 🔟 Ressources

- **Documentation complète:** `DOCUMENTATION_FACTURATION_IA.md`
- **API Test:** `services/facturation/` - Tests curl
- **Frontend:** `frontend/src/pages/Facturation.jsx`
- **Backend:** `services/facturation/server.js`

---

**Prêt à partir! 🚀**

Questions? Consultez `DOCUMENTATION_FACTURATION_IA.md` pour les détails complets.
