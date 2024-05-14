const size = 3;
const N = size;
const n_board = 5026

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

const DI = [
    [0, 1],  // 右へ移動
    [1, 0],  // 下へ移動
    [0, -1], // 左へ移動
    [-1, 0]  // 上へ移動
];

var board_num = 0;
var str_board = "";
var hama_sente = 0;
var hama_gote = 0;
var isLocked = false; // ロック状態の管理

async function initBoard() {
    board_num = document.getElementById('boardNum').value; // 0-indexed
    str_board = (await getBoardStr(board_num))["board_str"] + '100000';
    isLocked = false;
    hama_sente = 0;
    hama_gote = 0;

    for (let i = 0; i < size*size; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.position = 'relative';
        // board.appendChild(cell);
        const nextCell = board.children[i];

        if (nextCell.firstChild) { // このセルに石がすでに置かれている場合
            nextCell.removeChild(nextCell.firstChild); // 石を除去
            // historyDiv.innerHTML += `<br>除去: ${ii} `;
        }
        if (str_board.charAt(i) == "1") {
            const stone = document.createElement('div');
            stone.className = 'stone black';
            nextCell.appendChild(stone);
            // historyDiv.innerHTML += `<br>黒石: ${ii} `;
        }
        if (str_board.charAt(i) == "2") { 
            const stone = document.createElement('div');
            stone.className = 'stone white';
            nextCell.appendChild(stone);
            // historyDiv.innerHTML += `<br>白石: ${ii} `;
        }
        if (str_board.charAt(i) == "3") { 
            const stone = document.createElement('div');
            stone.className = 'stone red';
            nextCell.appendChild(stone);
        }
    }
}



