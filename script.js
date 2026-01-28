// Данные пользователя
let userData = {
    balance: 1000,
    gamesPlayed: 0,
    totalWins: 0,
    bestWin: 0,
    userId: 'user_' + Math.random().toString(36).substr(2, 9)
};

// История
let gameHistory = [];
let depositHistory = [];
let withdrawHistory = [];

// Админ пароль
const ADMIN_PASSWORD = 'admin123';
const TON_WALLET = 'UQB_SEDoL3M_1ZdIZ7NU6cj0usA5hQQtwlzQGdCKacxsSmM';

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    loadHistory();
    updateUI();
    showSection('games');
});

// Загрузка данных
function loadUserData() {
    const saved = localStorage.getItem('bezdarUser');
    if (saved) {
        userData = JSON.parse(saved);
    }
    updateBalanceDisplay();
}

function loadHistory() {
    const saved = localStorage.getItem('bezdarHistory');
    if (saved) {
        const history = JSON.parse(saved);
        gameHistory = history.games || [];
        depositHistory = history.deposits || [];
        withdrawHistory = history.withdrawals || [];
    }
}

function saveHistory() {
    const history = {
        games: gameHistory,
        deposits: depositHistory,
        withdrawals: withdrawHistory
    };
    localStorage.setItem('bezdarHistory', JSON.stringify(history));
}

// Обновление UI
function updateUI() {
    document.getElementById('balance').textContent = userData.balance;
    document.getElementById('games-played').textContent = userData.gamesPlayed;
    document.getElementById('total-wins').textContent = userData.totalWins;
    document.getElementById('best-win').textContent = userData.bestWin;
    
    // Профиль
    document.getElementById('profileId').textContent = userData.userId.substr(0, 8);
    document.getElementById('profileBalance').textContent = userData.balance;
    document.getElementById('profileGamesPlayed').textContent = userData.gamesPlayed;
    document.getElementById('profileTotalWins').textContent = userData.totalWins;
    document.getElementById('profileBestWin').textContent = userData.bestWin;
    
    // Баланс для вывода
    document.getElementById('availableBalance').textContent = userData.balance;
    document.getElementById('availableTon').textContent = (userData.balance * 0.015).toFixed(2);
    
    updateBalanceDisplay();
}

function updateBalanceDisplay() {
    localStorage.setItem('bezdarUser', JSON.stringify(userData));
}

// Навигация по секциям
function showSection(sectionId) {
    // Скрыть все секции
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Скрыть все игры
    document.querySelectorAll('.game-window').forEach(game => {
        game.style.display = 'none';
    });
    
    // Показать выбранную секцию
    document.getElementById(sectionId + 'Section').classList.add('active');
    
    // Обновить активную кнопку навигации
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Обновить историю если нужно
    if (sectionId === 'history') {
        loadHistoryData();
    }
}

// ИГРЫ

// РУЛЕТКА
function openRoulette() {
    showSection('games');
    const gamesSection = document.getElementById('gamesSection');
    
    gamesSection.innerHTML = `
        <button class="game-back-btn" onclick="showSection('games')">
            <i class="fas fa-arrow-left"></i> Назад к играм
        </button>
        
        <div class="roulette-container">
            <h2><i class="fas fa-roulette-wheel"></i> РУЛЕТКА</h2>
            
            <div class="bet-controls">
                <div class="bet-amount">
                    <p>Ставка в звёздах:</p>
                    <input type="number" id="rouletteBet" value="100" min="10" max="${userData.balance}" style="
                        width: 100px;
                        padding: 10px;
                        background: rgba(255,255,255,0.1);
                        border: 2px solid #ffd700;
                        border-radius: 10px;
                        color: white;
                        text-align: center;
                        font-size: 1.2rem;
                        margin: 10px 0;
                    ">
                </div>
            </div>
            
            <div class="bet-controls">
                <button class="bet-option bet-red" onclick="selectRouletteBet('red')">
                    Красное (x2)
                </button>
                <button class="bet-option bet-black" onclick="selectRouletteBet('black')">
                    Чёрное (x2)
                </button>
                <button class="bet-option bet-green" onclick="selectRouletteBet('green')">
                    Зелёное (x14)
                </button>
            </div>
            
            <div class="roulette-wheel" id="rouletteWheel">
                <div class="roulette-pointer"></div>
            </div>
            
            <div id="rouletteResult" class="roulette-result"></div>
            
            <button class="spin-btn" onclick="spinRoulette()" id="spinBtn">
                <i class="fas fa-play"></i> Крутить рулетку
            </button>
        </div>
    `;
    
    // Сброс выбора
    rouletteSelectedBet = null;
    document.querySelectorAll('.bet-option').forEach(btn => {
        btn.classList.remove('active');
    });
}

