// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let userBalance = 0;
let userId = null;
let sessionToken = null;
let isDemoMode = false;
let gameHistory = {
    crash: { games: 0, wins: 0, losses: 0, profit: 0 },
    mines: { games: 0, wins: 0, losses: 0, profit: 0 },
    roulette: { games: 0, wins: 0, losses: 0, profit: 0 },
    slots: { games: 0, wins: 0, losses: 0, profit: 0 },
    dice: { games: 0, wins: 0, losses: 0, profit: 0 }
};

let activatedPromoCodes = [];

// CRASH переменные
let crashInterval;
let crashMultiplier = 1.0;
let crashBetAmount = 0;
let crashActive = false;
let crashExplodePoint = 0;
let crashCashedOut = false;

// MINES переменные
let minesBetAmount = 0;
let minesStep = 0;
let minesGrid = [];
let minesGameActive = false;
let minesCashoutAmount = 0;

// РУЛЕТКА переменные
let rouletteBetAmount = 0;
let rouletteBetColor = '';
let rouletteSpinning = false;

// СЛОТЫ переменные
let slotsBetAmount = 0;
let slotsAutoSpinCount = 0;
let slotsSpinning = false;

// DICE переменные
let diceBetAmount = 0;
let diceRolling = false;

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    // Показываем окно входа
    showLoginModal();
    
    // Скрываем загрузчик
    setTimeout(() => {
        document.getElementById('loader').style.display = 'none';
    }, 500);
    
    // Создаем звезды
    createStars();
    
    // Настройка слайдера DICE
    const diceSlider = document.getElementById('dice-guess');
    const guessValue = document.getElementById('guess-value');
    
    if (diceSlider) {
        diceSlider.addEventListener('input', function() {
            guessValue.textContent = this.value;
        });
    }
    
    // Проверяем, есть ли сохраненная сессия
    checkSavedSession();
});

// ==================== СИСТЕМА АВТОРИЗАЦИИ ====================
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
}

function hideLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

function checkSavedSession() {
    const savedUserId = localStorage.getItem('tg_user_id');
    const savedUsername = localStorage.getItem('tg_username');
    const savedBalance = localStorage.getItem('tg_balance');
    const savedDemoMode = localStorage.getItem('demo_mode');
    
    if (savedUserId && savedUsername) {
        // Автоматический вход по сохраненным данным
        userId = savedUserId;
        isDemoMode = savedDemoMode === 'true';
        
        if (isDemoMode) {
            userBalance = 10000;
            showNotification('🎮 Демо-режим активирован', 'success');
        } else if (savedBalance) {
            userBalance = parseInt(savedBalance);
        }
        
        updateBalanceDisplay();
        hideLoginModal();
    } else {
        // Показываем окно входа
        showLoginModal();
    }
}

function goToTelegramBot() {
    // URL для Telegram бота с параметрами для возврата
    const botUrl = 'https://t.me/BezdarMoneyBot?start=website_login';
    window.open(botUrl, '_blank');
    showNotification('📱 Открывается Telegram бот...', 'info');
}

function enterDemoMode() {
    userId = Date.now().toString(); // Генерируем ID
    isDemoMode = true;
    userBalance = 10000; // Начальный баланс в демо-режиме
    
    // Сохраняем в localStorage
    localStorage.setItem('tg_user_id', userId);
    localStorage.setItem('tg_username', 'demo_user');
    localStorage.setItem('demo_mode', 'true');
    localStorage.setItem('tg_balance', userBalance);
    
    hideLoginModal();
    updateBalanceDisplay();
    showNotification('🎮 Демо-режим активирован! Баланс: 10,000⭐', 'success');
    setTimeout(() => {
        showNotification('💡 В демо-режиме вывод недоступен', 'info');
    }, 2000);
}

function manualLogin() {
    const userIdInput = document.getElementById('testUserId').value.trim();
    const usernameInput = document.getElementById('testUsername').value.trim();
    
    if (!userIdInput || !usernameInput) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    userId = userIdInput;
    userBalance = 1000; // Стартовый баланс
    
    // Сохраняем в localStorage
    localStorage.setItem('tg_user_id', userId);
    localStorage.setItem('tg_username', usernameInput);
    localStorage.setItem('demo_mode', 'false');
    localStorage.setItem('tg_balance', userBalance);
    
    hideLoginModal();
    updateBalanceDisplay();
    showNotification(`👋 Добро пожаловать, ${usernameInput}!`, 'success');
}

