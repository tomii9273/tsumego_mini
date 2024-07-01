const SIZE = 3; // 盤面の一辺の交点数
const N_INITBOARD = 5026; // 初期盤面の総数 (SQL で取得できるが、時間短縮のため直接指定)

const DIRECTION = [
  [-1, 0], // 上
  [1, 0], // 下
  [0, -1], // 左
  [0, 1], // 右
];

var board_num = 0;
var str_board = "";
var hama_sente = 0;
var hama_gote = 0;
var isLocked = false; // 勝負がついたらロックして石を置けないようにする

function strToBoard(str_board, board) {
  // 盤面文字列 (9 桁以上) から盤面を生成
  for (let idx = 0; idx < SIZE * SIZE; idx++) {
    const nextCell = board.children[idx];
    if (nextCell.firstChild) {
      // このセルに石がすでに置かれている場合は一旦除去
      nextCell.removeChild(nextCell.firstChild);
    }
    if (str_board.charAt(idx) == "1") {
      // 黒石を置く
      const stone = document.createElement("div");
      stone.className = "stone black";
      nextCell.appendChild(stone);
    }
    if (str_board.charAt(idx) == "2") {
      // 白石を置く
      const stone = document.createElement("div");
      stone.className = "stone white";
      nextCell.appendChild(stone);
    }
    if (str_board.charAt(idx) == "3") {
      // 赤石 (コウで次に置けないことを示す) を置く
      const stone = document.createElement("div");
      stone.className = "stone red";
      nextCell.appendChild(stone);
    }
  }
  return board;
}

async function initState(board_num) {
  // ゲーム状態の初期化
  str_board = (await getBoardStr(board_num))["board_str"] + "100000";
  board = strToBoard(str_board, board);
  isLocked = false;
  hama_sente = 0;
  hama_gote = 0;
  let [row, col, score] = await getPlaceScore(str_board);
  document.getElementById("board_num_str").innerHTML = `No.${String(board_num)} 最大得点:${score}`;
  document.getElementById("history").innerHTML += `<br>ゲーム開始 No.${String(board_num)} 最大得点:${score}`;
  console.log(`No.${String(board_num)} 最大得点:${score} str_board:${str_board} 黒の最善手:(${row},${col})`);
}

async function resetState() {
  // 「作成」ボタンによるゲーム状態の再設定
  board_num = document.getElementById("boardNum").value; // 0-indexed
  initState(board_num);
}

function checkCalledGame() {
  // 終局判定 (アゲハマ 8 個以上)
  if (hama_sente >= 8) {
    document.getElementById("history").innerHTML += "<br>ゲーム終了<br>&ensp;10 点差で自分の勝ち";
    isLocked = true;
  } else if (hama_gote >= 8) {
    document.getElementById("history").innerHTML += "<br>ゲーム終了<br>&ensp;10 点差で相手の勝ち";
    isLocked = true;
  }
}

function checkConsecutivePass() {
  // 終局判定 (連続パス)
  if (str_board.charAt(SIZE * SIZE + 1) == "1") {
    document.getElementById("history").innerHTML += "<br>ゲーム終了" + countStone(str_board);
    isLocked = true;
  }
}