let rouletteSelectedBet = null;
let isRouletteSpinning = false;

function selectRouletteBet(betType) {
    rouletteSelectedBet = betType;
    
    document.querySelectorAll('.bet-option').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (betType === 'red') {
        document.querySelector('.bet-red').classList.add('active');
    } else if (betType === 'black') {
        document.querySelector('.bet-black').classList.add('active');
    } else if (betType === 'green') {
        document.querySelector('.bet-green').classList.add('active');
    }
}

function spinRoulette() {
    if (isRouletteSpinning) return;
    
    const bet = parseInt(document.getElementById('rouletteBet').value);
    
    if (!rouletteSelectedBet) {
        showResultMessage('Выберите ставку!', 'error');
        return;
    }
    
    if (bet > userData.balance) {
        showResultMessage('Недостаточно звёзд!', 'error');
        return;
    }
    
    isRouletteSpinning = true;
    const spinBtn = document.getElementById('spinBtn');
    spinBtn.disabled = true;
    spinBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Крутится...';
    
    // Анимация вращения
    const wheel = document.getElementById('rouletteWheel');
    wheel.classList.add('spinning');
    
    // Определяем результат
    setTimeout(() => {
        wheel.classList.remove('spinning');
        
        const resultNumber = Math.floor(Math.random() * 37);
        let resultColor;
        
        if (resultNumber === 0) {
            resultColor = 'green';
        } else if (resultNumber % 2 === 0) {
            resultColor = 'black';
        } else {
            resultColor = 'red';
        }
        
        // Определяем множитель
        let multiplier = 0;
        if (rouletteSelectedBet === resultColor) {
            multiplier = resultColor === 'green' ? 14 : 2;
        }
        
        const win = bet * multiplier;
        const resultDiv = document.getElementById('rouletteResult');
        
        // Показываем результат
        resultDiv.className = `roulette-result result-${resultColor}`;
        resultDiv.innerHTML = `
            <div>Выпало: <strong>${resultNumber}</strong></div>
            <div>Цвет: <strong style="color:${
                resultColor === 'red' ? '#dc3545' : 
                resultColor === 'black' ? 'white' : '#28a745'
            }">${resultColor === 'red' ? 'КРАСНОЕ' : resultColor === 'black' ? 'ЧЁРНОЕ' : 'ЗЕЛЁНОЕ'}</strong></div>
        `;
        
        // Обрабатываем результат
        setTimeout(() => {
            if (multiplier > 0) {
                userData.balance += win;
                userData.totalWins += win;
                userData.bestWin = Math.max(userData.bestWin, win);
                
                resultDiv.innerHTML += `<div style="margin-top:10px;color:#28a745;font-size:1.5rem;">🏆 ВЫИГРЫШ: ${win} звёзд (x${multiplier})</div>`;
                showResultMessage(`🎉 Поздравляем! Вы выиграли ${win} звёзд!`, 'win');
            } else {
                userData.balance -= bet;
                resultDiv.innerHTML += `<div style="margin-top:10px;color:#dc3545;font-size:1.5rem;">💸 ПРОИГРЫШ: ${bet} звёзд</div>`;
                showResultMessage(`😢 Вы проиграли ${bet} звёзд`, 'lose');
            }
            
            userData.gamesPlayed++;
            
            // Сохраняем в историю
            gameHistory.unshift({
                game: 'Рулетка',
                bet: bet,
                result: multiplier > 0 ? 'win' : 'lose',
                amount: multiplier > 0 ? win : -bet,
                multiplier: multiplier,
                details: `Число: ${resultNumber}, Цвет: ${resultColor}`,
                date: new Date().toLocaleString()
            });
            
            saveHistory();
            updateUI();
            
            isRouletteSpinning = false;
            spinBtn.disabled = false;
            spinBtn.innerHTML = '<i class="fas fa-play"></i> Крутить рулетку';
            
        }, 1000);
        
    }, 2000);
}