document.addEventListener('DOMContentLoaded', async function() {
    // alert('DOMContentLoaded');
    board_num = Math.floor(Math.random() * n_board);
    str_board = (await getBoardStr(board_num))["board_str"] + '100000';
    const board = document.getElementById('board');
    const historyDiv = document.getElementById('history'); // 履歴表示用のdiv
    const boardNumDiv = document.getElementById('board_num_str'); // 履歴表示用のdiv
    const passButton = document.getElementById('pass'); // passボタンを取得

    let scorexy = await placeStone(str_board);
    boardNumDiv.innerHTML = "No." + String(board_num) + " 最大得点:" + scorexy["score"];
    console.log("No." + String(board_num) + " 最大得点:" + scorexy["score"] + " str_board:" + str_board + " 黒の最善手:(" + scorexy["x"] + ", " + scorexy["y"] + ")");

    // // 盤面の反映
    // for (let ii = 0; ii < size*size; ii++) {
    //     board.appendChild(cell);
    //     const nextCell = board.children[ii];
    //     // if (nextCell.firstChild) { // このセルに石がすでに置かれている場合
    //     //     nextCell.removeChild(nextCell.firstChild); // 石を除去
    //     //     // historyDiv.innerHTML += `<br>除去: ${ii} `;
    //     // }
    //     if (str_board.charAt(ii) == "1") {
    //         const stone = document.createElement('div');
    //         stone.className = 'stone black';
    //         nextCell.appendChild(stone);
    //         // historyDiv.innerHTML += `<br>黒石: ${ii} `;
    //     }
    //     if (str_board.charAt(ii) == "2") { 
    //         const stone = document.createElement('div');
    //         stone.className = 'stone white';
    //         nextCell.appendChild(stone);
    //         // historyDiv.innerHTML += `<br>白石: ${ii} `;
    //     }
    //     if (str_board.charAt(ii) == "3") { 
    //         const stone = document.createElement('div');
    //         stone.className = 'stone red';
    //         nextCell.appendChild(stone);
    //     }
    // }

    for (let i = 0; i < size*size; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.style.position = 'relative';
        board.appendChild(cell);
        const nextCell = board.children[i];

        if (str_board.charAt(i) == "1") {
            const stone = document.createElement('div');
            stone.className = 'stone black';
            nextCell.appendChild(stone);
            // historyDiv.innerHTML += `<br>黒石: ${ii} `;
        }
        if (str_board.charAt(i) == "2") { 
            const stone = document.createElement('div');
            stone.className = 'stone white';
            nextCell.appendChild(stone);
            // historyDiv.innerHTML += `<br>白石: ${ii} `;
        }
        if (str_board.charAt(i) == "3") { 
            const stone = document.createElement('div');
            stone.className = 'stone red';
            nextCell.appendChild(stone);
        }

        cell.addEventListener('click', async function() {
            if (isLocked) return;
            if (!this.firstChild) { // すでに石が置かれていないことを確認
                // const stone = document.createElement('div');
                // stone.className = 'stone black';
                // this.appendChild(stone);
                let row = Math.floor(i / size);
                let col = i % size;
                historyDiv.innerHTML += `<br>黒石を置いた: (${row + 1}, ${col + 1})`;
                str_board = str_board.substr(0, i) + '1' + str_board.substr(i + 1);
                let taken_stones = 0;
                for (let [drow, dcol] of DI) {
                    if (0 <= row + drow && row + drow < N && 0 <= col + dcol && col + dcol < N) {
                        // alert(str_board.charAt((row + drow) * N + col + dcol));
                        // alert(str_board.charAt(i));

                        if (str_board.charAt((row + drow) * N + col + dcol) != str_board.charAt(i)) {
                            let [str_b, n_stone] = takeStone(row + drow, col + dcol, str_board);
                            str_board = str_b;
                            taken_stones += n_stone;
                        }
                    }
                }
                hama_sente += taken_stones;
                if (taken_stones > 0) {
                    historyDiv.innerHTML += `<br>相手の白石 ${taken_stones} 個を取った`;
                }
                let [str_b, n_stone] = takeStone(row, col, str_board);
                str_board = str_b;
                hama_gote += n_stone;
                if (n_stone > 0) {
                    historyDiv.innerHTML += `<br>自分の黒石 ${n_stone} 個を取られた`;
                }
                
                // コウの処理
                for (let ii = 0; ii < size*size; ii++) {
                    if (str_board.charAt(ii) == '3') {
                        str_board = str_board.substr(0, ii) + '0' + str_board.substr(ii + 1);
                    
                    }
                }
                let [kou_row, kou_col] = checkKou(str_board, row, col, taken_stones, 1);
                if (kou_row != -1) {
                    historyDiv.innerHTML += `<br>コウのためこの座標には打てません: (${kou_row + 1}, ${kou_col + 1})`;
                    str_board = str_board.substr(0, kou_row * size + kou_col) + '3' + str_board.substr(kou_row * size + kou_col + 1);
                }

                // historyDiv.innerHTML += `<br>str: ${str_board.substr(0, size*size + 2)}`;
                // historyDiv.innerHTML += `<br>hama: ${String(hama_sente).padStart(2, '0')} ${String(hama_gote).padStart(2, '0')}`;
                str_board = str_board.substr(0, size*size) + '00' + str_board.substr(size*size + 2);
                str_board = str_board.substr(0, size*size + 2) + String(hama_sente).padStart(2, '0') + String(hama_gote).padStart(2, '0')
                // alert(str_board);
                // alert(globalData[str_board])
                // historyDiv.innerHTML += `<br>str_board: ${str_board} `;

                // 終局判定 (アゲハマ 8 個以上)
                if (hama_sente >= 8) {
                    historyDiv.innerHTML += "<br>10 点差で自分の勝ち";
                    isLocked = true;
                } else if (hama_gote >= 8) {
                    historyDiv.innerHTML += "<br>10 点差で相手の勝ち";
                    isLocked = true;
                }

                // 相手の番
                if (!isLocked) {
                    let scorexy = await placeStone(str_board);
                    let score = scorexy["score"];
                    row = scorexy["x"];
                    col = scorexy["y"];
                    
                    let j = row * size + col;
                    // const nextCell = board.children[j];
                    // const nextStone = document.createElement('div');
                    // nextStone.className = 'stone white';
                    // nextCell.appendChild(nextStone);
                    if (row == -1) {
                        historyDiv.innerHTML += "<br>白はパスをした";
                        
                        // 終局判定 (連続パス)
                        if (str_board.charAt(size*size + 1) == '1') {
                            historyDiv.innerHTML += countStone(str_board);
                            isLocked = true;
                        }

                        str_board = str_board.substr(0, size*size) + '11' + str_board.substr(size*size + 2);
                    } else {
                        historyDiv.innerHTML += `<br>白石を置いた: (${row + 1}, ${col + 1})`;
                        str_board = str_board.substr(0, j) + '2' + str_board.substr(j + 1);
                        taken_stones = 0;
                        for (let [drow, dcol] of DI) {
                            if (0 <= row + drow && row + drow < N && 0 <= col + dcol && col + dcol < N) {
                                // alert(str_board.charAt((row + drow) * N + col + dcol));
                                // alert(str_board.charAt(i));

                                if (str_board.charAt((row + drow) * N + col + dcol) != str_board.charAt(j)) {
                                    let [str_b, n_stone] = takeStone(row + drow, col + dcol, str_board);
                                    str_board = str_b;
                                    taken_stones += n_stone;
                                }
                            }
                        }
                        hama_gote += taken_stones;
                        if (taken_stones > 0) {
                            historyDiv.innerHTML += `<br>相手の黒石 ${taken_stones} 個を取った`;
                        }
                        [str_b, n_stone] = takeStone(row, col, str_board);
                        str_board = str_b;
                        hama_sente += n_stone;
                        if (n_stone > 0) {
                            historyDiv.innerHTML += `<br>自分の白石 ${n_stone} 個を取られた`;
                        }

                        // コウの処理
                        for (let ii = 0; ii < size*size; ii++) {
                            if (str_board.charAt(ii) == '3') {
                                str_board = str_board.substr(0, ii) + '0' + str_board.substr(ii + 1);
                            
                            }
                        }
                        let [kou_row, kou_col] = checkKou(str_board, row, col, taken_stones, 2);
                        if (kou_row != -1) {
                            historyDiv.innerHTML += `<br>コウのためこの座標には打てません: (${kou_row + 1}, ${kou_col + 1})`;
                            str_board = str_board.substr(0, kou_row * size + kou_col) + '3' + str_board.substr(kou_row * size + kou_col + 1);
                        }

                        str_board = str_board.substr(0, size*size) + '10' + str_board.substr(size*size + 2);
                        // historyDiv.innerHTML += `<br>hama: ${String(hama_sente).padStart(2, '0')} ${String(hama_gote).padStart(2, '0')}`;
                        str_board = str_board.substr(0, size*size + 2) + String(hama_sente).padStart(2, '0') + String(hama_gote).padStart(2, '0')
                    }
                    // historyDiv.innerHTML += `<br>str_board: ${str_board} `;

                    // 終局判定 (アゲハマ 8 個以上)
                    if (hama_sente >= 8) {
                        historyDiv.innerHTML += "<br>10 点差で自分の勝ち";
                        isLocked = true;
                    } else if (hama_gote >= 8) {
                        historyDiv.innerHTML += "<br>10 点差で相手の勝ち";
                        isLocked = true;
                    }          
                }

                // if (!isLocked) {
                //     historyDiv.innerHTML += `<br>次の正着は(${globalData[str_board][1]},${globalData[str_board][2]})です(${globalData[str_board][0]}点勝ち)`;
                // }

                // 盤面の反映
                for (let ii = 0; ii < size*size; ii++) {
                    const nextCell = board.children[ii];
                    if (nextCell.firstChild) { // このセルに石がすでに置かれている場合
                        nextCell.removeChild(nextCell.firstChild); // 石を除去
                        // historyDiv.innerHTML += `<br>除去: ${ii} `;
                    }
                    if (str_board.charAt(ii) == "1") {
                        const stone = document.createElement('div');
                        stone.className = 'stone black';
                        nextCell.appendChild(stone);
                        // historyDiv.innerHTML += `<br>黒石: ${ii} `;
                    }
                    if (str_board.charAt(ii) == "2") { 
                        const stone = document.createElement('div');
                        stone.className = 'stone white';
                        nextCell.appendChild(stone);
                        // historyDiv.innerHTML += `<br>白石: ${ii} `;
                    }
                    if (str_board.charAt(ii) == "3") { 
                        const stone = document.createElement('div');
                        stone.className = 'stone red';
                        nextCell.appendChild(stone);
                    }
                }
            }
        });
        
    }

    passButton.addEventListener('click', async function() {
        // historyDiv.innerHTML += "<br>パスボタンを押した";
        if (isLocked) return;
        historyDiv.innerHTML += "<br>黒はパスをした";


        // 終局判定 (連続パス)
        if (str_board.charAt(size*size + 1) == '1') {
            historyDiv.innerHTML += countStone(str_board);
            isLocked = true;
        }

        str_board = str_board.substr(0, size*size) + '01' + str_board.substr(size*size + 2);
        // historyDiv.innerHTML += `<br>str_board: ${str_board} `;

        // 相手の番
        if (!isLocked) {
            let taken_stones = 0;
            // [score, row, col] = globalData[str_board];
            let scorexy = await placeStone(str_board);
            let score = scorexy["score"];
            let row = scorexy["x"];
            let col = scorexy["y"];
            let j = row * size + col;
            // const nextCell = board.children[j];
            // const nextStone = document.createElement('div');
            // nextStone.className = 'stone white';
            // nextCell.appendChild(nextStone);
            if (row == -1) {
                historyDiv.innerHTML += "<br>白はパスをした";                 
                        
                // 終局判定 (連続パス)
                if (str_board.charAt(size*size + 1) == '1') {
                    historyDiv.innerHTML += countStone(str_board);
                    isLocked = true;
                }

                str_board = str_board.substr(0, size*size) + '11' + str_board.substr(size*size + 2);
            } else {
                historyDiv.innerHTML += `<br>白石を置いた: (${row + 1}, ${col + 1})`;
                str_board = str_board.substr(0, j) + '2' + str_board.substr(j + 1);
                taken_stones = 0;
                for (let [drow, dcol] of DI) {
                    if (0 <= row + drow && row + drow < N && 0 <= col + dcol && col + dcol < N) {
                        // alert(str_board.charAt((row + drow) * N + col + dcol));
                        // alert(str_board.charAt(i));

                        if (str_board.charAt((row + drow) * N + col + dcol) != str_board.charAt(j)) {
                            let [str_b, n_stone] = takeStone(row + drow, col + dcol, str_board);
                            str_board = str_b;
                            taken_stones += n_stone;
                        }
                    }
                }
                hama_gote += taken_stones;
                if (taken_stones > 0) {
                    historyDiv.innerHTML += `<br>相手の黒石 ${taken_stones} 個を取った`;
                }
                [str_b, n_stone] = takeStone(row, col, str_board);
                str_board = str_b;
                hama_sente += n_stone;
                if (n_stone > 0) {
                    historyDiv.innerHTML += `<br>自分の白石 ${n_stone} 個を取られた`;
                }

                // コウの処理
                for (let ii = 0; ii < size*size; ii++) {
                    if (str_board.charAt(ii) == '3') {
                        str_board = str_board.substr(0, ii) + '0' + str_board.substr(ii + 1);
                    
                    }
                }
                let [kou_row, kou_col] = checkKou(str_board, row, col, taken_stones, 2);
                if (kou_row != -1) {
                    historyDiv.innerHTML += `<br>コウのためこの座標には打てません: (${kou_row + 1}, ${kou_col + 1})`;
                    str_board = str_board.substr(0, kou_row * size + kou_col) + '3' + str_board.substr(kou_row * size + kou_col + 1);
                }

                str_board = str_board.substr(0, size*size) + '10' + str_board.substr(size*size + 2);
                // historyDiv.innerHTML += `<br>hama: ${String(hama_sente).padStart(2, '0')} ${String(hama_gote).padStart(2, '0')}`;
                str_board = str_board.substr(0, size*size + 2) + String(hama_sente).padStart(2, '0') + String(hama_gote).padStart(2, '0')
            }
            // historyDiv.innerHTML += `<br>str_board: ${str_board} `;

            // 終局判定 (アゲハマ 8 個以上)
            if (hama_sente >= 8) {
                historyDiv.innerHTML += "<br>10 点差で自分の勝ち";
                isLocked = true;
            } else if (hama_gote >= 8) {
                historyDiv.innerHTML += "<br>10 点差で相手の勝ち";
                isLocked = true;
            }          
        }

        // if (!isLocked) {
        //     historyDiv.innerHTML += `<br>次の正着は(${globalData[str_board][1]},${globalData[str_board][2]})です(${globalData[str_board][0]}点勝ち)`;
        // }

        // 盤面の反映
        for (let ii = 0; ii < size*size; ii++) {
            const nextCell = board.children[ii];
            if (nextCell.firstChild) { // このセルに石がすでに置かれている場合
                nextCell.removeChild(nextCell.firstChild); // 石を除去
                // historyDiv.innerHTML += `<br>除去: ${ii} `;
            }
            if (str_board.charAt(ii) == "1") {
                const stone = document.createElement('div');
                stone.className = 'stone black';
                nextCell.appendChild(stone);
                // historyDiv.innerHTML += `<br>黒石: ${ii} `;
            }
            if (str_board.charAt(ii) == "2") { 
                const stone = document.createElement('div');
                stone.className = 'stone white';
                nextCell.appendChild(stone);
                // historyDiv.innerHTML += `<br>白石: ${ii} `;
            }
            if (str_board.charAt(ii) == "3") { 
                const stone = document.createElement('div');
                stone.className = 'stone red';
                nextCell.appendChild(stone);
            }
        }
    });
});


