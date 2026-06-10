#!/bin/bash

# Tests de l'API Facturation avec Agent IA
# Usage: bash test_facturation_api.sh

API_URL="http://localhost:3004"
FRONTEND_URL="http://localhost:3000"

echo "🧪 Tests du système Facturation avec IA"
echo "========================================"
echo ""

# Test 1: Health check
echo "1️⃣  Test Health Check"
echo "Endpoint: GET $API_URL/health"
curl -X GET "$API_URL/health" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# Test 2: Analyse avec données invalides
echo "2️⃣  Test Analyse IA - Données INVALIDES"
echo "Endpoint: POST $API_URL/facturation/analyze"
curl -X POST "$API_URL/facturation/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "clientNom": "A",
    "montant": -50,
    "tva": 150,
    "dateEcheance": "2020-01-01"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Test 3: Analyse avec données valides
echo "3️⃣  Test Analyse IA - Données VALIDES"
echo "Endpoint: POST $API_URL/facturation/analyze"
curl -X POST "$API_URL/facturation/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "clientNom": "ACME Corporation",
    "clientAdresse": "123 Rue de Paris, 75000 Paris",
    "montant": 1500.50,
    "tva": 20,
    "dateEcheance": "2025-12-31",
    "notes": "Facture test - Paiement à 30 jours"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Test 4: Analyse avec auto-correction
echo "4️⃣  Test Analyse IA - AUTO-CORRECTION"
echo "Endpoint: POST $API_URL/facturation/analyze"
curl -X POST "$API_URL/facturation/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "clientNom": "  acme  corp  ",
    "montant": "€1500,50",
    "dateEcheance": "2020-01-01"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Test 5: Lister les facturatons
echo "5️⃣  Test Lister les factures"
echo "Endpoint: GET $API_URL/facturation"
curl -X GET "$API_URL/facturation" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# Test 6: Lister les PDFs archivés
echo "6️⃣  Test Lister les PDFs archivés"
echo "Endpoint: GET $API_URL/facturation/pdfs/list"
curl -X GET "$API_URL/facturation/pdfs/list" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# Test 7: Stats factures
echo "7️⃣  Test Stats factures"
echo "Endpoint: GET $API_URL/facturation/stats"
curl -X GET "$API_URL/facturation/stats" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

echo "✅ Tests terminés!"
echo ""
echo "Ressources:"
echo "- Frontend: $FRONTEND_URL"
echo "- API: $API_URL"
echo "- Documentation: ../DOCUMENTATION_FACTURATION_IA.md"