// СЛОТЫ
function openSlots() {
    showSection('games');
    const gamesSection = document.getElementById('gamesSection');
    
    gamesSection.innerHTML = `
        <button class="game-back-btn" onclick="showSection('games')">
            <i class="fas fa-arrow-left"></i> Назад к играм
        </button>
        
        <div class="slots-container">
            <div class="slots-header">
                <div>
                    <h2><i class="fas fa-sliders-h"></i> BezdarA СЛОТЫ</h2>
                    <p>Ставка в звёздах: 
                        <input type="number" id="slotsBet" value="100" min="10" max="${userData.balance}" style="
                            width: 80px;
                            padding: 5px;
                            background: rgba(255,255,255,0.1);
                            border: 1px solid #ffd700;
                            border-radius: 5px;
                            color: white;
                            text-align: center;
                        ">
                    </p>
                </div>
                <div class="bonus-badge">
                    Бонус: 500 звёзд
                </div>
            </div>
            
            <div class="slots-reels">
                <div class="reel" id="reel1">7</div>
                <div class="reel" id="reel2">7</div>
                <div class="reel" id="reel3">7</div>
                <div class="reel" id="reel4">7</div>
                <div class="reel" id="reel5">7</div>
            </div>
            
            <div id="slotsResult" style="font-size:1.5rem;margin:20px 0;"></div>
            
            <div class="slots-controls">
                <button class="spin-slots-btn" onclick="spinSlots()">
                    <i class="fas fa-play"></i> Крутить
                </button>
                <button class="bonus-btn" onclick="claimBonus()">
                    <i class="fas fa-gift"></i> Бонус
                </button>
            </div>
        </div>
    `;
}

function spinSlots() {
    const bet = parseInt(document.getElementById('slotsBet').value);
    
    if (bet > userData.balance) {
        showResultMessage('Недостаточно звёзд!', 'error');
        return;
    }
    
    // Анимация вращения
    for (let i = 1; i <= 5; i++) {
        const reel = document.getElementById(`reel${i}`);
        reel.classList.add('spinning');
    }
    
    // Результат через 1.5 секунды
    setTimeout(() => {
        const symbols = ['7', '🍒', '🍋', '⭐', '💎', '🔔'];
        const results = [];
        
        for (let i = 1; i <= 5; i++) {
            const reel = document.getElementById(`reel${i}`);
            reel.classList.remove('spinning');
            
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            results.push(symbol);
            reel.textContent = symbol;
        }
        
        // Проверяем выигрышные комбинации
        let multiplier = 0;
        let winMessage = '';
        
        // Проверка на 5 одинаковых
        if (results.every(s => s === results[0])) {
            if (results[0] === '7') {
                multiplier = 100;
                winMessage = 'ДЖЕКПОТ! 5x7';
            } else if (results[0] === '💎') {
                multiplier = 50;
                winMessage = '5 алмазов!';
            } else {
                multiplier = 20;
                winMessage = '5 одинаковых символов!';
            }
        }
        // Проверка на 4 одинаковых
        else if (results.slice(0,4).every(s => s === results[0]) || 
                 results.slice(1,5).every(s => s === results[1])) {
            multiplier = 10;
            winMessage = '4 одинаковых символа!';
        }
        // Проверка на 3 одинаковых
        else if ((results[0] === results[1] && results[1] === results[2]) ||
                 (results[1] === results[2] && results[2] === results[3]) ||
                 (results[2] === results[3] && results[3] === results[4])) {
            multiplier = 5;
            winMessage = '3 одинаковых символа!';
        }
        // Проверка на 2 одинаковых
        else if (results.some((s, i) => results.indexOf(s) !== i)) {
            multiplier = 2;
            winMessage = '2 одинаковых символа!';
        }
        
        const win = bet * multiplier;
        const resultDiv = document.getElementById('slotsResult');
        
        if (multiplier > 0) {
            userData.balance += win;
            userData.totalWins += win;
            userData.bestWin = Math.max(userData.bestWin, win);
            
            resultDiv.innerHTML = `<div style="color:#28a745;font-weight:bold;">${winMessage}<br>Выигрыш! ${win} звёзд (x${multiplier})</div>`;
            showResultMessage(`🎰 ${winMessage} Вы выиграли ${win} звёзд!`, 'win');
        } else {
            userData.balance -= bet;
            resultDiv.innerHTML = `<div style="color:#dc3545;">💸 Вы проиграли ${bet} звёзд</div>`;
            showResultMessage(`😢 Вы проиграли ${bet} звёзд`, 'lose');
        }
        
        userData.gamesPlayed++;
        
        // Сохраняем в историю
        gameHistory.unshift({
            game: 'Слоты',
            bet: bet,
            result: multiplier > 0 ? 'win' : 'lose',
            amount: multiplier > 0 ? win : -bet,
            multiplier: multiplier,
            details: `Результат: ${results.join(' ')} - ${winMessage}`,
            date: new Date().toLocaleString()
        });
        
        saveHistory();
        updateUI();
        
    }, 1500);
}

