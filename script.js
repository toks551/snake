//グローバル変数・設定
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const tileCount = 20;
const tileSize = canvas.width / tileCount;

let gameOver = false;
let scoreUser = 0;
let scoreAI = 0;

// ユーザー操作スネーク
let snakeUser = [];
let velocityUser = { x: 1, y: 0 };

// BFS AIスネーク
let snakeAI = [];
let velocityAI = { x: -1, y: 0 };

// 食べ物
let food = { x: 5, y: 5 };

// スタートボタン
const startButton = document.getElementById("startButton");
startButton.addEventListener("click", startGame);

// ユーザー操作(キー入力)
document.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
      if (velocityUser.y !== 1) velocityUser = { x: 0, y: -1 };
      break;
    case "ArrowDown":
      if (velocityUser.y !== -1) velocityUser = { x: 0, y: 1 };
      break;
    case "ArrowLeft":
      if (velocityUser.x !== 1) velocityUser = { x: -1, y: 0 };
      break;
    case "ArrowRight":
      if (velocityUser.x !== -1) velocityUser = { x: 1, y: 0 };
      break;
  }
});

//ゲーム開始 & リセット
 
function startGame() {
  resetGame();
  gameLoop();
}

function resetGame() {
  snakeUser = [{ x: 3, y: 10 }];
  velocityUser = { x: 1, y: 0 };

  snakeAI = [{ x: 16, y: 10 }];
  velocityAI = { x: -1, y: 0 };

  scoreUser = 0;
  scoreAI = 0;
  food = { x: 5, y: 5 };
  gameOver = false;
}

//ゲームループ
function gameLoop() {
  if (gameOver) {
    drawGameOver();
    return;
  }

  // ユーザー蛇の更新
  updateUser();

  // AIのBFSロジックで次の一手を決める
  updateAI();   // velocityAI を更新
  updateSnakeAI();

  // 描画
  draw();

  // 毎回200msで更新 (やや遅め)
  setTimeout(gameLoop, 200);
}

//ユーザー蛇の更新
function updateUser() {
  const head = {
    x: snakeUser[0].x + velocityUser.x,
    y: snakeUser[0].y + velocityUser.y
  };

  // 壁衝突
  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
    gameOver = true;
    return;
  }
  // 自分自身との衝突
  for (let i = 1; i < snakeUser.length; i++) {
    if (snakeUser[i].x === head.x && snakeUser[i].y === head.y) {
      gameOver = true;
      return;
    }
  }
  // AI蛇との衝突
  for (let seg of snakeAI) {
    if (seg.x === head.x && seg.y === head.y) {
      gameOver = true;
      return;
    }
  }

  snakeUser.unshift(head);

  // 食べ物を食べた
  if (head.x === food.x && head.y === food.y) {
    scoreUser++;
    placeFood();
  } else {
    snakeUser.pop();
  }
}

//BFS AI: フロントエンドで完結するローカルAI

function updateAI() {
  // 1. BFSで food までの最短経路を探す
  let direction = findDirectionByBFS();

  // 2. velocityAI を更新
  if (direction === 'up' && velocityAI.y !== 1) {
    velocityAI = { x: 0, y: -1 };
  } else if (direction === 'down' && velocityAI.y !== -1) {
    velocityAI = { x: 0, y: 1 };
  } else if (direction === 'left' && velocityAI.x !== 1) {
    velocityAI = { x: -1, y: 0 };
  } else if (direction === 'right' && velocityAI.x !== -1) {
    velocityAI = { x: 1, y: 0 };
  }
}


