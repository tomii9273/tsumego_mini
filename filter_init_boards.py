# init_boards.json から特定の条件を満たす盤面を抽出して filtered_init_boards.json に保存する。
# ゲームとして面白くない盤面を除くのが目的。
# 条件に最善得点などを使う場合、一度 main.py を実行して data_3.json を作る必要がある。

import json

init_boards = json.load(open("init_boards.json", "r"))
data_3 = json.load(open("data_3.json", "r"))

filtered_init_boards = set()

for v in init_boards.values():
    # 以下を除外
    # 既に片方の石が 8 個ある盤面: 初手で 8 個取られて勝敗が決する
    # 7 点差で負ける盤面: パスし続けるのが最善、その間に相手は 2 眼を残して盤を埋める
    if not (data_3[v + "100000"][0] <= -7 or v.count("1") == 8 or v.count("2") == 8):
        filtered_init_boards.add(v)

print(len(filtered_init_boards))
filtered_init_boards = sorted(list(filtered_init_boards))

filtered_init_boards_for_dump = {}
for i in range(len(filtered_init_boards)):
    filtered_init_boards_for_dump[i] = filtered_init_boards[i]

with open("./filtered_init_boards.json", mode="w") as f:
    json.dump(filtered_init_boards_for_dump, f)
