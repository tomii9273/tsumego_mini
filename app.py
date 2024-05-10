from flask import Flask, send_from_directory, request, jsonify
import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()  # 環境変数をロード
DATABASE_URL = database_url = os.getenv("DATABASE_URL")

app = Flask(__name__, static_folder=".")


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:path>")
def static_file(path):
    return send_from_directory(".", path)


@app.route("/get_message", methods=["POST"])
def get_message():
    data = request.json
    board = data["board"]
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    cur = conn.cursor()
    cur.execute(f"SELECT score, x, y FROM data3 WHERE board = '{board}'")
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row:
        return jsonify({"score": row[0], "x": row[1], "y": row[2]})
    else:
        return jsonify({"message": "No message found for this coordinate."})


if __name__ == "__main__":
    app.run(debug=True)