function findDirectionByBFS() {
  const head = snakeAI[0];
  const queue = [];
  const visited = new Set();

  // BFSで使う方向セット
  const directions = [
    { x: 0, y: -1, dir: 'up' },
    { x: 0, y: 1,  dir: 'down' },
    { x:-1, y: 0,  dir: 'left' },
    { x: 1, y: 0,  dir: 'right' }
  ];

  // キー化関数
  const toKey = (x, y) => `${x},${y}`;

  // 初期キューに「(head.x, head.y)」
  queue.push({
    x: head.x,
    y: head.y,
    path: []  // ここに dir の列を入れていく
  });
  visited.add(toKey(head.x, head.y));

  while (queue.length > 0) {
    let current = queue.shift();

    // 食べ物を見つけたら、最初の一手を返す
    if (current.x === food.x && current.y === food.y) {
      // path[0] が最初の一手の方向
      return current.path.length > 0 ? current.path[0] : null;
    }

    // 4方向を試す
    for (let d of directions) {
      let nx = current.x + d.x;
      let ny = current.y + d.y;
      // 範囲チェック(壁判定)
      if (nx < 0 || nx >= tileCount || ny < 0 || ny >= tileCount) {
        continue;
      }
      // 衝突判定 (AI自身、ユーザー蛇)
      if (isCollision(nx, ny)) {
        continue;
      }
      // 未訪問ならキューへ追加
      let key = toKey(nx, ny);
      if (!visited.has(key)) {
        visited.add(key);
        // いまの path に d.dir を追加
        let newPath = [...current.path, d.dir];
        queue.push({ x: nx, y: ny, path: newPath });
      }
    }
  }

  // パスが見つからない → ランダムに動く or 何もしない
  return null;
}

/**
 * そのマス (nx,ny) が衝突(壁/スネークの体) かどうか判定
 */
function isCollision(nx, ny) {
  // AIスネークの体
  for (let i = 0; i < snakeAI.length; i++) {
    if (snakeAI[i].x === nx && snakeAI[i].y === ny) return true;
  }
  // ユーザー蛇の体
  for (let i = 0; i < snakeUser.length; i++) {
    if (snakeUser[i].x === nx && snakeUser[i].y === ny) return true;
  }
  return false;
}

//AI蛇の更新
function updateSnakeAI() {
  const head = {
    x: snakeAI[0].x + velocityAI.x,
    y: snakeAI[0].y + velocityAI.y
  };

  // 壁衝突
  if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
    gameOver = true;
    return;
  }
  // AI自身の衝突
  for (let i = 1; i < snakeAI.length; i++) {
    if (snakeAI[i].x === head.x && snakeAI[i].y === head.y) {
      gameOver = true;
      return;
    }
  }
  // ユーザー蛇との衝突
  for (let seg of snakeUser) {
    if (seg.x === head.x && seg.y === head.y) {
      gameOver = true;
      return;
    }
  }

  snakeAI.unshift(head);

  // 食べ物
  if (head.x === food.x && head.y === food.y) {
    scoreAI++;
    placeFood();
  } else {
    snakeAI.pop();
  }
}

//食べ物配置

function placeFood() {
  while (true) {
    let fx = Math.floor(Math.random() * tileCount);
    let fy = Math.floor(Math.random() * tileCount);
    const conflictAI = snakeAI.some(s=> s.x===fx && s.y===fy);
    const conflictUser = snakeUser.some(s=> s.x===fx && s.y===fy);
    if (!conflictAI && !conflictUser) {
      food.x=fx;
      food.y=fy;
      break;
    }
  }
}

//描画

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // 食べ物
  ctx.fillStyle="red";
  ctx.fillRect(food.x*tileSize,food.y*tileSize,tileSize,tileSize);

  // ユーザー蛇
  ctx.fillStyle="lime";
  snakeUser.forEach(seg=>{
    ctx.fillRect(seg.x*tileSize,seg.y*tileSize,tileSize,tileSize);
  });

  // AI蛇
  ctx.fillStyle="cyan";
  snakeAI.forEach(seg=>{
    ctx.fillRect(seg.x*tileSize,seg.y*tileSize,tileSize,tileSize);
  });

  // スコア
  ctx.fillStyle="white";
  ctx.font="16px sans-serif";
  ctx.fillText(`User: ${scoreUser}`,10,20);
  ctx.fillText(`AI:   ${scoreAI}`,10,40);
}

//ゲームオーバー
function drawGameOver() {
  ctx.fillStyle="rgba(0,0,0,0.6)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle="white";
  ctx.font="30px sans-serif";
  ctx.fillText("Game Over",canvas.width/2 -70,canvas.height/2);

  ctx.font="20px sans-serif";
  ctx.fillText(`User: ${scoreUser}`,100,canvas.height/2 +30);
  ctx.fillText(`AI:   ${scoreAI}`,230,canvas.height/2 +30);
}
