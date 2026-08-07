import argparse
import csv
import json
import os
import sqlite3
from collections.abc import Iterable, Iterator
from pathlib import Path
from typing import Any


DEFAULT_MOVES_SOURCE = Path("data_3.json")
DEFAULT_BOARDS_SOURCE = Path("filtered_init_boards.json")
DEFAULT_OUTPUT = Path("tsumego.db")
BATCH_SIZE = 10_000


def parse_args() -> argparse.Namespace:
    """コマンドライン引数を解析する。"""
    parser = argparse.ArgumentParser(
        description="最善手データと初期盤面データから読み取り専用SQLite DBを生成します。"
    )
    parser.add_argument(
        "--moves-source",
        type=Path,
        default=DEFAULT_MOVES_SOURCE,
        help="最善手データのJSONまたはCSVファイル",
    )
    parser.add_argument(
        "--boards-source",
        type=Path,
        default=DEFAULT_BOARDS_SOURCE,
        help="初期盤面データのJSONまたはCSVファイル",
    )
    parser.add_argument(
        "--output", type=Path, default=DEFAULT_OUTPUT, help="生成するSQLite DBファイル"
    )
    return parser.parse_args()


def load_json(path: Path) -> dict[str, Any]:
    """JSONオブジェクトを読み込む。"""
    with path.open(encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        raise ValueError(f"JSONのルートはオブジェクトである必要があります: {path}")
    return data


def validate_state_board(board: str, path: Path) -> None:
    """最善手検索用の15桁盤面文字列を検証する。"""
    is_valid = (
        len(board) == 15
        and set(board[:9]) <= {"0", "1", "2", "3"}
        and set(board[9:11]) <= {"0", "1"}
        and board[11:].isdigit()
    )
    if not is_valid:
        raise ValueError(f"不正な盤面文字列です: {board!r} ({path})")


def validate_initial_board(board: str, path: Path) -> None:
    """初期盤面用の9桁盤面文字列を検証する。"""
    if len(board) != 9 or not set(board) <= {"0", "1", "2"}:
        raise ValueError(f"不正な初期盤面文字列です: {board!r} ({path})")


def iter_move_rows_from_json(path: Path) -> Iterator[tuple[str, int, int, int]]:
    """JSON形式の最善手データをDB行へ変換する。"""
    for board, values in load_json(path).items():
        if not isinstance(values, list) or len(values) < 3:
            raise ValueError(f"不正な最善手データです: {board!r} ({path})")
        board = str(board)
        validate_state_board(board, path)
        yield board, int(values[0]), int(values[1]), int(values[2])


def iter_move_rows_from_csv(path: Path) -> Iterator[tuple[str, int, int, int]]:
    """CSV形式の最善手データをDB行へ変換する。"""
    with path.open(encoding="utf-8", newline="") as file:
        for line_number, row in enumerate(csv.reader(file), start=1):
            if not row:
                continue
            if line_number == 1 and row[0].lower() == "board":
                continue
            if len(row) != 4:
                raise ValueError(f"CSVの列数が不正です: {path}:{line_number}")
            board = row[0]
            validate_state_board(board, path)
            yield board, int(row[1]), int(row[2]), int(row[3])


def iter_board_rows_from_json(path: Path) -> Iterator[tuple[int, str]]:
    """JSON形式の初期盤面データをDB行へ変換する。"""
    for num, board in load_json(path).items():
        board = str(board)
        validate_initial_board(board, path)
        yield int(num), board


def iter_board_rows_from_csv(path: Path) -> Iterator[tuple[int, str]]:
    """CSV形式の初期盤面データをDB行へ変換する。"""
    with path.open(encoding="utf-8", newline="") as file:
        for line_number, row in enumerate(csv.reader(file), start=1):
            if not row:
                continue
            if line_number == 1 and row[0].lower() == "num":
                continue
            if len(row) != 2:
                raise ValueError(f"CSVの列数が不正です: {path}:{line_number}")
            board = row[1]
            validate_initial_board(board, path)
            yield int(row[0]), board


def iter_move_rows(path: Path) -> Iterator[tuple[str, int, int, int]]:
    """拡張子に応じて最善手データを読み込む。"""
    if path.suffix.lower() == ".json":
        return iter_move_rows_from_json(path)
    if path.suffix.lower() == ".csv":
        return iter_move_rows_from_csv(path)
    raise ValueError(f"対応していないファイル形式です: {path}")


def iter_board_rows(path: Path) -> Iterator[tuple[int, str]]:
    """拡張子に応じて初期盤面データを読み込む。"""
    if path.suffix.lower() == ".json":
        return iter_board_rows_from_json(path)
    if path.suffix.lower() == ".csv":
        return iter_board_rows_from_csv(path)
    raise ValueError(f"対応していないファイル形式です: {path}")


def insert_in_batches(
    connection: sqlite3.Connection,
    statement: str,
    rows: Iterable[tuple[Any, ...]],
    label: str,
) -> int:
    """大量の行を一定件数ずつ挿入する。"""
    total = 0
    batch: list[tuple[Any, ...]] = []
    for row in rows:
        batch.append(row)
        if len(batch) < BATCH_SIZE:
            continue
        connection.executemany(statement, batch)
        total += len(batch)
        batch.clear()
        if total % 100_000 == 0:
            print(f"{label}: {total:,} 件", flush=True)

    if batch:
        connection.executemany(statement, batch)
        total += len(batch)

    print(f"{label}: {total:,} 件", flush=True)
    return total


def create_database(moves_source: Path, boards_source: Path, output: Path) -> None:
    """入力データからSQLite DBをアトミックに生成する。"""
    for source in (moves_source, boards_source):
        if not source.is_file():
            raise FileNotFoundError(f"入力ファイルが見つかりません: {source}")

    output.parent.mkdir(parents=True, exist_ok=True)
    temporary_output = output.with_name(f"{output.name}.tmp")
    temporary_output.unlink(missing_ok=True)

    try:
        connection = sqlite3.connect(temporary_output)
        try:
            connection.executescript(
                """
                PRAGMA page_size = 4096;
                PRAGMA journal_mode = OFF;
                PRAGMA synchronous = OFF;
                PRAGMA locking_mode = EXCLUSIVE;

                CREATE TABLE data3 (
                    board TEXT PRIMARY KEY,
                    score INTEGER NOT NULL,
                    x INTEGER NOT NULL,
                    y INTEGER NOT NULL,
                    CHECK (length(board) = 15)
                ) WITHOUT ROWID;

                CREATE TABLE filtered_init_boards (
                    num INTEGER PRIMARY KEY,
                    board TEXT NOT NULL,
                    CHECK (length(board) = 9)
                );

                PRAGMA user_version = 1;
                """
            )
            connection.execute("BEGIN")
            move_count = insert_in_batches(
                connection,
                "INSERT INTO data3 (board, score, x, y) VALUES (?, ?, ?, ?)",
                iter_move_rows(moves_source),
                "最善手データ",
            )
            board_count = insert_in_batches(
                connection,
                "INSERT INTO filtered_init_boards (num, board) VALUES (?, ?)",
                iter_board_rows(boards_source),
                "初期盤面データ",
            )
            connection.commit()
            connection.execute("ANALYZE")
            connection.commit()
            connection.execute("VACUUM")

            check_result = connection.execute("PRAGMA quick_check").fetchone()
            if check_result != ("ok",):
                raise RuntimeError(f"SQLiteの整合性確認に失敗しました: {check_result}")
        finally:
            connection.close()

        os.replace(temporary_output, output)
    except BaseException:
        temporary_output.unlink(missing_ok=True)
        raise

    size_mib = output.stat().st_size / 1024 / 1024
    print(
        f"生成完了: {output} ({size_mib:.1f} MiB、"
        f"最善手 {move_count:,} 件、初期盤面 {board_count:,} 件)"
    )


def main() -> None:
    """SQLite DB生成処理を実行する。"""
    args = parse_args()
    create_database(args.moves_source, args.boards_source, args.output)


if __name__ == "__main__":
    main()
