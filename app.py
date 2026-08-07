import os
import re
import sqlite3
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATABASE_PATH = BASE_DIR / "tsumego.db"
STATIC_FILES = frozenset({"app.js", "goban.png"})
STATE_BOARD_PATTERN = re.compile(r"[0-3]{9}[01]{2}[0-9]{4}")

app = Flask(__name__, static_folder=None)
app.config["DATABASE_PATH"] = Path(
    os.environ.get("TSUMEGO_DB_PATH", DEFAULT_DATABASE_PATH)
)


def connect_database():
    """SQLite DBへ読み取り専用で接続する。"""
    database_path = Path(app.config["DATABASE_PATH"]).resolve()
    database_uri = f"{database_path.as_uri()}?mode=ro&immutable=1"
    connection = sqlite3.connect(database_uri, uri=True)
    connection.execute("PRAGMA query_only = ON")
    return connection


def fetch_one(statement, parameters):
    """SQLite DBを検索し、先頭の1行を返す。"""
    connection = connect_database()
    try:
        return connection.execute(statement, parameters).fetchone()
    finally:
        connection.close()


@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/<path:path>")
def static_file(path):
    if path not in STATIC_FILES:
        abort(404)
    return send_from_directory(BASE_DIR, path)


@app.route("/get_message", methods=["POST"])
def get_message():
    """盤面文字列 (15 桁) から最善手・そのときの最大スコアを取得"""
    data = request.get_json(silent=True) or {}
    board = data.get("board")
    if not isinstance(board, str) or STATE_BOARD_PATTERN.fullmatch(board) is None:
        return jsonify({"message": "Invalid board."}), 400

    row = fetch_one("SELECT score, x, y FROM data3 WHERE board = ?", (board,))
    if row:
        return jsonify({"score": row[0], "x": row[1], "y": row[2]})
    return jsonify({"message": "No message found for this coordinate."})


@app.route("/get_board_str", methods=["POST"])
def get_board_str():
    """盤面番号から盤面文字列 (9 桁) を取得"""
    data = request.get_json(silent=True) or {}
    num = data.get("num")
    if not isinstance(num, int) or isinstance(num, bool):
        return jsonify({"message": "Invalid board number."}), 400

    row = fetch_one("SELECT board FROM filtered_init_boards WHERE num = ?", (num,))
    if row:
        return jsonify({"board_str": row[0]})
    return jsonify({"message": "No message found for this coordinate."})


if __name__ == "__main__":
    app.run(debug=True)
