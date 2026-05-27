from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/optimize", methods=["POST"])
def optimize():
    missions = request.json["missions"]

    optimized = sorted(missions, key=lambda x: x["distance"])

    return jsonify(optimized)

app.run(port=5000)