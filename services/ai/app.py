import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from anthropic import Anthropic
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

SYSTEM_PROMPT = """
Tu es NEXUS, l'agent IA de Transvirex Logistics.
Tu es un assistant expert en logistique, dispatching et analyse opérationnelle.

Tu peux :
1. OPTIMISER les missions : affecter les missions aux chauffeurs selon distance et priorité.
2. DÉTECTER des anomalies : retards, surcharges, missions non assignées.
3. ANALYSER les KPI : interpréter les indicateurs et donner des recommandations.
4. RÉPONDRE aux questions logistiques des dispatchers et managers.

Règles :
- Réponds toujours en français.
- Sois concis, précis et professionnel.
- Pour les anomalies, classe par niveau : CRITIQUE, ATTENTION, INFO.
"""

conversation_histories = {}


@app.route("/ai/chat", methods=["POST"])
def chat():
    data = request.json
    session_id = data.get("session_id", "default")
    user_message = data.get("message", "")

    if not user_message:
        return jsonify({"error": "Message vide"}), 400

    if session_id not in conversation_histories:
        conversation_histories[session_id] = []

    conversation_histories[session_id].append({
        "role": "user",
        "content": user_message
    })

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=conversation_histories[session_id]
    )

    assistant_reply = response.content[0].text

    conversation_histories[session_id].append({
        "role": "assistant",
        "content": assistant_reply
    })

    if len(conversation_histories[session_id]) > 20:
        conversation_histories[session_id] = conversation_histories[session_id][-20:]

    return jsonify({
        "reply": assistant_reply,
        "session_id": session_id
    })


@app.route("/ai/optimize", methods=["POST"])
def optimize_missions():
    data = request.json
    missions = data.get("missions", [])
    drivers = data.get("drivers", [])

    if not missions:
        return jsonify({"error": "Aucune mission fournie"}), 400

    prompt = f"""
Tu es un expert en optimisation logistique.

Missions à dispatcher :
{json.dumps(missions, ensure_ascii=False, indent=2)}

Chauffeurs disponibles :
{json.dumps(drivers, ensure_ascii=False, indent=2)}

Réponds UNIQUEMENT avec un JSON valide (sans markdown) :
{{
  "assignments": [
    {{
      "mission_id": "...",
      "driver_id": "...",
      "driver_name": "...",
      "reason": "...",
      "priority": "haute|moyenne|basse"
    }}
  ],
  "unassigned": [],
  "summary": "Résumé en 2 phrases."
}}
"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip().replace("```json", "").replace("```", "").strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {"raw_response": raw, "error": "Réponse non structurée"}

    return jsonify(result)


@app.route("/ai/anomalies", methods=["POST"])
def detect_anomalies():
    data = request.json
    missions  = data.get("missions", [])
    trackings = data.get("trackings", [])
    drivers   = data.get("drivers", [])

    prompt = f"""
Tu es un système de détection d'anomalies pour Transvirex Logistics.

Missions : {json.dumps(missions, ensure_ascii=False, indent=2)}
Trackings : {json.dumps(trackings, ensure_ascii=False, indent=2)}
Chauffeurs : {json.dumps(drivers, ensure_ascii=False, indent=2)}

Réponds UNIQUEMENT avec un JSON valide (sans markdown) :
{{
  "anomalies": [
    {{
      "type": "retard|surcharge|non_assigné|incident|autre",
      "niveau": "CRITIQUE|ATTENTION|INFO",
      "description": "...",
      "entite_id": "...",
      "action_recommandee": "..."
    }}
  ],
  "score_sante": 85,
  "resume": "Résumé global."
}}
"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip().replace("```json", "").replace("```", "").strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {"raw_response": raw, "error": "Réponse non structurée"}

    return jsonify(result)


@app.route("/ai/kpi-analysis", methods=["POST"])
def analyze_kpi():
    data = request.json
    kpi_data = data.get("kpi", {})

    prompt = f"""
Tu es un analyste performance pour Transvirex Logistics.

KPI actuels : {json.dumps(kpi_data, ensure_ascii=False, indent=2)}

Réponds UNIQUEMENT avec un JSON valide (sans markdown) :
{{
  "analyse": [
    {{
      "indicateur": "...",
      "valeur": "...",
      "statut": "bon|moyen|mauvais",
      "interpretation": "...",
      "recommandation": "..."
    }}
  ],
  "score_global": 75,
  "points_forts": [],
  "points_amelioration": [],
  "conclusion": "Conclusion en 2 phrases."
}}
"""

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = response.content[0].text.strip().replace("```json", "").replace("```", "").strip()

    try:
        result = json.loads(raw)
    except json.JSONDecodeError:
        result = {"raw_response": raw, "error": "Réponse non structurée"}

    return jsonify(result)


@app.route("/ai/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "agent": "NEXUS",
        "version": "1.0.0",
        "capabilities": ["chat", "optimize", "anomalies", "kpi-analysis"]
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)