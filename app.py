import os

import psycopg2
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

load_dotenv()  # 環境変数をロード
DATABASE_URL = os.getenv("DATABASE_URL")

app = Flask(__name__, static_folder=".")


@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:path>")
def static_file(path):
    return send_from_directory(".", path)


@app.route("/get_message", methods=["POST"])
def get_message():
    """盤面文字列 (15 桁) から最善手・そのときの最大スコアを取得"""
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


@app.route("/get_board_str", methods=["POST"])
def get_board_str():
    """盤面番号から盤面文字列 (9 桁) を取得"""
    data = request.json
    num = data["num"]
    conn = psycopg2.connect(DATABASE_URL, sslmode="require")
    cur = conn.cursor()
    cur.execute(f"SELECT board FROM filtered_init_boards WHERE num = {num}")
    row = cur.fetchone()
    cur.close()
    conn.close()
    if row:
        return jsonify({"board_str": row[0]})
    else:
        return jsonify({"message": "No message found for this coordinate."})


if __name__ == "__main__":
    app.run(debug=True)
