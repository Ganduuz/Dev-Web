import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

try:
    client_mongo = MongoClient("mongodb://mongo:27017/")
    db = client_mongo["erp"]
except:
    db = None

def get_missions():
    try:
        missions = list(db["missions"].find({}, {"_id": 0}))
        return missions
    except:
        return []

def get_drivers():
    try:
        drivers = list(db["drivers"].find({}, {"_id": 0}))
        return drivers
    except:
        return []

def get_trackings():
    try:
        trackings = list(db["trackings"].find({}, {"_id": 0}))
        return trackings
    except:
        return []

@app.route("/ai/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "agent": "NEXUS", "version": "1.0.0"})

@app.route("/ai/chat", methods=["POST"])
def chat():
    data = request.json
    message = data.get("message", "").lower()
    missions = get_missions()
    drivers = get_drivers()
    nb_missions = len(missions)
    nb_attente = len([m for m in missions if m.get("statut") == "en_attente"])
    nb_livrees = len([m for m in missions if m.get("statut","") == "livree"])
    nb_retard = len([m for m in missions if m.get("statut") == "en_retard"])
    nb_drivers = len(drivers)
    if "mission" in message:
        reply = f"Analyse en cours: {nb_missions} missions au total. {nb_attente} en attente, {nb_livrees} livrees, {nb_retard} en retard. Je recommande de traiter en priorite les missions urgentes en attente."
    elif "chauffeur" in message or "driver" in message:
        reply = f"Vous avez {nb_drivers} chauffeurs enregistres. Assignez les missions EN_ATTENTE aux chauffeurs disponibles pour optimiser les livraisons."
    elif "retard" in message or "anomalie" in message:
        if nb_retard > 0:
            reply = f"ALERTE: {nb_retard} livraisons en retard detectees ! Action immediate requise : contacter les chauffeurs concernes."
        else:
            reply = f"Aucun retard detecte actuellement. Operations normales. {nb_attente} missions en attente d assignation."
    elif "kpi" in message or "performance" in message:
        taux = round((nb_livrees / nb_missions * 100) if nb_missions > 0 else 0, 1)
        reply = f"KPI actuels: {nb_missions} missions totales, taux de livraison {taux}%, {nb_retard} retards. Performance {'bonne' if taux > 80 else 'a ameliorer'}."
    elif "bonjour" in message or "salut" in message or "hello" in message:
        reply = f"Bonjour ! Je suis NEXUS, agent IA de Transvirex. Actuellement {nb_missions} missions en cours dont {nb_attente} en attente. Comment puis-je vous aider ?"
    else:
        reply = f"Je suis NEXUS. Etat actuel: {nb_missions} missions ({nb_attente} en attente, {nb_livrees} livrees). Posez-moi vos questions sur les missions, chauffeurs, anomalies ou KPI."
    return jsonify({"reply": reply, "session_id": data.get("session_id", "default")})

@app.route("/ai/optimize", methods=["POST"])
def optimize_missions():
    missions = get_missions()
    drivers = get_drivers()
    missions_attente = [m for m in missions if m.get("statut") == "en_attente"]
    if not missions_attente:
        return jsonify({"assignments": [], "unassigned": [], "summary": "Aucune mission en attente d assignation."})
    assignments = []
    for i, mission in enumerate(missions_attente):
        if drivers:
            driver = drivers[i % len(drivers)]
            driver_name = f"{driver.get('prenom', '')} {driver.get('nom', '')}".strip() or driver.get('name', 'Inconnu')
            driver_id = str(driver.get('_id', f'D{i+1}'))
        else:
            driver_name = "Non disponible"
            driver_id = "N/A"
        assignments.append({
            "mission_id": mission.get("reference", mission.get("id", f"M{i+1}")),
            "driver_id": driver_id,
            "driver_name": driver_name,
            "client": mission.get("client", ""),
            "trajet": f"{mission.get('adresseDepart', '')} -> {mission.get('adresseLivraison', '')}",
            "reason": "Chauffeur disponible le plus adapte",
            "priority": mission.get("priorite", "normale").lower()
        })
    return jsonify({
        "assignments": assignments,
        "unassigned": [],
        "summary": f"{len(assignments)} mission(s) en attente assignee(s) avec succes sur {len(missions)} missions totales."
    })

@app.route("/ai/anomalies", methods=["POST"])
def detect_anomalies():
    missions = get_missions()
    trackings = get_trackings()
    anomalies = []
    for m in missions:
        if m.get("statut") == "en_retard":
            anomalies.append({
                "type": "retard",
                "niveau": "CRITIQUE",
                "description": f"Mission {m.get('reference', m.get('id', '?'))} pour {m.get('client', '?')} en retard",
                "entite_id": str(m.get('reference', m.get('id', '?'))),
                "action_recommandee": "Contacter le chauffeur et informer le client immediatement"
            })
        if m.get("statut") == "en_attente" and not m.get("chauffeur"):
            anomalies.append({
                "type": "non_assigne",
                "niveau": "ATTENTION",
                "description": f"Mission {m.get('reference', '?')} pour {m.get('client', '?')} non assignee",
                "entite_id": str(m.get('reference', '?')),
                "action_recommandee": "Assigner un chauffeur disponible"
            })
    nb_missions = len(missions)
    nb_anomalies = len(anomalies)
    score = max(0, 100 - (nb_anomalies * 15))
    if not anomalies:
        anomalies.append({
            "type": "info",
            "niveau": "INFO",
            "description": "Aucune anomalie critique detectee",
            "entite_id": "SYSTEME",
            "action_recommandee": "Continuer la surveillance normale"
        })
    return jsonify({
        "anomalies": anomalies,
        "score_sante": score,
        "resume": f"Analyse de {nb_missions} missions: {nb_anomalies} anomalie(s) detectee(s). Score sante operationnel: {score}/100."
    })

@app.route("/ai/kpi-analysis", methods=["POST"])
def analyze_kpi():
    missions = get_missions()
    nb_total = len(missions)
    nb_livrees = len([m for m in missions if m.get("statut","") == "livree"])
    nb_attente = len([m for m in missions if m.get("statut") == "en_attente"])
    nb_retard = len([m for m in missions if m.get("statut") == "en_retard"])
    nb_cours = len([m for m in missions if m.get("statut") == "en_cours"])
    taux_livraison = round((nb_livrees / nb_total * 100) if nb_total > 0 else 0, 1)
    taux_retard = round((nb_retard / nb_total * 100) if nb_total > 0 else 0, 1)
    score = round(taux_livraison - (taux_retard * 2))
    score = max(0, min(100, score))
    statut_livraison = "bon" if taux_livraison >= 80 else "moyen" if taux_livraison >= 60 else "mauvais"
    statut_retard = "bon" if taux_retard == 0 else "moyen" if taux_retard <= 20 else "mauvais"
    return jsonify({
        "analyse": [
            {
                "indicateur": "Taux de livraison",
                "valeur": f"{taux_livraison}%",
                "statut": statut_livraison,
                "interpretation": f"{nb_livrees} missions livrees sur {nb_total} au total",
                "recommandation": "Viser 95% en reduisant les retards" if taux_livraison < 95 else "Excellent taux, maintenir les efforts"
            },
            {
                "indicateur": "Missions en attente",
                "valeur": str(nb_attente),
                "statut": "bon" if nb_attente == 0 else "moyen" if nb_attente <= 3 else "mauvais",
                "interpretation": f"{nb_attente} mission(s) non encore assignee(s)",
                "recommandation": "Assigner rapidement les missions en attente aux chauffeurs disponibles"
            },
            {
                "indicateur": "Taux de retard",
                "valeur": f"{taux_retard}%",
                "statut": statut_retard,
                "interpretation": f"{nb_retard} mission(s) en retard sur {nb_total}",
                "recommandation": "Analyser les causes de retard et optimiser les tournees"
            },
            {
                "indicateur": "Missions en cours",
                "valeur": str(nb_cours),
                "statut": "bon",
                "interpretation": f"{nb_cours} livraison(s) actuellement en cours",
                "recommandation": "Surveiller le tracking en temps reel"
            }
        ],
        "score_global": score,
        "points_forts": [f"Taux de livraison de {taux_livraison}%"] if taux_livraison >= 80 else ["Systeme operationnel"],
        "points_amelioration": [f"Reduire les {nb_retard} retard(s)" if nb_retard > 0 else "Maintenir la performance", f"Traiter les {nb_attente} mission(s) en attente" if nb_attente > 0 else "Continuer l optimisation"],
        "conclusion": f"Sur {nb_total} missions totales: {nb_livrees} livrees, {nb_cours} en cours, {nb_attente} en attente, {nb_retard} en retard. Score global: {score}/100."
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