function claimBonus() {
    if (userData.gamesPlayed >= 10 && userData.gamesPlayed % 10 === 0) {
        userData.balance += 500;
        updateUI();
        showResultMessage('🎁 Бонус 500 звёзд получен!', 'win');
    } else {
        showResultMessage('Бонус доступен каждые 10 игр', 'error');
    }
}

// MINES
function openMines() {
    showSection('games');
    const gamesSection = document.getElementById('gamesSection');
    
    gamesSection.innerHTML = `
        <button class="game-back-btn" onclick="showSection('games')">
            <i class="fas fa-arrow-left"></i> Назад к играм
        </button>
        
        <div class="mines-container">
            <h2><i class="fas fa-gem"></i> MINES</h2>
            
            <div class="mines-controls">
                <div class="bet-amount">
                    <p>Ставка:</p>
                    <input type="number" id="minesBet" value="100" min="10" max="${userData.balance}" style="
                        width: 100px;
                        padding: 10px;
                        background: rgba(255,255,255,0.1);
                        border: 2px solid #ffd700;
                        border-radius: 10px;
                        color: white;
                        text-align: center;
                        font-size: 1.2rem;
                    ">
                </div>
                
                <div class="mines-count">
                    <p>Количество мин:</p>
                    <button class="count-btn" onclick="changeMinesCount(-1)">-</button>
                    <span id="minesCount" style="font-size:1.5rem;margin:0 10px;">6</span>
                    <button class="count-btn" onclick="changeMinesCount(1)">+</button>
                </div>
            </div>
            
            <div class="mines-grid" id="minesGrid"></div>
            
            <div id="minesResult" style="font-size:1.5rem;margin:20px 0;"></div>
            
            <button class="start-mines-btn" onclick="startMinesGame()" id="minesStartBtn">
                <i class="fas fa-play"></i> Начать игру
            </button>
        </div>
    `;
    
    createMinesGrid();
}

let minesCount = 6;
let minesGameActive = false;
let minesGrid = [];
let minesRevealed = 0;
let minesBetAmount = 0;

function changeMinesCount(delta) {
    minesCount = Math.max(3, Math.min(15, minesCount + delta));
    document.getElementById('minesCount').textContent = minesCount;
}

function createMinesGrid() {
    const grid = document.getElementById('minesGrid');
    grid.innerHTML = '';
    
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.textContent = '?';
        cell.dataset.index = i;
        cell.onclick = () => revealMineCell(i);
        grid.appendChild(cell);
    }
}

function startMinesGame() {
    if (minesGameActive) return;
    
    const bet = parseInt(document.getElementById('minesBet').value);
    
    if (bet > userData.balance) {
        showResultMessage('Недостаточно звёзд!', 'error');
        return;
    }
    
    minesBetAmount = bet;
    minesGameActive = true;
    minesRevealed = 0;
    
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
    
    // Обновляем кнопку
    document.getElementById('minesStartBtn').innerHTML = '<i class="fas fa-gem"></i> Игра идёт...';
    document.getElementById('minesStartBtn').onclick = cashoutMines;
    
    // Сбрасываем ячейки
    const cells = document.querySelectorAll('.mine-cell');
    cells.forEach(cell => {
        cell.textContent = '?';
        cell.className = 'mine-cell';
        cell.style.cursor = 'pointer';
    });
    
    document.getElementById('minesResult').innerHTML = '';
    showResultMessage(`Игра началась! Найдите ${25 - minesCount} алмазов`, 'info');
}

function revealMineCell(index) {
    if (!minesGameActive) return;
    
    const cell = document.querySelector(`.mine-cell[data-index="${index}"]`);
    
    if (cell.classList.contains('revealed') || cell.classList.contains('mine')) {
        return;
    }
    
    if (minesGrid[index]) {
        // МИНА!
        cell.className = 'mine-cell mine';
        cell.textContent = '💥';
        cell.style.cursor = 'default';
        
        endMinesGame(false);
    } else {
        // АЛМАЗ
        cell.className = 'mine-cell revealed';
        cell.textContent = '💎';
        cell.style.cursor = 'default';
        
        minesRevealed++;
        
        // Проверяем победу
        if (minesRevealed === (25 - minesCount)) {
            endMinesGame(true);
        }
    }
}

