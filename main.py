import json
import time
import sys
from dataclasses import dataclass

sys.setrecursionlimit(10**6)

time_start = time.time()

N = 3
N2 = N * N
DI = [(0, 1), (1, 0), (0, -1), (-1, 0)]
BIG = 10


@dataclass(frozen=True)
class State:
    board: tuple[tuple[int]]  # 0: 空, 1: 先手の黒石, 2: 後手の白石, 3: 空いているがコウのため打てない
    turn: bool  # True: 先手, False: 後手
    n_passed: int  # 直前に連続して行われたパスの回数
    hama_sente: int  # 先手のアゲハマ
    hama_gote: int  # 後手のアゲハマ


# def tuple_to_board(num, kou):
#     board = [[0] * N for _ in range(N)]
#     for i in range(N2):
#         board[i // N][i % N] = num % 3
#         print(board[i // N][i % N], num)
#         num //= 3
#     assert num == 0
#     if kou != -1:
#         board[kou // N][kou % N] = 3
#     return board


def state_to_str(state: State) -> str:  # N = 3 なら 15 文字
    ans = "".join(str(state.board[i][j]) for i in range(N) for j in range(N))
    ans += "1" if state.turn else "0"
    ans += str(state.n_passed)
    ans += str(state.hama_sente).zfill(2)
    ans += str(state.hama_gote).zfill(2)
    return ans


# s = State(board=((1, 1, 0), (1, 0, 1), (1, 1, 0)), turn=True, passed=False, hama_sente=10, hama_gote=5)
# print(state_to_str(s))
# exit()

# (score, next_move_i, next_move_j, next_state_str) を記録する。
# next_move は次の最善手を指す (終局なら (-1, -1)、パスなら (-1, 0))。
# next_state_str は次の最善盤面 (最善手を打った後に石を取るなどの処理をしたもの) を表す文字列 (終局なら "9")。
DP = {}


def calc(state: State) -> int:
    """両者が最善を尽くした際に先手が何目差で勝つかを返す (コミなし、純碁)"""
    # print(state, len(DP))
    if state in DP:
        return DP[state][0]

    # コールド勝ち (アゲハマが N^2 - 1 個以上ある場合、inf 点差で勝ちの扱いにする)
    if state.hama_sente >= N2 - 1:
        DP[state] = BIG, -1, -1, "9"
        return BIG
    if state.hama_gote >= N2 - 1:
        DP[state] = -BIG, -1, -1, "9"
        return -BIG

    # パス2連続で終局
    if state.n_passed == 2:
        cnt = 0
        for i in range(N):
            for j in range(N):
                if state.board[i][j] == 1:
                    cnt += 1
                elif state.board[i][j] == 2:
                    cnt -= 1
        ans = cnt
        DP[state] = ans, -1, -1, "9"
        return ans

    # パスをする場合
    state_pass = State(
        board=state.board,
        turn=not state.turn,
        n_passed=state.n_passed + 1,
        hama_sente=state.hama_sente,
        hama_gote=state.hama_gote,
    )
    next_move = (-1, 0)
    next_state_str = state_to_str(state_pass)
    ans = calc(state_pass)

    # パスをしない場合
    func = (
        max if state.turn else min
    )  # 例えば今先手の番なら、各着手 (後手はスコアを最小化してくる) からスコア最大の手を選ぶので max

    for i in range(N):
        for j in range(N):
            # print(state)
            # print(state.board)
            if state.board[i][j] != 0:
                continue
            board = [
                [state.board[i][j] if state.board[i][j] != 3 else 0 for j in range(N)] for i in range(N)
            ]  # コウで打てない場所を打てるようにする
            board[i][j] = 1 if state.turn else 2

            # 相手の石を取る処理
            n_taken_stone_sum = 0
            for di, dj in DI:
                if 0 <= i + di < N and 0 <= j + dj < N and board[i + di][j + dj] == 1 + int(state.turn):
                    board, n_taken_stone = take_stone(i + di, j + dj, board)
                    n_taken_stone_sum += n_taken_stone

            hama_sente = state.hama_sente
            hama_gote = state.hama_gote
            if state.turn:
                hama_sente += n_taken_stone_sum
            else:
                hama_gote += n_taken_stone_sum

            # 自分の石を取る処理 (取れてしまうなら着手禁止点なので考えない→やはり考える)
            board, n_taken_stone_self = take_stone(i, j, board)
            # if n_taken_stone > 0:
            #     board[i][j] = 0
            #     continue
            if state.turn:
                hama_gote += n_taken_stone_self
            else:
                hama_sente += n_taken_stone_self

            # コウで打てない場所の処理
            # 今打った手で石を 1 つだけ取っており、かつ今打った手の 3 方が (相手の石で埋まっている or 盤外) の場合、
            # 次に相手はその抜き跡に打つことができない
            if n_taken_stone_sum == 1:
                ng_place = (-1, -1)
                cnt = 0
                for di, dj in DI:
                    if 0 <= i + di < N and 0 <= j + dj < N and board[i + di][j + dj] == 1 + int(state.turn):
                        cnt += 1
                    elif not (0 <= i + di < N and 0 <= j + dj < N):
                        cnt += 1
                    else:
                        ng_place = (i + di, j + dj)
                if cnt == 3:
                    board[ng_place[0]][ng_place[1]] = 3

            state_now = State(
                board=tuple(tuple(board[i][j] for j in range(N)) for i in range(N)),
                turn=not state.turn,
                n_passed=0,
                hama_sente=hama_sente,
                hama_gote=hama_gote,
            )

            ans_now = calc(state_now)

            ans = func(ans, ans_now)
            if ans == ans_now:
                next_move = (i, j)
                next_state_str = state_to_str(state_now)

            board[i][j] = 0

    DP[state] = ans, next_move[0], next_move[1], next_state_str
    return ans