function checkKou(str_board, row, col, n_taken_stone_sum, my_stone_col) {
    if (n_taken_stone_sum != 1) {
        return [-1, -1];
    }
    let ng_place = [-1, -1];
    let cnt = 0;
    for (let [drow, dcol] of DI) {
        if (0 <= row + drow && row + drow < size && 0 <= col + dcol && col + dcol < size && str_board.charAt((row + drow) * size + col + dcol) == 3 - my_stone_col) {
            cnt += 1;
        } else if (!(0 <= row + drow && row + drow < size && 0 <= col + dcol && col + dcol < size)) {
            cnt += 1;
        } else {
            ng_place = [row + drow, col + dcol];
        }
    }
    if (cnt == 3) {
       return ng_place
    }
    return [-1, -1];
}

// # コウで打てない場所の処理
// # 今打った手で石を 1 つだけ取っており、かつ今打った手の 3 方が (相手の石で埋まっている or 盤外) の場合、
// # 次に相手はその抜き跡に打つことができない
// if n_taken_stone_sum == 1:
//     ng_place = (-1, -1)
//     cnt = 0
//     for di, dj in DI:
//         if 0 <= i + di < N and 0 <= j + dj < N and board[i + di][j + dj] == 1 + int(state.turn):
//             cnt += 1
//         elif not (0 <= i + di < N and 0 <= j + dj < N):
//             cnt += 1
//         else:
//             ng_place = (i + di, j + dj)
//     if cnt == 3:
//         board[ng_place[0]][ng_place[1]] = 3

