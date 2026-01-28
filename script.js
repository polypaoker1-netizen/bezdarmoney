// Данные игрока
let player = {
    balance: 1000,
    gamesPlayed: 0,
    totalWins: 0,
    bestWin: 0
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    updateUI();
});

// Обновление интерфейса
function updateUI() {
    document.getElementById('balance').textContent = player.balance;
    document.getElementById('games-played').textContent = player.gamesPlayed;
    document.getElementById('total-wins').textContent = player.totalWins;
    document.getElementById('best-win').textContent = player.bestWin;
}

// Показать главное меню
function showMainGames() {
    const main = document.querySelector('main');
    main.innerHTML = `
        <div class="games-section">
            <div class="games-header">
                <h2><i class="fas fa-gamepad"></i> Выберите игру</h2>
                <div class="stats-bar">
                    <div class="stat">
                        <span class="stat-label">Игр:</span>
                        <span id="games-played">${player.gamesPlayed}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Выиграно:</span>
                        <span id="total-wins">${player.totalWins}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Рекорд:</span>
                        <span id="best-win">${player.bestWin}</span>
                    </div>
                </div>
            </div>

            <div class="games-grid">
                <div class="game-card" onclick="openRoulette()">
                    <div class="game-icon roulette-icon">
                        <i class="fas fa-roulette-wheel"></i>
                    </div>
                    <h3>РУЛЕТКА</h3>
                    <p>Красное / Чёрное / Зелёное</p>
                    <div class="game-multiplier">до x36</div>
                </div>

                <div class="game-card" onclick="openSlots()">
                    <div class="game-icon slots-icon">
                        <i class="fas fa-sliders-h"></i>
                    </div>
                    <h3>СЛОТЫ</h3>
                    <p>777 Джекпот</p>
                    <div class="game-multiplier">до x100</div>
                </div>

                <div class="game-card" onclick="openMines()">
                    <div class="game-icon mines-icon">
                        <i class="fas fa-gem"></i>
                    </div>
                    <h3>MINES</h3>
                    <p>Найди алмазы</p>
                    <div class="game-multiplier">до x100</div>
                </div>

                <div class="game-card" onclick="openDice()">
                    <div class="game-icon dice-icon">
                        <i class="fas fa-dice"></i>
                    </div>
                    <h3>DICE</h3>
                    <p>Угадай число</p>
                    <div class="game-multiplier">до x99</div>
                </div>

                <div class="game-card" onclick="openCrash()">
                    <div class="game-icon crash-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <h3>CRASH</h3>
                    <p>Успей забрать</p>
                    <div class="game-multiplier">до x1000</div>
                </div>
            </div>
        </div>
    `;
    
    updateUI();
}

// Показать статистику
function openStats() {
    const main = document.querySelector('main');
    main.innerHTML = `
        <button class="back-btn" onclick="showMainGames()">
            <i class="fas fa-arrow-left"></i> Назад
        </button>
        
        <div class="game-screen">
            <h2><i class="fas fa-chart-bar"></i> Статистика</h2>
            
            <div class="stats-card">
                <div class="stat-item">
                    <span>Баланс</span>
                    <strong>${player.balance} звёзд</strong>
                </div>
                <div class="stat-item">
                    <span>Всего игр</span>
                    <strong>${player.gamesPlayed}</strong>
                </div>
                <div class="stat-item">
                    <span>Всего выиграно</span>
                    <strong>${player.totalWins} звёзд</strong>
                </div>
                <div class="stat-item">
                    <span>Лучший выигрыш</span>
                    <strong>${player.bestWin} звёзд</strong>
                </div>
                <div class="stat-item">
                    <span>Процент побед</span>
                    <strong>${player.gamesPlayed > 0 ? Math.round((player.totalWins / (player.gamesPlayed * 100)) * 100) : 0}%</strong>
                </div>
            </div>
        </div>
    `;
    
    // Добавляем стили для карточки статистики
    const style = document.createElement('style');
    style.textContent = `
        .stats-card {
            background: rgba(255, 255, 255, 0.05);
            padding: 25px;
            border-radius: 15px;
            border: 2px solid rgba(255, 215, 0, 0.3);
        }
        
        .stat-item {
            display: flex;
            justify-content: space-between;
            padding: 15px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .stat-item:last-child {
            border-bottom: none;
        }
        
        .stat-item span {
            color: #aaa;
        }
        
        .stat-item strong {
            color: #ffd700;
            font-size: 1.2rem;
        }
    `;
    document.head.appendChild(style);
}