def take_stone(pi: int, pj: int, board: list[list[int]]) -> tuple[list[list[int]], int]:
    """(pi, pj) と連結する石を取れるなら取って、盤面と取った石の数を返す"""
    # print("take_stone start", pi, pj, board)
    col = board[pi][pj]
    visited = [[False] * N for _ in range(N)]
    Q = [(pi, pj)]
    visited[pi][pj] = True
    ind = 0
    while ind < len(Q):
        i, j = Q[ind]
        for di, dj in DI:
            if 0 <= i + di < N and 0 <= j + dj < N:
                if board[i + di][j + dj] == col:
                    if not visited[i + di][j + dj]:
                        visited[i + di][j + dj] = True
                        Q.append((i + di, j + dj))
                elif board[i + di][j + dj] != 3 - col:
                    # 自石でも相手石でもない点 (= 空点) と隣接しているので取れない
                    return board, 0
        ind += 1
    # 取れる
    for i, j in Q:
        board[i][j] = 0
    # print("take_stone end", board, len(Q))
    return board, len(Q)


# t = ((0 for _ in range(N)) for _ in range(N))
# t =

# s = State(board=((1, 1, 0), (1, 0, 1), (1, 1, 0)), turn=True, passed=False)
# s = State(board=((0, 0), (0, 0)), turn=True, n_passed=0, hama_sente=0, hama_gote=0)


def str_to_board(board_str: str) -> tuple[tuple[int]]:
    board = [[0] * N for _ in range(N)]
    for i in range(N2):
        board[i // N][i % N] = int(board_str[i])
    return tuple(tuple(board[i][j] for j in range(N)) for i in range(N))


if __name__ == "__main__":

    # s = State(board=((0, 0, 0), (0, 0, 0), (0, 0, 0)), turn=True, n_passed=0, hama_sente=0, hama_gote=0)

    init_boards = json.load(open("init_boards.json", "r"))
    for board_str in init_boards.values():
        calc(State(board=str_to_board(board_str), turn=True, n_passed=0, hama_sente=0, hama_gote=0))
    # for k, v in DP.items():
    #     print(k, v)
    #     print(str(k))
    #     break
    # print(ans)

    DP_for_dump = {}
    for k, v in DP.items():
        if v[-1] != "9":
            DP_for_dump[state_to_str(k)] = v[:-1]

    with open(f"./data_{N}.json", mode="w") as f:
        json.dump(DP_for_dump, f, separators=(",", ":"))

    print(f"time: {time.time() - time_start:.2f} sec")