function putStone(row, col, turn_sente) {
  // 石を地点 (row, col) に置く (turn_sente なら先手が、そうでないなら後手が置く)
  let stone_col_self, stone_col_opponent;
  if (turn_sente) {
    stone_col_self = "黒";
    stone_col_opponent = "白";
  } else {
    stone_col_self = "白";
    stone_col_opponent = "黒";
  }
  let idx = row * SIZE + col;
  document.getElementById("history").innerHTML += `<br>&ensp;${stone_col_self}石を置いた: (${row + 1}, ${col + 1})`;
  str_board = str_board.substr(0, idx) + String(2 - Number(turn_sente)) + str_board.substr(idx + 1);

  // 石を取る処理
  let taken_stones = 0;
  for (let [drow, dcol] of DIRECTION) {
    if (0 <= row + drow && row + drow < SIZE && 0 <= col + dcol && col + dcol < SIZE) {
      if (str_board.charAt((row + drow) * SIZE + col + dcol) != str_board.charAt(idx)) {
        let [str_b, n_stone] = takeStone(row + drow, col + dcol, str_board);
        str_board = str_b;
        taken_stones += n_stone;
      }
    }
  }
  if (turn_sente) {
    hama_sente += taken_stones;
  } else {
    hama_gote += taken_stones;
  }
  if (taken_stones > 0) {
    document.getElementById(
      "history"
    ).innerHTML += `<br>&ensp;&ensp;相手の${stone_col_opponent}石 ${taken_stones} 個を取った`;
  }
  let [str_b, n_stone] = takeStone(row, col, str_board);
  str_board = str_b;
  if (turn_sente) {
    hama_gote += n_stone;
  } else {
    hama_sente += n_stone;
  }
  if (n_stone > 0) {
    document.getElementById("history").innerHTML += `<br>&ensp;&ensp;自分の${stone_col_self}石 ${n_stone} 個を取られた`;
  }

  // コウの処理
  for (let idx = 0; idx < SIZE * SIZE; idx++) {
    if (str_board.charAt(idx) == "3") {
      str_board = str_board.substr(0, idx) + "0" + str_board.substr(idx + 1);
    }
  }
  let [kou_row, kou_col] = checkKou(str_board, row, col, taken_stones, 2 - turn_sente);
  if (kou_row != -1) {
    document.getElementById(
      "history"
    ).innerHTML += `<br>&ensp;&ensp;コウのため次${stone_col_opponent}はここに打てません: (${kou_row + 1}, ${
      kou_col + 1
    })`;
    str_board = str_board.substr(0, kou_row * SIZE + kou_col) + "3" + str_board.substr(kou_row * SIZE + kou_col + 1);
  }
  str_board = str_board.substr(0, SIZE * SIZE) + String(1 - turn_sente) + "0" + str_board.substr(SIZE * SIZE + 2);
  str_board =
    str_board.substr(0, SIZE * SIZE + 2) + String(hama_sente).padStart(2, "0") + String(hama_gote).padStart(2, "0");
  board = strToBoard(str_board, board); // 盤面の反映
}

function passTurn(turn_sente) {
  // パスをする (turn_sente なら先手が、そうでないなら後手がする)
  let stone_col_self;
  if (turn_sente) {
    stone_col_self = "黒";
  } else {
    stone_col_self = "白";
  }
  document.getElementById("history").innerHTML += `<br>&ensp;${stone_col_self}はパスをした`;
  checkConsecutivePass(); // 終局判定 (連続パス)
  str_board = str_board.substr(0, SIZE * SIZE) + String(1 - turn_sente) + "1" + str_board.substr(SIZE * SIZE + 2);
  board = strToBoard(str_board, board); // 盤面の反映
}

async function moveWhite() {
  // 白の手番 (最善手を選択)
  let [row_gote, col_gote, _] = await getPlaceScore(str_board);
  if (row_gote == -1) {
    passTurn(false); // パス
  } else {
    putStone(row_gote, col_gote, false); // 石を置く
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  let board = document.getElementById("board"); // 盤面表示用
  const historyDiv = document.getElementById("history"); // 履歴表示用
  const passButton = document.getElementById("pass"); // passボタン

  for (let idx = 0; idx < SIZE * SIZE; idx++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    board.appendChild(cell);
  }

  board_num = Math.floor(Math.random() * N_INITBOARD);
  initState(board_num);

  // 石を置く場所の設定
  for (let idx = 0; idx < SIZE * SIZE; idx++) {
    let row_sente = Math.floor(idx / SIZE);
    let col_sente = idx % SIZE;
    const cell = board.children[idx];
    cell.addEventListener("click", async function () {
      if (isLocked) return;
      // すでに石が置かれていないことを確認
      if (!this.firstChild) {
        putStone(row_sente, col_sente, true);
        checkCalledGame(); // 終局判定 (アゲハマ 8 個以上)

        if (!isLocked) {
          moveWhite(); // 相手の番
          checkCalledGame(); // 終局判定 (アゲハマ 8 個以上)
        }
      }
    });
  }

  // パスボタンの設定
  passButton.addEventListener("click", async function () {
    if (isLocked) return;
    passTurn(true); // パス

    if (!isLocked) {
      moveWhite(); // 相手の番
      checkCalledGame(); // 終局判定 (アゲハマ 8 個以上)
    }
  });
});