function countStone(str_board) {
    output = "";
    let n_black = ( str_board.substr(0, size*size).match( /1/g ) || [] ).length;
    let n_white = ( str_board.substr(0, size*size).match( /2/g ) || [] ).length;
    output += `<br>黒石: ${n_black} 個、白石: ${n_white} 個`;
    if (n_black > n_white) {
        output += `<br>${n_black - n_white} 点差で自分の勝ち`;
    } else if (n_black < n_white) {
        output += `<br>${n_white - n_black} 点差で相手の勝ち`;
    } else {
        output += "<br>引き分け";
    }
    return output;
}

function takeStone(pi, pj, board_str) {
    // (pi, pj) と連結する石を取れるなら取って、盤面と取った石の数を返す

    let board = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            board[i][j] = Number(board_str[i * N + j]);
        }
    }

    let col = board[pi][pj];
    let visited = Array.from({ length: N }, () => Array(N).fill(false));
    let Q = [[pi, pj]];
    visited[pi][pj] = true;
    let ind = 0;

    while (ind < Q.length) {
        let [i, j] = Q[ind];
        for (let [di, dj] of DI) {
            if (0 <= i + di && i + di < N && 0 <= j + dj && j + dj < N) {
                if (board[i + di][j + dj] === col) {
                    if (!visited[i + di][j + dj]) {
                        visited[i + di][j + dj] = true;
                        Q.push([i + di, j + dj]);
                    }
                } else if (board[i + di][j + dj] !== 3 - col) {
                    // 自石でも相手石でもない点 (= 空点) と隣接しているので取れない
                    return [board_str, 0];
                }
            }
        }
        ind++;
    }

    // 取れる
    for (let [i, j] of Q) {
        board[i][j] = 0;
    }

    console.log("board:", board);

    let board_str_ans = "";
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            board_str_ans += String(board[i][j]);
        }
    }
    board_str_ans += board_str.substr(N * N);

    return [board_str_ans, Q.length];
}