// РУЛЕТКА
function openRoulette() {
    const main = document.querySelector('main');
    main.innerHTML = `
        <button class="back-btn" onclick="showMainGames()">
            <i class="fas fa-arrow-left"></i> Назад
        </button>
        
        <div class="game-screen">
            <h2><i class="fas fa-roulette-wheel"></i> РУЛЕТКА</h2>
            
            <div class="bet-controls">
                <div class="bet-amount">
                    <span>Ставка:</span>
                    <input type="number" id="rouletteBet" value="100" min="10" max="${player.balance}"> звёзд
                </div>
                
                <div style="margin: 20px 0;">
                    <p>Выберите ставку:</p>
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button class="bet-btn" onclick="selectRouletteBet('red')" style="background:#dc3545;">Красное (x2)</button>
                        <button class="bet-btn" onclick="selectRouletteBet('black')" style="background:#343a40;">Чёрное (x2)</button>
                        <button class="bet-btn" onclick="selectRouletteBet('green')" style="background:#28a745;">Зелёное (x14)</button>
                    </div>
                </div>
            </div>
            
            <div style="text-align:center; margin: 30px 0;">
                <div id="rouletteResult" class="result-display">─</div>
            </div>
            
            <button class="game-btn" onclick="spinRoulette()">
                <i class="fas fa-play"></i> Крутить рулетку
            </button>
        </div>
    `;
    
    rouletteSelectedBet = null;
    
    // Добавляем стили для кнопок ставок
    const style = document.createElement('style');
    style.textContent = `
        .bet-btn {
            flex: 1;
            padding: 15px;
            border: none;
            border-radius: 10px;
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .bet-btn:hover {
            transform: scale(1.05);
            opacity: 0.9;
        }
        
        .bet-btn.active {
            border: 3px solid #ffd700;
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
        }
    `;
    document.head.appendChild(style);
}

let rouletteSelectedBet = null;