function checkKou(str_board, row, col, n_taken_stone_sum, my_stone_col) {
  if (n_taken_stone_sum != 1) {
    return [-1, -1];
  }
  let ng_place = [-1, -1];
  let cnt = 0;
  for (let [drow, dcol] of DIRECTION) {
    if (
      0 <= row + drow &&
      row + drow < SIZE &&
      0 <= col + dcol &&
      col + dcol < SIZE &&
      str_board.charAt((row + drow) * SIZE + col + dcol) == 3 - my_stone_col
    ) {
      cnt += 1;
    } else if (!(0 <= row + drow && row + drow < SIZE && 0 <= col + dcol && col + dcol < SIZE)) {
      cnt += 1;
    } else {
      ng_place = [row + drow, col + dcol];
    }
  }
  if (cnt == 3) {
    return ng_place;
  }
  return [-1, -1];
}

function countStone(str_board) {
  // 盤面文字列 (9 桁または 15 桁) から、盤上の石の数をカウントして勝敗を判定
  output = "";
  let n_black = (str_board.substr(0, SIZE * SIZE).match(/1/g) || []).length;
  let n_white = (str_board.substr(0, SIZE * SIZE).match(/2/g) || []).length;
  output += `<br>&ensp;黒石: ${n_black} 個、白石: ${n_white} 個`;
  if (n_black > n_white) {
    output += `<br>&ensp;${n_black - n_white} 点差で自分の勝ち`;
  } else if (n_black < n_white) {
    output += `<br>&ensp;${n_white - n_black} 点差で相手の勝ち`;
  } else {
    output += "<br>&ensp;引き分け";
  }
  return output;
}

function takeStone(prow, pcol, board_str) {
  // (prow, pcol) と連結する石を取れるなら取って、盤面と取った石の数を返す

  let board = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      board[row][col] = Number(board_str[row * SIZE + col]);
    }
  }

  let color = board[prow][pcol];
  let visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  let Q = [[prow, pcol]];
  visited[prow][pcol] = true;
  let idx = 0;

  while (idx < Q.length) {
    let [row, col] = Q[idx];
    for (let [drow, dcol] of DIRECTION) {
      if (0 <= row + drow && row + drow < SIZE && 0 <= col + dcol && col + dcol < SIZE) {
        if (board[row + drow][col + dcol] === color) {
          if (!visited[row + drow][col + dcol]) {
            visited[row + drow][col + dcol] = true;
            Q.push([row + drow, col + dcol]);
          }
        } else if (board[row + drow][col + dcol] !== 3 - color) {
          // 自石でも相手石でもない点 (= 空点) と隣接しているので取れない
          return [board_str, 0];
        }
      }
    }
    idx++;
  }

  // 取れる
  for (let [row, col] of Q) {
    board[row][col] = 0;
  }

  console.log("board:", board);

  let board_str_ans = "";
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      board_str_ans += String(board[row][col]);
    }
  }
  board_str_ans += board_str.substr(SIZE * SIZE);

  return [board_str_ans, Q.length];
}

async function getPlaceScore(board) {
  // 盤面文字列 (15 桁) から最善手・そのときの最大スコアを取得
  const data = { board: board };

  try {
    // fetch APIを使用してサーバーにPOSTリクエストを送信
    const response = await fetch("/get_message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data), // JavaScriptオブジェクトをJSON文字列に変換
    });

    // レスポンスをJSONとしてパース
    const res = await response.json();

    return [res["x"], res["y"], res["score"]];
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

async function getBoardStr(num) {
  // 盤面番号から盤面文字列 (9 桁) を取得
  const data = { num: num };

  try {
    // fetch APIを使用してサーバーにPOSTリクエストを送信
    const response = await fetch("/get_board_str", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data), // JavaScriptオブジェクトをJSON文字列に変換
    });

    // レスポンスをJSONとしてパース
    const responseData = await response.json();

    return responseData;
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}