async function placeStone(board) {
    // サーバーに送るデータを準備
    const data = { board: board };

    try {
        // fetch APIを使用してサーバーにPOSTリクエストを送信
        const response = await fetch('/get_message', {
            method: 'POST',             // HTTPメソッドをPOSTに設定
            headers: {
                'Content-Type': 'application/json'  // コンテンツタイプをJSONに設定
            },
            body: JSON.stringify(data)  // JavaScriptオブジェクトをJSON文字列に変換
        });

        // レスポンスをJSONとしてパース
        const responseData = await response.json();
        // console.log('Server response:', responseData);
        
        // サーバーからのレスポンスメッセージを関数の戻り値として返す
        return responseData;
    } catch (error) {
        // エラーが発生した場合、エラーメッセージをコンソールに出力
        console.error('Error:', error);
        return null; // エラーが発生した場合はnullを返す
    }
}



async function getBoardStr(num) {
    // サーバーに送るデータを準備
    const data = { num: num };

    try {
        // fetch APIを使用してサーバーにPOSTリクエストを送信
        const response = await fetch('/get_board_str', {
            method: 'POST',             // HTTPメソッドをPOSTに設定
            headers: {
                'Content-Type': 'application/json'  // コンテンツタイプをJSONに設定
            },
            body: JSON.stringify(data)  // JavaScriptオブジェクトをJSON文字列に変換
        });

        // レスポンスをJSONとしてパース
        const responseData = await response.json();
        // console.log('Server response:', responseData);
        
        // サーバーからのレスポンスメッセージを関数の戻り値として返す
        return responseData;
    } catch (error) {
        // エラーが発生した場合、エラーメッセージをコンソールに出力
        console.error('Error:', error);
        return null; // エラーが発生した場合はnullを返す
    }
}