function cashoutMines() {
    if (!minesGameActive || minesRevealed === 0) return;
    
    endMinesGame(true, true);
}

function endMinesGame(win, cashout = false) {
    minesGameActive = false;
    
    // Показываем все мины
    const cells = document.querySelectorAll('.mine-cell');
    cells.forEach((cell, index) => {
        if (minesGrid[index] && !cell.classList.contains('mine')) {
            cell.className = 'mine-cell mine';
            cell.textContent = '💣';
        }
        cell.style.cursor = 'default';
    });
    
    // Вычисляем выигрыш
    let multiplier = 0;
    let winAmount = 0;
    
    if (win) {
        // Формула выигрыша: чем больше мин и больше открыто клеток, тем выше множитель
        const baseMultiplier = 1 + (minesCount / 5);
        multiplier = cashout ? 
            (baseMultiplier * (minesRevealed / (25 - minesCount))).toFixed(2) :
            (baseMultiplier * 2).toFixed(2);
        
        winAmount = Math.floor(minesBetAmount * multiplier);
        userData.balance += winAmount;
        userData.totalWins += winAmount;
        userData.bestWin = Math.max(userData.bestWin, winAmount);
        
        document.getElementById('minesResult').innerHTML = 
            `<div style="color:#28a745;font-weight:bold;">${cashout ? 'Вы забрали деньги!' : 'Вы выиграли!'} ${winAmount} звёзд (x${multiplier})</div>`;
        
        showResultMessage(cashout ? 
            `💰 Вы забрали ${winAmount} звёзд!` : 
            `🎉 Поздравляем! Вы выиграли ${winAmount} звёзд!`, 'win');
    } else {
        userData.balance -= minesBetAmount;
        document.getElementById('minesResult').innerHTML = 
            `<div style="color:#dc3545;">💥 Вы проиграли ${minesBetAmount} звёзд</div>`;
        showResultMessage(`😢 Мина! Вы проиграли ${minesBetAmount} звёзд`, 'lose');
    }
    
    userData.gamesPlayed++;
    
    // Сохраняем в историю
    gameHistory.unshift({
        game: 'Mines',
        bet: minesBetAmount,
        result: win ? 'win' : 'lose',
        amount: win ? winAmount : -minesBetAmount,
        multiplier: win ? parseFloat(multiplier) : 0,
        details: `Мин: ${minesCount}, Открыто: ${minesRevealed}`,
        date: new Date().toLocaleString()
    });
    
    saveHistory();
    updateUI();
    
    // Восстанавливаем кнопку
    document.getElementById('minesStartBtn').innerHTML = '<i class="fas fa-play"></i> Начать игру';
    document.getElementById('minesStartBtn').onclick = startMinesGame;
}

// DICE (упрощенная версия)
function openDice() {
    showSection('games');
    const gamesSection = document.getElementById('gamesSection');
    
    gamesSection.innerHTML = `
        <button class="game-back-btn" onclick="showSection('games')">
            <i class="fas fa-arrow-left"></i> Назад к играм
        </button>
        
        <div style="text-align:center;padding:30px;">
            <h2><i class="fas fa-dice"></i> DICE</h2>
            <p>Скоро здесь появится игра Dice!</p>
            <p style="color:#aaa;">Угадай число и выиграй до x99</p>
        </div>
    `;
}

// CRASH (упрощенная версия)
function openCrash() {
    showSection('games');
    const gamesSection = document.getElementById('gamesSection');
    
    gamesSection.innerHTML = `
        <button class="game-back-btn" onclick="showSection('games')">
            <i class="fas fa-arrow-left"></i> Назад к играм
        </button>
        
        <div style="text-align:center;padding:30px;">
            <h2><i class="fas fa-chart-line"></i> CRASH</h2>
            <p>Скоро здесь появится игра Crash!</p>
            <p style="color:#aaa;">Успей забрать деньги до краша</p>
        </div>
    `;
}

// ПОПОЛНЕНИЕ И ВЫВОД

function copyWallet() {
    navigator.clipboard.writeText(TON_WALLET);
    showResultMessage('Кошелёк скопирован!', 'info');
}

