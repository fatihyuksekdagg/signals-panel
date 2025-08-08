from flask import Flask, render_template, jsonify
from strategy import generate_signals

app = Flask(__name__)

@app.route("/")
def index():
    signals = generate_signals()
    return render_template("index.html", signals=signals)

@app.route("/api/signals")
def api_signals():
    return jsonify(generate_signals())

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