function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        // Очищаем данные
        localStorage.removeItem('tg_user_id');
        localStorage.removeItem('tg_username');
        localStorage.removeItem('tg_balance');
        localStorage.removeItem('demo_mode');
        
        // Сбрасываем переменные
        userId = null;
        userBalance = 0;
        isDemoMode = false;
        
        // Показываем окно входа
        showLoginModal();
        showNotification('👋 Вы вышли из системы', 'info');
    }
}

// ==================== ФУНКЦИИ ОБЩИЕ ====================
function createStars() {
    const stars = document.getElementById('stars');
    if (!stars) return;
    
    stars.innerHTML = '';
    for (let i = 0; i < 200; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.width = Math.random() * 4 + 'px';
        star.style.height = star.style.width;
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.opacity = Math.random() * 0.7 + 0.3;
        star.style.animationDelay = Math.random() * 5 + 's';
        star.style.animationDuration = Math.random() * 3 + 2 + 's';
        stars.appendChild(star);
    }
}

function updateBalanceDisplay() {
    const balanceEl = document.getElementById('balance');
    const modalBalanceEl = document.getElementById('modal-balance');
    const withdrawBalanceEl = document.getElementById('withdraw-balance');
    
    if (balanceEl) balanceEl.textContent = userBalance.toLocaleString();
    if (modalBalanceEl) modalBalanceEl.textContent = userBalance.toLocaleString();
    if (withdrawBalanceEl) withdrawBalanceEl.textContent = userBalance.toLocaleString();
}