function selectPackage(stars) {
    document.getElementById('depositStars').value = stars;
    showResultMessage(`Выбрано ${stars} звёзд (~${(stars * 0.015).toFixed(2)} TON)`, 'info');
}

function submitDeposit() {
    const stars = parseInt(document.getElementById('depositStars').value);
    const txHash = document.getElementById('txHash').value.trim();
    
    if (!stars || stars < 10) {
        showResultMessage('Минимум 10 звёзд!', 'error');
        return;
    }
    
    if (!txHash) {
        showResultMessage('Введите хэш транзакции!', 'error');
        return;
    }
    
    // Добавляем в историю
    depositHistory.unshift({
        id: Date.now(),
        stars: stars,
        tonAmount: stars * 0.015,
        txHash: txHash,
        status: 'pending',
        date: new Date().toLocaleString()
    });
    
    saveHistory();
    showResultMessage('✅ Запрос отправлен админу! Ожидайте подтверждения.', 'info');
    
    // Очищаем поле хэша
    document.getElementById('txHash').value = '';
}

function setMaxWithdraw() {
    document.getElementById('withdrawStars').value = userData.balance;
    updateWithdrawSummary();
}

function updateWithdrawSummary() {
    const stars = parseInt(document.getElementById('withdrawStars').value) || 0;
    const tonAmount = (stars * 0.015).toFixed(2);
    
    document.getElementById('withdrawTonAmount').textContent = tonAmount;
    document.getElementById('totalWithdraw').textContent = tonAmount;
}

// Обновляем сумму при изменении
document.addEventListener('input', function(e) {
    if (e.target.id === 'withdrawStars') {
        updateWithdrawSummary();
    }
});

function submitWithdraw() {
    const stars = parseInt(document.getElementById('withdrawStars').value);
    const tgUsername = document.getElementById('tgUsername').value.trim();
    
    if (!stars || stars < 50 || stars > userData.balance) {
        showResultMessage('Минимум 50 звёзд, максимум - ваш баланс!', 'error');
        return;
    }
    
    if (!tgUsername) {
        showResultMessage('Введите ваш Telegram @username!', 'error');
        return;
    }
    
    // Проверяем формат username
    const usernamePattern = /^[a-zA-Z0-9_]{5,32}$/;
    if (!usernamePattern.test(tgUsername)) {
        showResultMessage('Введите корректный Telegram username (только буквы, цифры и _)', 'error');
        return;
    }
    
    // Списываем со счета
    userData.balance -= stars;
    updateUI();
    
    // Добавляем в историю
    withdrawHistory.unshift({
        id: Date.now(),
        stars: stars,
        tonAmount: stars * 0.015,
        tgUsername: tgUsername,
        status: 'pending',
        date: new Date().toLocaleString()
    });
    
    saveHistory();
    showResultMessage(`✅ Запрос на вывод отправлен! Мы напишем вам в Telegram @${tgUsername}`, 'info');
    
    // Очищаем форму
    document.getElementById('withdrawStars').value = '';
    document.getElementById('tgUsername').value = '';
    updateWithdrawSummary();
}