function selectRouletteBet(betType) {
    rouletteSelectedBet = betType;
    
    document.querySelectorAll('.bet-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    event.target.classList.add('active');
}

function spinRoulette() {
    const bet = parseInt(document.getElementById('rouletteBet').value);
    
    if (!rouletteSelectedBet) {
        showMessage('Выберите ставку!', 'error');
        return;
    }
    
    if (bet > player.balance) {
        showMessage('Недостаточно звёзд!', 'error');
        return;
    }
    
    const resultNumber = Math.floor(Math.random() * 37);
    let resultColor;
    
    if (resultNumber === 0) {
        resultColor = 'green';
    } else if (resultNumber % 2 === 0) {
        resultColor = 'black';
    } else {
        resultColor = 'red';
    }
    
    let multiplier = 0;
    if (rouletteSelectedBet === resultColor) {
        multiplier = resultColor === 'green' ? 14 : 2;
    }
    
    const win = bet * multiplier;
    const resultDiv = document.getElementById('rouletteResult');
    
    resultDiv.className = multiplier > 0 ? 'result-display win' : 'result-display lose';
    
    setTimeout(() => {
        resultDiv.innerHTML = `
            <div>Выпало: <strong>${resultNumber}</strong></div>
            <div>Цвет: <strong style="color:${
                resultColor === 'red' ? '#dc3545' : 
                resultColor === 'black' ? 'white' : '#28a745'
            }">${resultColor === 'red' ? 'КРАСНОЕ' : resultColor === 'black' ? 'ЧЁРНОЕ' : 'ЗЕЛЁНОЕ'}</strong></div>
        `;
        
        setTimeout(() => {
            if (multiplier > 0) {
                player.balance += win;
                player.totalWins += win;
                player.bestWin = Math.max(player.bestWin, win);
                
                resultDiv.innerHTML += `<div style="margin-top:10px;font-size:1.5rem;">🏆 +${win} звёзд (x${multiplier})</div>`;
                showMessage(`🎉 Победа! +${win} звёзд`, 'win');
            } else {
                player.balance -= bet;
                resultDiv.innerHTML += `<div style="margin-top:10px;font-size:1.5rem;">💸 -${bet} звёзд</div>`;
                showMessage(`😢 Проигрыш! -${bet} звёзд`, 'lose');
            }
            
            player.gamesPlayed++;
            updateUI();
        }, 1000);
    }, 500);
}

// СЛОТЫ
function openSlots() {
    const main = document.querySelector('main');
    main.innerHTML = `
        <button class="back-btn" onclick="showMainGames()">
            <i class="fas fa-arrow-left"></i> Назад
        </button>
        
        <div class="game-screen">
            <h2><i class="fas fa-sliders-h"></i> СЛОТЫ</h2>
            
            <div class="bet-controls">
                <div class="bet-amount">
                    <span>Ставка:</span>
                    <input type="number" id="slotsBet" value="100" min="10" max="${player.balance}"> звёзд
                </div>
            </div>
            
            <div style="text-align:center; margin: 30px 0;">
                <div class="slots-reels" style="display:flex; justify-content:center; gap:10px; margin-bottom:20px;">
                    <div class="reel" id="reel1" style="width:60px;height:60px;background:white;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:2rem;">7</div>
                    <div class="reel" id="reel2" style="width:60px;height:60px;background:white;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:2rem;">7</div>
                    <div class="reel" id="reel3" style="width:60px;height:60px;background:white;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:2rem;">7</div>
                </div>
                <div id="slotsResult" class="result-display">─</div>
            </div>
            
            <button class="game-btn" onclick="spinSlots()">
                <i class="fas fa-play"></i> Крутить слоты
            </button>
        </div>
    `;
}

function spinSlots() {
    const bet = parseInt(document.getElementById('slotsBet').value);
    
    if (bet > player.balance) {
        showMessage('Недостаточно звёзд!', 'error');
        return;
    }
    
    // Анимация вращения
    for (let i = 1; i <= 3; i++) {
        const reel = document.getElementById(`reel${i}`);
        reel.style.animation = 'shake 0.1s infinite';
    }
    
    setTimeout(() => {
        const symbols = ['7', '🍒', '🍋', '⭐', '💎'];
        const results = [];
        
        for (let i = 1; i <= 3; i++) {
            const reel = document.getElementById(`reel${i}`);
            reel.style.animation = 'none';
            
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            results.push(symbol);
            reel.textContent = symbol;
        }
        
        // Проверяем комбинации
        let multiplier = 0;
        let winMessage = '';
        
        if (results[0] === results[1] && results[1] === results[2]) {
            if (results[0] === '7') {
                multiplier = 100;
                winMessage = 'ДЖЕКПОТ 777!';
            } else if (results[0] === '💎') {
                multiplier = 50;
                winMessage = '3 АЛМАЗА!';
            } else {
                multiplier = 10;
                winMessage = '3 в ряд!';
            }
        } else if (results[0] === results[1] || results[1] === results[2]) {
            multiplier = 2;
            winMessage = '2 одинаковых!';
        }
        
        const win = bet * multiplier;
        const resultDiv = document.getElementById('slotsResult');
        
        resultDiv.className = multiplier > 0 ? 'result-display win' : 'result-display lose';
        
        setTimeout(() => {
            resultDiv.innerHTML = `${winMessage}<br>${results.join(' ')}`;
            
            setTimeout(() => {
                if (multiplier > 0) {
                    player.balance += win;
                    player.totalWins += win;
                    player.bestWin = Math.max(player.bestWin, win);
                    
                    resultDiv.innerHTML += `<div style="margin-top:10px;font-size:1.5rem;">🏆 +${win} звёзд (x${multiplier})</div>`;
                    showMessage(`🎰 ${winMessage} +${win} звёзд`, 'win');
                } else {
                    player.balance -= bet;
                    resultDiv.innerHTML += `<div style="margin-top:10px;font-size:1.5rem;">💸 -${bet} звёзд</div>`;
                    showMessage(`😢 Проигрыш! -${bet} звёзд`, 'lose');
                }
                
                player.gamesPlayed++;
                updateUI();
            }, 1000);
        }, 500);
        
    }, 1000);
    
    // Добавляем анимацию
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
    `;
    document.head.appendChild(style);
}

// MINES
function openMines() {
    const main = document.querySelector('main');
    main.innerHTML = `
        <button class="back-btn" onclick="showMainGames()">
            <i class="fas fa-arrow-left"></i> Назад
        </button>
        
        <div class="game-screen">
            <h2><i class="fas fa-gem"></i> MINES</h2>
            
            <div class="bet-controls">
                <div class="bet-amount">
                    <span>Ставка:</span>
                    <input type="number" id="minesBet" value="100" min="10" max="${player.balance}"> звёзд
                </div>
                
                <div style="margin: 20px 0;">
                    <p>Количество мин:</p>
                    <div style="display:flex; align-items:center; gap:15px; margin-top:10px;">
                        <button onclick="changeMines(-1)" style="width:40px;height:40px;background:rgba(255,255,255,0.1);border:none;border-radius:50%;color:white;font-size:1.5rem;">-</button>
                        <span id="minesCount" style="font-size:1.5rem;">3</span>
                        <button onclick="changeMines(1)" style="width:40px;height:40px;background:rgba(255,255,255,0.1);border:none;border-radius:50%;color:white;font-size:1.5rem;">+</button>
                    </div>
                </div>
            </div>
            
            <div style="text-align:center; margin: 30px 0;">
                <div id="minesGrid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;max-width:300px;margin:0 auto;"></div>
                <div id="minesResult" class="result-display" style="margin-top:20px;">─</div>
            </div>
            
            <button class="game-btn" onclick="startMines()" id="minesBtn">
                <i class="fas fa-play"></i> Начать игру
            </button>
        </div>
    `;
    
    createMinesGrid();
}

let minesCount = 3;
let minesActive = false;
let minesBet = 0;
let minesGrid = [];
let minesRevealed = 0;

function changeMines(delta) {
    minesCount = Math.max(1, Math.min(10, minesCount + delta));
    document.getElementById('minesCount').textContent = minesCount;
}

function createMinesGrid() {
    const grid = document.getElementById('minesGrid');
    grid.innerHTML = '';
    
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.style.width = '50px';
        cell.style.height = '50px';
        cell.style.background = 'linear-gradient(45deg, #007bff, #6610f2)';
        cell.style.borderRadius = '10px';
        cell.style.display = 'flex';
        cell.style.alignItems = 'center';
        cell.style.justifyContent = 'center';
        cell.style.cursor = 'pointer';
        cell.style.fontSize = '1.5rem';
        cell.textContent = '?';
        cell.dataset.index = i;
        cell.onclick = () => clickMineCell(i);
        grid.appendChild(cell);
    }
}

function startMines() {
    if (minesActive) {
        cashoutMines();
        return;
    }
    
    const bet = parseInt(document.getElementById('minesBet').value);
    
    if (bet > player.balance) {
        showMessage('Недостаточно звёзд!', 'error');
        return;
    }
    
    minesBet = bet;
    minesActive = true;
    minesRevealed = 0;
    player.balance -= bet;
    updateUI();
    
    // Создаем поле с минами
    minesGrid = Array(25).fill(false);
    let minesPlaced = 0;
    
    while (minesPlaced < minesCount) {
        const index = Math.floor(Math.random() * 25);
        if (!minesGrid[index]) {
            minesGrid[index] = true;
            minesPlaced++;
        }
    }
    
    document.getElementById('minesBtn').innerHTML = '<i class="fas fa-money-bill-wave"></i> Забрать деньги';
    document.getElementById('minesResult').textContent = 'Найдите алмазы!';
    
    // Сбрасываем ячейки
    document.querySelectorAll('.mine-cell').forEach(cell => {
        cell.textContent = '?';
        cell.style.background = 'linear-gradient(45deg, #007bff, #6610f2)';
        cell.style.cursor = 'pointer';
    });
}

function clickMineCell(index) {
    if (!minesActive) return;
    
    const cell = document.querySelector(`.mine-cell[data-index="${index}"]`);
    
    if (cell.textContent !== '?') return;
    
    if (minesGrid[index]) {
        // МИНА!
        cell.textContent = '💥';
        cell.style.background = 'linear-gradient(45deg, #dc3545, #c82333)';
        endMinesGame(false);
    } else {
        // АЛМАЗ
        cell.textContent = '💎';
        cell.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
        minesRevealed++;
        
        // Проверяем победу
        if (minesRevealed === (25 - minesCount)) {
            endMinesGame(true);
        }
    }
}

function cashoutMines() {
    if (!minesActive || minesRevealed === 0) return;
    endMinesGame(true, true);
}

function endMinesGame(win, cashout = false) {
    minesActive = false;
    
    // Показываем все мины
    document.querySelectorAll('.mine-cell').forEach((cell, index) => {
        if (minesGrid[index] && cell.textContent !== '💥') {
            cell.textContent = '💣';
            cell.style.background = 'linear-gradient(45deg, #dc3545, #c82333)';
        }
        cell.style.cursor = 'default';
    });
    
    // Вычисляем выигрыш
    let multiplier = 0;
    
    if (win) {
        const baseMultiplier = 1 + (minesCount / 3);
        multiplier = cashout ? 
            (baseMultiplier * (minesRevealed / (25 - minesCount))).toFixed(2) :
            baseMultiplier * 2;
    }
    
    const winAmount = Math.floor(minesBet * multiplier);
    const resultDiv = document.getElementById('minesResult');
    
    resultDiv.className = win ? 'result-display win' : 'result-display lose';
    
    setTimeout(() => {
        if (win) {
            player.balance += winAmount;
            player.totalWins += winAmount;
            player.bestWin = Math.max(player.bestWin, winAmount);
            
            resultDiv.innerHTML = `${cashout ? 'Забрали деньги!' : 'Вы выиграли!'}<br>🏆 +${winAmount} звёзд (x${multiplier})`;
            showMessage(cashout ? `💰 +${winAmount} звёзд` : `🎉 Победа! +${winAmount} звёзд`, 'win');
        } else {
            resultDiv.innerHTML = 'МИНА!<br>💸 Проигрыш';
            showMessage(`💥 Мина! -${minesBet} звёзд`, 'lose');
        }
        
        player.gamesPlayed++;
        updateUI();
        
        document.getElementById('minesBtn').innerHTML = '<i class="fas fa-play"></i> Начать игру';
        document.getElementById('minesBtn').onclick = startMines;
    }, 1000);
}

// DICE
function openDice() {
    const main = document.querySelector('main');
    main.innerHTML = `
        <button class="back-btn" onclick="showMainGames()">
            <i class="fas fa-arrow-left"></i> Назад
        </button>
        
        <div class="game-screen">
            <h2><i class="fas fa-dice"></i> DICE</h2>
            
            <div class="bet-controls">
                <div class="bet-amount">
                    <span>Ставка:</span>
                    <input type="number" id="diceBet" value="100" min="10" max="${player.balance}"> звёзд
                </div>
                
                <div style="margin: 20px 0;">
                    <p>Угадайте число от 1 до 100:</p>
                    <input type="number" id="diceGuess" value="50" min="1" max="100" style="
                        width: 100px;
                        padding: 10px;
                        background: rgba(255,255,255,0.1);
                        border: 2px solid #ffd700;
                        border-radius: 10px;
                        color: white;
                        text-align: center;
                        font-size: 1.2rem;
                        margin-top: 10px;
                    ">
                </div>
            </div>
            
            <div style="text-align:center; margin: 30px 0;">
                <div id="diceResult" class="result-display">─</div>
            </div>
            
            <button class="game-btn" onclick="rollDice()">
                <i class="fas fa-dice"></i> Бросить кости
            </button>
        </div>
    `;
}

function rollDice() {
    const bet = parseInt(document.getElementById('diceBet').value);
    const guess = parseInt(document.getElementById('diceGuess').value);
    
    if (bet > player.balance) {
        showMessage('Недостаточно звёзд!', 'error');
        return;
    }
    
    if (guess < 1 || guess > 100) {
        showMessage('Число должно быть от 1 до 100!', 'error');
        return;
    }
    
    const result = Math.floor(Math.random() * 100) + 1;
    const difference = Math.abs(guess - result);
    let multiplier = 0;
    
    if (guess === result) {
        multiplier = 99;
    } else if (difference <= 5) {
        multiplier = 5;
    } else if (difference <= 10) {
        multiplier = 2;
    }
    
    const win = bet * multiplier;
    const resultDiv = document.getElementById('diceResult');
    
    resultDiv.className = multiplier > 0 ? 'result-display win' : 'result-display lose';
    
    setTimeout(() => {
        resultDiv.innerHTML = `Выпало: <strong>${result}</strong>`;
        
        setTimeout(() => {
            if (multiplier > 0) {
                player.balance += win;
                player.totalWins += win;
                player.bestWin = Math.max(player.bestWin, win);
                
                resultDiv.innerHTML += `<div style="margin-top:10px;font-size:1.5rem;">🏆 +${win} звёзд (x${multiplier})</div>`;
                showMessage(`🎉 Угадал! +${win} звёзд`, 'win');
            } else {
                player.balance -= bet;
                resultDiv.innerHTML += `<div style="margin-top:10px;font-size:1.5rem;">💸 -${bet} звёзд</div>`;
                showMessage(`😢 Не угадал! -${bet} звёзд`, 'lose');
            }
            
            player.gamesPlayed++;
            updateUI();
        }, 1000);
    }, 500);
}

// CRASH
function openCrash() {
    const main = document.querySelector('main');
    main.innerHTML = `
        <button class="back-btn" onclick="showMainGames()">
            <i class="fas fa-arrow-left"></i> Назад
        </button>
        
        <div class="game-screen">
            <h2><i class="fas fa-chart-line"></i> CRASH</h2>
            
            <div class="bet-controls">
                <div class="bet-amount">
                    <span>Ставка:</span>
                    <input type="number" id="crashBet" value="100" min="10" max="${player.balance}"> звёзд
                </div>
            </div>
            
            <div style="text-align:center; margin: 30px 0;">
                <div id="crashMultiplier" style="font-size:4rem;font-weight:bold;color:#ffd700;">1.00x</div>
                <div id="crashResult" class="result-display" style="margin-top:20px;">─</div>
            </div>
            
            <div style="display:flex; gap:20px;">
                <button class="game-btn" onclick="startCrash()" id="crashStartBtn" style="flex:1;">
                    <i class="fas fa-play"></i> Старт
                </button>
                <button class="game-btn" onclick="cashoutCrash()" id="crashCashoutBtn" disabled style="flex:1;background:linear-gradient(45deg,#28a745,#20c997);">
                    <i class="fas fa-money-bill-wave"></i> Забрать
                </button>
            </div>
        </div>
    `;
}

let crashActive = false;
let crashMultiplier = 1.0;
let crashInterval = null;
let crashBet = 0;

function startCrash() {
    if (crashActive) return;
    
    const bet = parseInt(document.getElementById('crashBet').value);
    
    if (bet > player.balance) {
        showMessage('Недостаточно звёзд!', 'error');
        return;
    }
    
    crashBet = bet;
    crashActive = true;
    crashMultiplier = 1.0;
    player.balance -= bet;
    updateUI();
    
    document.getElementById('crashStartBtn').disabled = true;
    document.getElementById('crashCashoutBtn').disabled = false;
    document.getElementById('crashMultiplier').textContent = '1.00x';
    document.getElementById('crashResult').textContent = 'Множитель растёт...';
    
    // Запускаем рост
    crashInterval = setInterval(() => {
        crashMultiplier += 0.01 + (Math.random() * 0.05);
        document.getElementById('crashMultiplier').textContent = crashMultiplier.toFixed(2) + 'x';
        
        // Шанс краша (2% каждый шаг)
        if (Math.random() < 0.02) {
            endCrash(false);
        }
    }, 100);
}

function cashoutCrash() {
    if (!crashActive) return;
    endCrash(true);
}

function endCrash(cashedOut) {
    clearInterval(crashInterval);
    crashActive = false;
    
    document.getElementById('crashStartBtn').disabled = false;
    document.getElementById('crashCashoutBtn').disabled = true;
    
    const winAmount = Math.floor(crashBet * crashMultiplier);
    const resultDiv = document.getElementById('crashResult');
    
    resultDiv.className = cashedOut ? 'result-display win' : 'result-display lose';
    
    setTimeout(() => {
        if (cashedOut) {
            player.balance += winAmount;
            player.totalWins += winAmount;
            player.bestWin = Math.max(player.bestWin, winAmount);
            
            resultDiv.innerHTML = `Забрали на ${crashMultiplier.toFixed(2)}x<br>🏆 +${winAmount} звёзд`;
            showMessage(`💰 Успешно! +${winAmount} звёзд`, 'win');
        } else {
            resultDiv.innerHTML = `КРАШ! ${crashMultiplier.toFixed(2)}x<br>💸 Проигрыш`;
            showMessage(`💥 Краш! -${crashBet} звёзд`, 'lose');
        }
        
        player.gamesPlayed++;
        updateUI();
    }, 500);
}

// Вспомогательные функции
function showMessage(text, type) {
    const modal = document.getElementById('resultModal');
    const content = document.getElementById('resultContent');
    
    let color = '#28a745';
    let icon = '🎉';
    
    if (type === 'error') {
        color = '#dc3545';
        icon = '⚠️';
    } else if (type === 'lose') {
        color = '#dc3545';
        icon = '😢';
    }
    
    content.innerHTML = `
        <div style="font-size:3rem;margin-bottom:10px;">${icon}</div>
        <div style="font-size:1.2rem;color:${color};font-weight:bold;">${text}</div>
    `;
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('resultModal').style.display = 'none';
}

// Закрытие модального окна кликом вне
window.onclick = function(event) {
    const modal = document.getElementById('resultModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};
