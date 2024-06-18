# N x N の盤面を全探索する。囲まれている石がないものを、回転・反転の重複を除いた状態で番号を付けて init_boards.json に保存する。

import json
import time

from main import N, take_stone

time_start = time.time()


N2 = N * N

init_boards = set()

print(3**N2)


def rotate_board_str(board_str):
    """board_str を 90° 回転させる"""
    board = [[0] * N for _ in range(N)]
    for i in range(N2):
        board[i // N][i % N] = int(board_str[i])
    board_rotated = [[0] * N for _ in range(N)]
    for i in range(N):
        for j in range(N):
            board_rotated[j][N - 1 - i] = board[i][j]
    board_str_rotated = ""
    for i in range(N):
        for j in range(N):
            board_str_rotated += str(board_rotated[i][j])
    return board_str_rotated


def flip_board_str(board_str):
    """board_str を上下反転させる"""
    board = [[0] * N for _ in range(N)]
    for i in range(N2):
        board[i // N][i % N] = int(board_str[i])
    board_flipped = [[0] * N for _ in range(N)]
    for i in range(N):
        for j in range(N):
            board_flipped[N - 1 - i][j] = board[i][j]
    board_str_flipped = ""
    for i in range(N):
        for j in range(N):
            board_str_flipped += str(board_flipped[i][j])
    return board_str_flipped


for num in range(3**N2):
    board = [[0] * N for _ in range(N)]
    board_init = [[0] * N for _ in range(N)]
    board_str = ""
    for i in range(N2):
        board[i // N][i % N] = num % 3
        board_init[i // N][i % N] = num % 3
        board_str += str(num % 3)
        # print(board[i // N][i % N], num)
        num //= 3
    assert num == 0
    n_taken_stone = 0
    for i in range(N):
        for j in range(N):
            if board[i][j] in (1, 2):
                _, n_taken_stone_one = take_stone(i, j, board)
                n_taken_stone += n_taken_stone_one
    if n_taken_stone == 0:
        board_str_min = min(board_str, flip_board_str(board_str))
        for _ in range(3):
            board_str = rotate_board_str(board_str)
            board_str_min = min(board_str, flip_board_str(board_str))
        init_boards.add(board_str_min)


print(len(init_boards))

init_boards = sorted(list(init_boards))

init_boards_for_dump = {}
for i in range(len(init_boards)):
    init_boards_for_dump[i] = init_boards[i]

with open("./init_boards.json", mode="w") as f:
    json.dump(init_boards_for_dump, f, separators=(",", ":"))

print(f"time: {time.time() - time_start:.2f} sec")