// ИСТОРИЯ
function loadHistoryData() {
    // История игр
    const gamesHistoryDiv = document.getElementById('gamesHistory');
    gamesHistoryDiv.innerHTML = '';
    
    if (gameHistory.length === 0) {
        gamesHistoryDiv.innerHTML = '<p style="color:#aaa;text-align:center;padding:50px;">История игр пуста</p>';
    } else {
        gameHistory.slice(0, 10).forEach(record => {
            const item = document.createElement('div');
            item.className = `history-item history-${record.result}`;
            item.innerHTML = `
                <div style="display:flex;justify-content:space-between;">
                    <strong>${record.game}</strong>
                    <span style="color:${record.result === 'win' ? '#28a745' : '#dc3545'}">
                        ${record.result === 'win' ? '+' : ''}${record.amount} звёзд
                    </span>
                </div>
                <div style="color:#aaa;font-size:0.9rem;margin-top:5px;">
                    ${record.details} | ${record.date}
                </div>
            `;
            gamesHistoryDiv.appendChild(item);
        });
    }
    
    // История пополнений
    const depositsHistoryDiv = document.getElementById('depositsHistory');
    depositsHistoryDiv.innerHTML = '';
    
    if (depositHistory.length === 0) {
        depositsHistoryDiv.innerHTML = '<p style="color:#aaa;text-align:center;padding:50px;">История пополнений пуста</p>';
    } else {
        depositHistory.slice(0, 10).forEach(record => {
            const item = document.createElement('div');
            item.className = `history-item history-${record.status}`;
            item.innerHTML = `
                <div style="display:flex;justify-content:space-between;">
                    <strong>Пополнение</strong>
                    <span style="color:#ffd700;">${record.stars} звёзд</span>
                </div>
                <div style="color:#aaa;font-size:0.9rem;margin-top:5px;">
                    ${record.tonAmount} TON | ${record.date}
                </div>
                <div style="color:#aaa;font-size:0.8rem;margin-top:5px;">
                    Статус: ${record.status === 'pending' ? '⏳ Ожидание' : 
                              record.status === 'approved' ? '✅ Подтверждено' : '❌ Отклонено'}
                </div>
            `;
            depositsHistoryDiv.appendChild(item);
        });
    }
    
    // История выводов
    const withdrawalsHistoryDiv = document.getElementById('withdrawalsHistory');
    withdrawalsHistoryDiv.innerHTML = '';
    
    if (withdrawHistory.length === 0) {
        withdrawalsHistoryDiv.innerHTML = '<p style="color:#aaa;text-align:center;padding:50px;">История выводов пуста</p>';
    } else {
        withdrawHistory.slice(0, 10).forEach(record => {
            const item = document.createElement('div');
            item.className = `history-item history-${record.status}`;
            item.innerHTML = `
                <div style="display:flex;justify-content:space-between;">
                    <strong>Вывод</strong>
                    <span style="color:#ffd700;">${record.stars} звёзд</span>
                </div>
                <div style="color:#aaa;font-size:0.9rem;margin-top:5px;">
                    ${record.tonAmount} TON → @${record.tgUsername}
                </div>
                <div style="color:#aaa;font-size:0.8rem;margin-top:5px;">
                    ${record.date} | Статус: ${record.status === 'pending' ? '⏳ Ожидание' : 
                                              record.status === 'approved' ? '✅ Выплачено' : '❌ Отклонено'}
                </div>
            `;
            withdrawalsHistoryDiv.appendChild(item);
        });
    }
}