function updateBalance(amount, gameType = 'other', win = true) {
    const oldBalance = userBalance;
    userBalance += amount;
    updateBalanceDisplay();
    
    // Сохраняем в localStorage (кроме демо-режима)
    if (!isDemoMode) {
        localStorage.setItem('tg_balance', userBalance);
    }
    
    // Сохраняем историю игр
    saveGameHistory();
    
    return userBalance;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = '💰 BezdarMoney: ' + message;
    
    if (type === 'error') {
        notification.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
    } else if (type === 'success') {
        notification.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
    } else if (type === 'warning') {
        notification.style.background = 'linear-gradient(45deg, #f39c12, #e67e22)';
    } else if (type === 'info') {
        notification.style.background = 'linear-gradient(45deg, #3498db, #1e90ff)';
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showWinAnimation(text) {
    const anim = document.createElement('div');
    anim.className = 'win-animation';
    anim.textContent = text;
    document.body.appendChild(anim);
    
    setTimeout(() => anim.remove(), 1500);
}

function showLoseAnimation(text) {
    const anim = document.createElement('div');
    anim.className = 'lose-animation';
    anim.textContent = text;
    document.body.appendChild(anim);
    
    setTimeout(() => anim.remove(), 1500);
}

function showModal(modalId) {
    if (!userId) {
        showLoginModal();
        return;
    }
    
    document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ==================== УПРАВЛЕНИЕ ИГРАМИ ====================
function startGame(game) {
    if (!userId) {
        showLoginModal();
        return;
    }
    
    // Скрываем все игровые окна
    document.querySelectorAll('.game-window').forEach(el => {
        el.style.display = 'none';
    });
    
    // Скрываем сетку игр
    document.querySelector('.games-grid').style.display = 'none';
    
    // Обновляем активную карточку
    document.querySelectorAll('.game-card').forEach(card => {
        card.classList.remove('active');
    });
    
    const gameCard = document.querySelector(`.game-card[onclick*="${game}"]`);
    if (gameCard) {
        gameCard.classList.add('active');
    }
    
    // Показываем выбранную игру
    const gameWindow = document.getElementById(`${game}-game`);
    if (gameWindow) {
        gameWindow.style.display = 'block';
    }
    
    // Инициализируем игру, если нужно
    if (game === 'mines') {
        resetMinesGrid();
    } else if (game === 'slots') {
        resetSlots();
    }
}

function exitGame() {
    // Останавливаем все активные игры
    if (crashActive) {
        clearInterval(crashInterval);
        crashActive = false;
        document.getElementById('cashout-btn').disabled = true;
        document.getElementById('crash-start-btn').disabled = false;
    }
    
    if (minesGameActive) {
        minesGameActive = false;
        document.getElementById('mines-cashout-btn').disabled = true;
        document.getElementById('mines-start-btn').disabled = false;
    }
    
    // Скрываем все игровые окна
    document.querySelectorAll('.game-window').forEach(el => {
        el.style.display = 'none';
    });
    
    // Показываем сетку игр
    document.querySelector('.games-grid').style.display = 'grid';
}

// ==================== CRASH ИГРА ====================
function setBet(amount) {
    document.getElementById('crash-bet').value = amount;
}

function placeCrashBet() {
    if (!userId) {
        showLoginModal();
        return;
    }
    
    const betInput = document.getElementById('crash-bet');
    const bet = parseInt(betInput.value);
    
    if (isNaN(bet) || bet < 10) {
        showNotification('Минимальная ставка: 10⭐', 'error');
        return;
    }
    
    if (bet > userBalance) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    if (crashActive) {
        showNotification('Игра уже запущена', 'warning');
        return;
    }
    
    updateBalance(-bet, 'crash', false);
    crashBetAmount = bet;
    crashActive = true;
    crashCashedOut = false;
    
    const plane = document.getElementById('crash-plane');
    plane.style.bottom = '20px';
    plane.style.background = 'linear-gradient(45deg, #3498db, #1e90ff)';
    
    // Генерация точки взрыва (от 1.2x до 5x)
    crashExplodePoint = 1.2 + Math.random() * 3.8;
    
    crashMultiplier = 1.0;
    
    document.getElementById('cashout-btn').disabled = false;
    document.getElementById('crash-start-btn').disabled = true;
    
    crashInterval = setInterval(updateCrash, 100);
    
    showNotification('Самолёт взлетает! Забирайте деньги от 1.4x!', 'warning');
}

function updateCrash() {
    if (!crashActive) return;
    
    crashMultiplier += 0.02;
    
    document.getElementById('crash-multiplier').textContent = crashMultiplier.toFixed(2) + 'x';
    
    const plane = document.getElementById('crash-plane');
    const newBottom = 20 + (crashMultiplier - 1) * 25;
    plane.style.bottom = newBottom + 'px';
    
    if (crashMultiplier >= crashExplodePoint) {
        crashExplode();
    }
}

function cashOut() {
    if (!crashActive || crashCashedOut) return;
    
    if (crashMultiplier < 1.4) {
        showNotification('Можно забрать только от 1.4x!', 'error');
        return;
    }
    
    crashActive = false;
    crashCashedOut = true;
    clearInterval(crashInterval);
    
    const winAmount = Math.floor(crashBetAmount * crashMultiplier);
    updateBalance(winAmount, 'crash', true);
    
    showWinAnimation('+ ' + winAmount + ' ⭐');
    showNotification('Поздравляем! Вы успели забрать деньги!', 'success');
    
    gameHistory.crash.games++;
    gameHistory.crash.wins++;
    gameHistory.crash.profit += (winAmount - crashBetAmount);
    updateStatsDisplay();
    saveGameHistory();
    
    document.getElementById('cashout-btn').disabled = true;
    document.getElementById('crash-start-btn').disabled = false;
    
    setTimeout(() => {
        const plane = document.getElementById('crash-plane');
        plane.style.background = 'linear-gradient(45deg, #3498db, #1e90ff)';
        plane.style.bottom = '20px';
        document.getElementById('crash-multiplier').textContent = '1.00x';
        crashCashedOut = false;
    }, 3000);
}

function crashExplode() {
    if (!crashActive) return;
    
    crashActive = false;
    clearInterval(crashInterval);
    
    const plane = document.getElementById('crash-plane');
    plane.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
    
    if (!crashCashedOut) {
        showLoseAnimation('💥 ВЗРЫВ!');
        showNotification('Самолёт взорвался! Вы проиграли ' + crashBetAmount + '⭐', 'error');
        
        gameHistory.crash.games++;
        gameHistory.crash.losses++;
        gameHistory.crash.profit -= crashBetAmount;
        updateStatsDisplay();
        saveGameHistory();
    }
    
    document.getElementById('cashout-btn').disabled = true;
    document.getElementById('crash-start-btn').disabled = false;
    
    setTimeout(() => {
        plane.style.background = 'linear-gradient(45deg, #3498db, #1e90ff)';
        plane.style.bottom = '20px';
        document.getElementById('crash-multiplier').textContent = '1.00x';
        crashCashedOut = false;
    }, 2000);
}

// ==================== MINES ИГРА ====================
function setMinesBet(amount) {
    document.getElementById('mines-bet').value = amount;
}

function resetMinesGrid() {
    const grid = document.getElementById('mines-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.dataset.index = i;
        cell.textContent = '?';
        cell.onclick = () => revealMine(i);
        grid.appendChild(cell);
    }
    
    minesGrid = Array(25).fill().map(() => ({
        isMine: false,
        revealed: false
    }));
    
    minesStep = 0;
    const movesCount = document.getElementById('moves-count');
    if (movesCount) movesCount.textContent = '0';
}

function startMinesGame() {
    if (!userId) {
        showLoginModal();
        return;
    }
    
    const betInput = document.getElementById('mines-bet');
    const bet = parseInt(betInput.value);
    
    if (isNaN(bet) || bet < 10) {
        showNotification('Минимальная ставка: 10⭐', 'error');
        return;
    }
    
    if (bet > userBalance) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    if (minesGameActive) {
        showNotification('Игра уже запущена', 'warning');
        return;
    }
    
    updateBalance(-bet, 'mines', false);
    minesBetAmount = bet;
    minesGameActive = true;
    minesCashoutAmount = bet;
    
    resetMinesGrid();
    
    let minesPlaced = 0;
    while (minesPlaced < 5) {
        const index = Math.floor(Math.random() * 25);
        if (!minesGrid[index].isMine) {
            minesGrid[index].isMine = true;
            minesPlaced++;
        }
    }
    
    document.getElementById('mines-cashout-btn').disabled = false;
    document.getElementById('mines-start-btn').disabled = true;
    
    showNotification('Игра началась! Находите драгоценности 💎', 'success');
}

function revealMine(index) {
    if (!minesGameActive || minesGrid[index].revealed) return;
    
    minesStep++;
    const movesCount = document.getElementById('moves-count');
    if (movesCount) movesCount.textContent = minesStep;
    
    const cell = document.querySelector(`.mine-cell[data-index="${index}"]`);
    minesGrid[index].revealed = true;
    
    if (minesGrid[index].isMine) {
        cell.className = 'mine-cell mine';
        cell.textContent = '💣';
        
        showLoseAnimation('МИНА!');
        showNotification('Вы наткнулись на мину! Игра окончена', 'error');
        
        gameHistory.mines.games++;
        gameHistory.mines.losses++;
        gameHistory.mines.profit -= minesBetAmount;
        updateStatsDisplay();
        saveGameHistory();
        
        minesGameActive = false;
        document.getElementById('mines-cashout-btn').disabled = true;
        document.getElementById('mines-start-btn').disabled = false;
    } else {
        cell.className = 'mine-cell revealed';
        cell.textContent = '💎';
        
        minesCashoutAmount = Math.floor(minesCashoutAmount * 1.5);
        
        const safeCellsLeft = minesGrid.filter(cell => !cell.revealed && !cell.isMine).length;
        if (safeCellsLeft === 0) {
            const winAmount = minesCashoutAmount;
            updateBalance(winAmount, 'mines', true);
            
            showWinAnimation('ВЫИГРЫШ: ' + winAmount + ' ⭐');
            showNotification('Вы нашли все драгоценности! Поздравляем!', 'success');
            
            gameHistory.mines.games++;
            gameHistory.mines.wins++;
            gameHistory.mines.profit += (winAmount - minesBetAmount);
            updateStatsDisplay();
            saveGameHistory();
            
            minesGameActive = false;
            document.getElementById('mines-cashout-btn').disabled = true;
            document.getElementById('mines-start-btn').disabled = false;
        } else {
            showNotification('Найдена драгоценность! Текущий выигрыш: ' + minesCashoutAmount + '⭐', 'info');
        }
    }
}

function cashOutMines() {
    if (!minesGameActive) return;
    
    const winAmount = minesCashoutAmount;
    updateBalance(winAmount, 'mines', true);
    
    showWinAnimation('+ ' + winAmount + ' ⭐');
    showNotification('Вы забрали деньги!', 'success');
    
    gameHistory.mines.games++;
    gameHistory.mines.wins++;
    gameHistory.mines.profit += (winAmount - minesBetAmount);
    updateStatsDisplay();
    saveGameHistory();
    
    minesGameActive = false;
    document.getElementById('mines-cashout-btn').disabled = true;
    document.getElementById('mines-start-btn').disabled = false;
}

// ==================== РУЛЕТКА ====================
function setRouletteBet(amount) {
    document.getElementById('roulette-bet').value = amount;
}

function placeRouletteBet(color) {
    if (!userId) {
        showLoginModal();
        return;
    }
    
    if (rouletteSpinning) {
        showNotification('Дождитесь окончания вращения!', 'error');
        return;
    }
    
    const betInput = document.getElementById('roulette-bet');
    const bet = parseInt(betInput.value);
    
    if (isNaN(bet) || bet < 10) {
        showNotification('Минимальная ставка: 10⭐', 'error');
        return;
    }
    
    if (bet > userBalance) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    rouletteBetAmount = bet;
    rouletteBetColor = color;
    
    showNotification('Ставка принята: ' + color, 'info');
}

function spinRoulette() {
    if (!userId) {
        showLoginModal();
        return;
    }
    
    if (rouletteSpinning) {
        showNotification('Рулетка уже крутится!', 'error');
        return;
    }
    
    if (rouletteBetAmount === 0) {
        showNotification('Сначала сделайте ставку', 'error');
        return;
    }
    
    updateBalance(-rouletteBetAmount, 'roulette', false);
    rouletteSpinning = true;
    document.getElementById('roulette-spin-btn').disabled = true;
    
    const wheel = document.querySelector('.roulette-wheel');
    const ball = document.querySelector('.roulette-ball');
    
    wheel.style.animation = 'spin 0.5s linear infinite';
    ball.style.animation = 'ballOrbit 0.5s linear infinite';
    
    setTimeout(() => {
        const random = Math.random() * 100;
        let resultColor, multiplier;
        
        if (random < 1) {
            resultColor = 'green';
            multiplier = 36;
        } else if (random < 46) {
            resultColor = 'red';
            multiplier = 2;
        } else {
            resultColor = 'black';
            multiplier = 2;
        }
        
        wheel.style.animation = 'none';
        ball.style.animation = 'none';
        
        setTimeout(() => {
            if (resultColor === rouletteBetColor) {
                const winAmount = Math.floor(rouletteBetAmount * multiplier);
                updateBalance(winAmount, 'roulette', true);
                
                showWinAnimation('ВЫИГРЫШ: x' + multiplier);
                showNotification('Поздравляем! Вы угадали цвет! +' + winAmount + '⭐', 'success');
                
                gameHistory.roulette.games++;
                gameHistory.roulette.wins++;
                gameHistory.roulette.profit += (winAmount - rouletteBetAmount);
            } else {
                showLoseAnimation('ПРОИГРЫШ');
                showNotification('К сожалению, вы не угадали цвет', 'error');
                
                gameHistory.roulette.games++;
                gameHistory.roulette.losses++;
                gameHistory.roulette.profit -= rouletteBetAmount;
            }
            
            updateStatsDisplay();
            saveGameHistory();
            
            rouletteBetAmount = 0;
            rouletteBetColor = '';
            rouletteSpinning = false;
            document.getElementById('roulette-spin-btn').disabled = false;
            
        }, 500);
        
    }, 2000);
}

// ==================== СЛОТЫ ====================
function setSlotsBet(amount) {
    document.getElementById('slots-bet').value = amount;
}

function resetSlots() {
    const reels = document.querySelectorAll('.slot-reel');
    reels.forEach(reel => {
        const items = reel.querySelector('.slot-items');
        if (items) items.style.animation = 'none';
    });
    const result = document.getElementById('slots-result');
    if (result) result.textContent = '';
}

function spinSlots() {
    if (!userId) {
        showLoginModal();
        return;
    }
    
    if (slotsSpinning) {
        showNotification('Слоты уже крутятся!', 'error');
        return;
    }
    
    const betInput = document.getElementById('slots-bet');
    const bet = parseInt(betInput.value);
    
    if (isNaN(bet) || bet < 10) {
        showNotification('Минимальная ставка: 10⭐', 'error');
        return;
    }
    
    if (bet > userBalance) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    updateBalance(-bet, 'slots', false);
    slotsBetAmount = bet;
    slotsSpinning = true;
    document.getElementById('slots-spin-btn').disabled = true;
    document.getElementById('slots-auto-btn').disabled = true;
    
    const reels = document.querySelectorAll('.slot-reel');
    reels.forEach(reel => {
        const items = reel.querySelector('.slot-items');
        if (items) items.style.animation = 'slotSpin 0.1s linear';
    });
    
    setTimeout(() => {
        const results = [];
        reels.forEach((reel, index) => {
            const items = reel.querySelector('.slot-items');
            if (items) items.style.animation = 'none';
            
            const rand = Math.random();
            let symbol;
            if (rand < 0.4) symbol = '🍒';
            else if (rand < 0.7) symbol = '🍋';
            else if (rand < 0.85) symbol = '🍉';
            else if (rand < 0.95) symbol = '⭐';
            else symbol = '7️⃣';
            
            const item = items ? items.querySelector('.slot-item:nth-child(3)') : null;
            if (item) item.textContent = symbol;
            results.push(symbol);
        });
        
        checkSlotsWin(results, bet);
        
        slotsSpinning = false;
        document.getElementById('slots-spin-btn').disabled = false;
        document.getElementById('slots-auto-btn').disabled = false;
        
    }, 2000);
}

function checkSlotsWin(results, bet) {
    let winMultiplier = 0;
    let winMessage = '';
    
    if (results.every(symbol => symbol === '7️⃣')) {
        winMultiplier = 12;
        winMessage = '🎰 ДЖЕКПОТ! x12 🎰';
    } else if (results.filter(symbol => symbol === '7️⃣').length >= 4) {
        winMultiplier = 8;
        winMessage = '4 СЕМЁРКИ! x8';
    } else if (results.filter(symbol => symbol === '7️⃣').length >= 3) {
        winMultiplier = 5;
        winMessage = '3 СЕМЁРКИ! x5';
    } else if (new Set(results).size === 1) {
        winMultiplier = 6;
        winMessage = '5 ОДИНАКОВЫХ! x6';
    } else if (results.filter(symbol => symbol === '🍒').length >= 3) {
        winMultiplier = 2;
        winMessage = '3+ ВИШНИ! x2';
    } else if (results.filter(symbol => symbol === '⭐').length >= 3) {
        winMultiplier = 3;
        winMessage = '3+ ЗВЕЗДЫ! x3';
    }
    
    if (winMultiplier > 0) {
        const winAmount = Math.floor(bet * winMultiplier);
        updateBalance(winAmount, 'slots', true);
        
        showWinAnimation(winMessage);
        showNotification('Выигрыш: ' + winAmount + '⭐', 'success');
        
        gameHistory.slots.games++;
        gameHistory.slots.wins++;
        gameHistory.slots.profit += (winAmount - bet);
    } else {
        showLoseAnimation('Нет выигрыша');
        showNotification('Попробуйте ещё раз!', 'error');
        
        gameHistory.slots.games++;
        gameHistory.slots.losses++;
        gameHistory.slots.profit -= bet;
    }
    
    const resultEl = document.getElementById('slots-result');
    if (resultEl) resultEl.textContent = results.join(' ');
    updateStatsDisplay();
    saveGameHistory();
}

function autoSpinSlots() {
    if (slotsSpinning) {
        showNotification('Слоты уже крутятся!', 'error');
        return;
    }
    
    let spins = 10;
    slotsAutoSpinCount = spins;
    document.getElementById('slots-spin-btn').disabled = true;
    document.getElementById('slots-auto-btn').disabled = true;
    
    function spin() {
        if (slotsAutoSpinCount > 0 && userBalance >= 10) {
            setSlotsBet(10);
            spinSlots();
            slotsAutoSpinCount--;
            
            if (slotsAutoSpinCount > 0) {
                setTimeout(spin, 2500);
            } else {
                document.getElementById('slots-spin-btn').disabled = false;
                document.getElementById('slots-auto-btn').disabled = false;
            }
        } else {
            document.getElementById('slots-spin-btn').disabled = false;
            document.getElementById('slots-auto-btn').disabled = false;
        }
    }
    
    spin();
}

// ==================== DICE ИГРА ====================
function setDiceBet(amount) {
    document.getElementById('dice-bet').value = amount;
}

function rollDice() {
    if (!userId) {
        showLoginModal();
        return;
    }
    
    if (diceRolling) {
        showNotification('Кости уже бросаются!', 'error');
        return;
    }
    
    const betInput = document.getElementById('dice-bet');
    const bet = parseInt(betInput.value);
    const guess = parseInt(document.getElementById('dice-guess').value);
    
    if (isNaN(bet) || bet < 10) {
        showNotification('Минимальная ставка: 10⭐', 'error');
        return;
    }
    
    if (bet > userBalance) {
        showNotification('Недостаточно средств', 'error');
        return;
    }
    
    updateBalance(-bet, 'dice', false);
    diceBetAmount = bet;
    diceRolling = true;
    document.getElementById('dice-roll-btn').disabled = true;
    
    const diceResult = document.getElementById('dice-result');
    if (diceResult) diceResult.style.animation = 'diceRoll 1s';
    
    setTimeout(() => {
        const randomNumber = Math.floor(Math.random() * 100) + 1;
        if (diceResult) diceResult.textContent = randomNumber;
        
        const difference = Math.abs(randomNumber - guess);
        let winMultiplier = 0;
        
        if (difference === 0) {
            winMultiplier = 4;
        } else if (difference <= 5) {
            winMultiplier = 2;
        } else if (difference <= 10) {
            winMultiplier = 1.5;
        }
        
        if (winMultiplier > 0) {
            const winAmount = Math.floor(bet * winMultiplier);
            updateBalance(winAmount, 'dice', true);
            
            showWinAnimation('x' + winMultiplier);
            showNotification('Вы угадали! +' + winAmount + '⭐', 'success');
            
            gameHistory.dice.games++;
            gameHistory.dice.wins++;
            gameHistory.dice.profit += (winAmount - bet);
        } else {
            showLoseAnimation('НЕ УГАДАЛ');
            showNotification('Не повезло. Попробуйте ещё!', 'error');
            
            gameHistory.dice.games++;
            gameHistory.dice.losses++;
            gameHistory.dice.profit -= bet;
        }
        
        updateStatsDisplay();
        saveGameHistory();
        
        setTimeout(() => {
            if (diceResult) diceResult.style.animation = '';
            diceRolling = false;
            document.getElementById('dice-roll-btn').disabled = false;
        }, 1000);
        
    }, 1000);
}

// ==================== ПОПОЛНЕНИЕ И ВЫВОД ====================
function goToBot() {
    window.open('https://t.me/BezdarMoneyBot', '_blank');
}

function createWithdrawal() {
    const amount = parseInt(document.getElementById('withdraw-amount').value);
    const username = document.getElementById('withdraw-username').value.trim();
    
    if (isDemoMode) {
        showNotification('В демо-режиме вывод недоступен', 'warning');
        return;
    }
    
    if (isNaN(amount) || amount < 100) {
        showNotification('Минимальная сумма вывода: 100⭐', 'error');
        return;
    }
    
    if (amount > userBalance) {
        showNotification('Недостаточно средств для вывода', 'error');
        return;
    }
    
    if (!username.startsWith('@')) {
        showNotification('Введите корректный Telegram username (начинается с @)', 'error');
        return;
    }
    
    updateBalance(-amount, 'withdrawal', false);
    
    showNotification('Заявка на вывод создана! Админ свяжется с вами в Telegram', 'success');
    hideModal('withdrawModal');
    
    // Логируем заявку
    console.log('📤 ЗАЯВКА НА ВЫВОД:');
    console.log('👤 User ID:', userId);
    console.log('💰 Сумма:', amount + '⭐');
    console.log('📱 Username:', username);
    console.log('⏰ Время:', new Date().toLocaleString());
}

// ==================== БОНУСЫ И ПРОМОКОДЫ ====================
function activatePromoCode() {
    const promoCode = document.getElementById('promo-code').value.trim().toUpperCase();
    
    if (!promoCode) {
        showNotification('Введите промокод', 'error');
        return;
    }
    
    if (activatedPromoCodes.includes(promoCode)) {
        showNotification('Этот промокод уже активирован', 'warning');
        return;
    }
    
    const validPromoCodes = {
        'WELCOME100': 100,
        'BEZDAR500': 500,
        'LUCK777': 777,
        'START50': 50,
        'BONUS200': 200
    };
    
    let bonusAmount = 0;
    
    if (validPromoCodes[promoCode]) {
        bonusAmount = validPromoCodes[promoCode];
    } else {
        showNotification('Неверный промокод', 'error');
        return;
    }
    
    updateBalance(bonusAmount, 'promo', true);
    activatedPromoCodes.push(promoCode);
    
    saveGameHistory();
    updateActivatedPromos();
    
    showWinAnimation('+' + bonusAmount + '⭐');
    showNotification('Промокод активирован! +' + bonusAmount + '⭐', 'success');
    
    document.getElementById('promo-code').value = '';
}

function updateActivatedPromos() {
    const container = document.getElementById('activated-promos');
    if (!container) return;
    
    if (activatedPromoCodes.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center;">Нет активированных промокодов</p>';
    } else {
        container.innerHTML = activatedPromoCodes.map(code => 
            `<div style="margin: 5px 0; padding: 5px 10px; background: rgba(0,255,0,0.1); border-radius: 5px; border-left: 3px solid #00ff00;">
                🎫 ${code}
            </div>`
        ).join('');
    }
}

// ==================== СТАТИСТИКА ====================
function showStats() {
    if (!userId) {
        showLoginModal();
        return;
    }
    
    document.querySelectorAll('.game-window').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelector('.games-grid').style.display = 'none';
    
    const statsWindow = document.getElementById('stats-window');
    if (statsWindow) statsWindow.style.display = 'block';
    
    updateStatsDisplay();
}

function updateStatsDisplay() {
    const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    updateElement('crash-games', gameHistory.crash.games);
    updateElement('crash-wins', gameHistory.crash.wins);
    updateElement('crash-losses', gameHistory.crash.losses);
    updateElement('crash-profit', gameHistory.crash.profit);
    
    updateElement('mines-games', gameHistory.mines.games);
    updateElement('mines-wins', gameHistory.mines.wins);
    updateElement('mines-losses', gameHistory.mines.losses);
    updateElement('mines-profit', gameHistory.mines.profit);
    
    updateElement('roulette-games', gameHistory.roulette.games);
    updateElement('roulette-wins', gameHistory.roulette.wins);
    updateElement('roulette-losses', gameHistory.roulette.losses);
    updateElement('roulette-profit', gameHistory.roulette.profit);
    
    updateElement('slots-games', gameHistory.slots.games);
    updateElement('slots-wins', gameHistory.slots.wins);
    updateElement('slots-losses', gameHistory.slots.losses);
    updateElement('slots-profit', gameHistory.slots.profit);
    
    updateElement('dice-games', gameHistory.dice.games);
    updateElement('dice-wins', gameHistory.dice.wins);
    updateElement('dice-losses', gameHistory.dice.losses);
    updateElement('dice-profit', gameHistory.dice.profit);
}

// ==================== LOCAL STORAGE ====================
function saveGameHistory() {
    const data = {
        gameHistory: gameHistory,
        activatedPromoCodes: activatedPromoCodes
    };
    localStorage.setItem('bezdarMoneyGameData', JSON.stringify(data));
}

function loadGameHistory() {
    const saved = localStorage.getItem('bezdarMoneyGameData');
    if (saved) {
        const data = JSON.parse(saved);
        gameHistory = data.gameHistory || {
            crash: { games: 0, wins: 0, losses: 0, profit: 0 },
            mines: { games: 0, wins: 0, losses: 0, profit: 0 },
            roulette: { games: 0, wins: 0, losses: 0, profit: 0 },
            slots: { games: 0, wins: 0, losses: 0, profit: 0 },
            dice: { games: 0, wins: 0, losses: 0, profit: 0 }
        };
        activatedPromoCodes = data.activatedPromoCodes || [];
        
        updateActivatedPromos();
        updateStatsDisplay();
    }
}

// Загружаем историю при старте
loadGameHistory();