function showHistoryTab(tabName) {
    // Скрыть все табы
    document.querySelectorAll('.history-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Убрать активный класс
    document.querySelectorAll('.history-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показать выбранный таб
    document.getElementById(tabName + 'History').style.display = 'block';
    
    // Активный класс кнопке
    event.target.classList.add('active');
}

// ПРОФИЛЬ
function openProfile() {
    document.getElementById('profileModal').style.display = 'block';
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

// РЕЗУЛЬТАТЫ ИГР
function showResultMessage(message, type) {
    const modal = document.getElementById('resultModal');
    const content = document.getElementById('resultContent');
    
    let icon = '🎉';
    let title = 'Успех!';
    
    switch(type) {
        case 'win':
            icon = '🏆';
            title = 'ПОБЕДА!';
            break;
        case 'lose':
            icon = '😢';
            title = 'ПРОИГРЫШ';
            break;
        case 'error':
            icon = '⚠️';
            title = 'Ошибка';
            break;
        case 'info':
            icon = 'ℹ️';
            title = 'Информация';
            break;
    }
    
    content.innerHTML = `
        <div style="font-size:4rem;margin-bottom:20px;">${icon}</div>
        <h2>${title}</h2>
        <p style="font-size:1.2rem;margin:20px 0;">${message}</p>
    `;
    
    modal.style.display = 'block';
    
    // Автоматически закрыть через 3 секунды для побед/проигрышей
    if (type === 'win' || type === 'lose') {
        setTimeout(() => {
            modal.style.display = 'none';
        }, 3000);
    }
}

function closeResultModal() {
    document.getElementById('resultModal').style.display = 'none';
}

// АДМИН ПАНЕЛЬ (остается без изменений из предыдущей версии)
function openAdminPanel() {
    document.getElementById('adminModal').style.display = 'block';
    document.getElementById('adminContent').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

function closeAdminPanel() {
    document.getElementById('adminModal').style.display = 'none';
}

function loginAdmin() {
    const password = document.getElementById('adminPassword').value;
    
    if (password === ADMIN_PASSWORD) {
        document.getElementById('adminContent').style.display = 'block';
        loadAdminData();
    } else {
        showResultMessage('❌ Неверный пароль!', 'error');
    }
}

function switchTab(tabName) {
    // Скрыть все табы
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Убрать активный класс со всех кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показать выбранный таб
    document.getElementById(tabName + 'Tab').style.display = 'block';
    
    // Активный класс кнопке
    event.target.classList.add('active');
}

function loadAdminData() {
    // Пополнения
    const depositsDiv = document.getElementById('pendingDeposits');
    depositsDiv.innerHTML = '';
    
    const pendingDeposits = depositHistory.filter(d => d.status === 'pending');
    
    if (pendingDeposits.length === 0) {
        depositsDiv.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px;">Нет ожидающих пополнений</p>';
    } else {
        pendingDeposits.forEach(deposit => {
            depositsDiv.innerHTML += `
                <div class="transaction-item">
                    <p><strong>Хэш:</strong> ${deposit.txHash}</p>
                    <p><strong>Звёзд:</strong> ${deposit.stars}</p>
                    <p><strong>TON:</strong> ${deposit.tonAmount}</p>
                    <p><strong>Дата:</strong> ${deposit.date}</p>
                    <div class="transaction-actions">
                        <button class="approve-btn" onclick="approveDeposit(${deposit.id})">
                            <i class="fas fa-check"></i> Одобрить
                        </button>
                        <button class="reject-btn" onclick="rejectDeposit(${deposit.id})">
                            <i class="fas fa-times"></i> Отклонить
                        </button>
                    </div>
                </div>
            `;
        });
    }
    
    // Выводы
    const withdrawalsDiv = document.getElementById('pendingWithdrawals');
    withdrawalsDiv.innerHTML = '';
    
    const pendingWithdrawals = withdrawHistory.filter(w => w.status === 'pending');
    
    if (pendingWithdrawals.length === 0) {
        withdrawalsDiv.innerHTML = '<p style="color:#aaa;text-align:center;padding:20px;">Нет ожидающих выводов</p>';
    } else {
        pendingWithdrawals.forEach(withdrawal => {
            withdrawalsDiv.innerHTML += `
                <div class="transaction-item">
                    <p><strong>Username:</strong> @${withdrawal.tgUsername}</p>
                    <p><strong>Звёзд:</strong> ${withdrawal.stars}</p>
                    <p><strong>TON:</strong> ${withdrawal.tonAmount}</p>
                    <p><strong>Дата:</strong> ${withdrawal.date}</p>
                    <div class="transaction-actions">
                        <button class="approve-btn" onclick="approveWithdrawal(${withdrawal.id})">
                            <i class="fas fa-check"></i> Выплатить
                        </button>
                        <button class="reject-btn" onclick="rejectWithdrawal(${withdrawal.id})">
                            <i class="fas fa-times"></i> Отклонить
                        </button>
                    </div>
                </div>
            `;
        });
    }
}

function approveDeposit(depositId) {
    const deposit = depositHistory.find(d => d.id === depositId);
    if (deposit) {
        deposit.status = 'approved';
        userData.balance += deposit.stars;
        updateUI();
        saveHistory();
        loadAdminData();
        showResultMessage(`✅ Пополнение одобрено!`, 'info');
    }
}

function rejectDeposit(depositId) {
    const deposit = depositHistory.find(d => d.id === depositId);
    if (deposit) {
        deposit.status = 'rejected';
        saveHistory();
        loadAdminData();
        showResultMessage('❌ Пополнение отклонено.', 'info');
    }
}

function approveWithdrawal(withdrawalId) {
    const withdrawal = withdrawHistory.find(w => w.id === withdrawalId);
    if (withdrawal) {
        withdrawal.status = 'approved';
        saveHistory();
        loadAdminData();
        showResultMessage(`✅ Вывод одобрен! Отправьте ${withdrawal.tonAmount} TON пользователю @${withdrawal.tgUsername}`, 'info');
    }
}

function rejectWithdrawal(withdrawalId) {
    const withdrawal = withdrawHistory.find(w => w.id === withdrawalId);
    if (withdrawal) {
        withdrawal.status = 'rejected';
        userData.balance += withdrawal.stars;
        updateUI();
        saveHistory();
        loadAdminData();
        showResultMessage('❌ Вывод отклонен. Звёзды возвращены на баланс.', 'info');
    }
}

// Закрытие модальных окон
window.onclick = function(event) {
    const modals = document.getElementsByClassName('modal');
    for (let modal of modals) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
};
