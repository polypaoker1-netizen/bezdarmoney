📁 3. ФАЙЛ: script.js
javascript
// Глобальные переменные BezdarMoney Casino
let balance = 0; // Начальный баланс 0
let demoBalance = 1000; // Демо баланс 1к
let isDemoMode = true; // По умолчанию демо-режим
let currentGame = null;
let crashInterval = null;
let crashMultiplier = 1.0;
let isCrashGameRunning = false;
let crashBetAmount = 0;
let crashTargetMultiplier = 0;
let minesGameActive = false;
let minesRevealed = 0;
let minesBetAmount = 0;
let minesTotalCells = 25;
let minesCount = 5;
let minesGrid = [];
let rouletteSpinning = false;
let slotsSpinning = false;
let diceRolling = false;
let username = null;
let isAuthenticated = false;

// Статистика
let stats = {
    crash: { games: 0, wins: 0, losses: 0, profit: 0 },
    mines: { games: 0, wins: 0, losses: 0, profit: 0 },
    roulette: { games: 0, wins: 0, losses: 0, profit: 0 },
    slots: { games: 0, wins: 0, losses: 0, profit: 0 },
    dice: { games: 0, wins: 0, losses: 0, profit: 0 }
};

// Промокоды
let promoCodeUsed = false;
const promoCode = "BEZDAR1000";
const promoBonus = 1000;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    initStars();
    loadUserData();
    updateBalanceDisplay();
    checkAuthentication();
    
    // Добавляем переключатель демо-режима
    addDemoModeToggle();
    
    // Проверяем авторизацию через Telegram мини-приложение
    if (window.Telegram && Telegram.WebApp) {
        const tg = Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        const user = tg.initDataUnsafe.user;
        if (user) {
            username = user.username || `user_${user.id}`;
            isAuthenticated = true;
            document.getElementById('username-text').textContent = username;
            document.getElementById('username-display').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'inline-block';
            
            // При авторизации выключаем демо-режим
            isDemoMode = false;
            updateBalanceDisplay();
            showNotification('✅ Авторизация прошла успешно!');
        }
    }
    
    // Загрузка статистики
    loadStats();
    
    // Скрываем загрузку через 2 секунды
    setTimeout(() => {
        document.getElementById('loader').style.display = 'none';
    }, 2000);
});

// Функция создания звёздного неба
function initStars() {
    const stars = document.getElementById('stars');
    const starCount = 200;
    
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.classList.add('star');
        
        // Случайные параметры
        const size = Math.random() * 3 + 1;
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const opacity = Math.random() * 0.7 + 0.3;
        const duration = Math.random() * 5 + 3;
        const delay = Math.random() * 5;
        
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${x}%`;
        star.style.top = `${y}%`;
        star.style.opacity = opacity;
        star.style.animationDuration = `${duration}s`;
        star.style.animationDelay = `${delay}s`;
        
        stars.appendChild(star);
    }
}

// Проверка авторизации
function checkAuthentication() {
    // Проверка через localStorage
    const savedUsername = localStorage.getItem('bezdarUsername');
    if (savedUsername) {
        username = savedUsername;
        isAuthenticated = true;
        document.getElementById('username-text').textContent = username;
        document.getElementById('username-display').style.display = 'block';
        document.getElementById('logout-btn').style.display = 'inline-block';
    }
    
    // Если нет авторизации - включаем демо-режим
    if (!isAuthenticated) {
        isDemoMode = true;
        updateBalanceDisplay();
    }
}

// Добавление переключателя демо-режима
function addDemoModeToggle() {
    const header = document.querySelector('.header');
    const demoToggle = document.createElement('div');
    demoToggle.className = 'demo-toggle';
    demoToggle.innerHTML = `
        <label style="display: flex; align-items: center; gap: 10px; color: #ffd700; cursor: pointer;">
            <input type="checkbox" id="demo-toggle-checkbox" ${isDemoMode ? 'checked' : ''} onchange="toggleDemoMode(this.checked)">
            <span>Демо-режим</span>
        </label>
    `;
    demoToggle.style.position = 'absolute';
    demoToggle.style.top = '20px';
    demoToggle.style.right = '20px';
    demoToggle.style.zIndex = '10';
    
    header.appendChild(demoToggle);
}

// Переключение демо-режима
function toggleDemoMode(enabled) {
    isDemoMode = enabled;
    if (isDemoMode) {
        showNotification('🎮 Включён демо-режим (1000⭐)');
    } else {
        showNotification('💰 Включён реальный режим');
    }
    updateBalanceDisplay();
    saveUserData();
}

// Обновление отображения баланса
function updateBalanceDisplay() {
    const currentBalance = isDemoMode ? demoBalance : balance;
    document.getElementById('balance').textContent = formatNumber(currentBalance);
    document.getElementById('modal-balance').textContent = formatNumber(currentBalance);
    document.getElementById('withdraw-balance').textContent = formatNumber(currentBalance);
    
    // Показываем подсказку о демо-режиме
    const balanceElement = document.querySelector('.balance');
    if (isDemoMode) {
        balanceElement.title = 'Демо-режим (тестовые 1000⭐)';
        balanceElement.style.opacity = '0.7';
    } else {
        balanceElement.title = 'Реальный баланс';
        balanceElement.style.opacity = '1';
    }
}

// Форматирование чисел
function formatNumber(num) {
    return num.toLocaleString('ru-RU');
}

// Установка ставки для разных игр
function setBet(amount) {
    document.getElementById('crash-bet').value = amount;
}

function setMinesBet(amount) {
    document.getElementById('mines-bet').value = amount;
}

function setRouletteBet(amount) {
    document.getElementById('roulette-bet').value = amount;
}

function setSlotsBet(amount) {
    document.getElementById('slots-bet').value = amount;
}

function setDiceBet(amount) {
    document.getElementById('dice-bet').value = amount;
}

// Начало игры
function startGame(game) {
    // Скрываем все игровые окна
    const games = ['crash', 'mines', 'roulette', 'slots', 'dice'];
    games.forEach(g => {
        const gameWindow = document.getElementById(`${g}-game`);
        if (gameWindow) gameWindow.style.display = 'none';
    });
    
    document.getElementById('stats-window').style.display = 'none';
    
    // Снимаем активность со всех карточек
    document.querySelectorAll('.game-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Активируем текущую карточку
    const gameCards = document.querySelectorAll('.game-card');
    switch(game) {
        case 'crash':
            gameCards[0].classList.add('active');
            document.getElementById('crash-game').style.display = 'block';
            break;
        case 'mines':
            gameCards[1].classList.add('active');
            document.getElementById('mines-game').style.display = 'block';
            initMinesGrid();
            break;
        case 'roulette':
            gameCards[2].classList.add('active');
            document.getElementById('roulette-game').style.display = 'block';
            break;
        case 'slots':
            gameCards[3].classList.add('active');
            document.getElementById('slots-game').style.display = 'block';
            break;
        case 'dice':
            gameCards[4].classList.add('active');
            document.getElementById('dice-game').style.display = 'block';
            break;
    }
    
    currentGame = game;
}

// Выход из игры
function exitGame() {
    if (currentGame === 'crash' && isCrashGameRunning) {
        stopCrashGame();
    }
    
    const games = ['crash', 'mines', 'roulette', 'slots', 'dice'];
    games.forEach(g => {
        const gameWindow = document.getElementById(`${g}-game`);
        if (gameWindow) gameWindow.style.display = 'none';
    });
    
    document.getElementById('stats-window').style.display = 'none';
    
    // Активируем меню выбора игры
    document.querySelectorAll('.game-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelectorAll('.game-card')[0].classList.add('active');
}

// Показать статистику
function showStats() {
    const games = ['crash', 'mines', 'roulette', 'slots', 'dice'];
    games.forEach(g => {
        const gameWindow = document.getElementById(`${g}-game`);
        if (gameWindow) gameWindow.style.display = 'none';
    });
    
    document.getElementById('stats-window').style.display = 'block';
    updateStatsDisplay();
}

// ========== CRASH ИГРА ==========
function placeCrashBet() {
    const betInput = document.getElementById('crash-bet');
    const betAmount = parseInt(betInput.value);
    
    if (isNaN(betAmount) || betAmount < 10) {
        showNotification('❌ Минимальная ставка 10⭐');
        return;
    }
    
    if (!canAfford(betAmount)) {
        showNotification('❌ Недостаточно средств');
        return;
    }
    
    // Снимаем деньги
    deductBalance(betAmount);
    
    crashBetAmount = betAmount;
    isCrashGameRunning = true;
    crashMultiplier = 1.0;
    
    document.getElementById('crash-start-btn').disabled = true;
    document.getElementById('cashout-btn').disabled = false;
    
    // Случайный множитель взрыва (часто 1.2-5)
    crashTargetMultiplier = 1.2 + Math.random() * 3.8; // 1.2 - 5
    
    // Анимация самолёта
    const plane = document.getElementById('crash-plane');
    plane.style.bottom = '20px';
    
    crashInterval = setInterval(updateCrashGame, 100);
    
    // Статистика
    stats.crash.games++;
    saveStats();
}

function updateCrashGame() {
    if (!isCrashGameRunning) return;
    
    // Увеличиваем множитель
    crashMultiplier += 0.01;
    
    // Обновляем отображение
    document.getElementById('crash-multiplier').textContent = crashMultiplier.toFixed(2) + 'x';
    
    // Двигаем самолёт
    const plane = document.getElementById('crash-plane');
    const currentBottom = parseInt(plane.style.bottom) || 20;
    const newBottom = currentBottom + 2;
    plane.style.bottom = newBottom + 'px';
    
    // Добавляем след
    const trail = document.getElementById('crash-trail');
    const trailDot = document.createElement('div');
    trailDot.style.position = 'absolute';
    trailDot.style.left = '50%';
    trailDot.style.bottom = newBottom + 'px';
    trailDot.style.width = '5px';
    trailDot.style.height = '5px';
    trailDot.style.backgroundColor = '#3498db';
    trailDot.style.borderRadius = '50%';
    trail.appendChild(trailDot);
    
    // Проверка на взрыв
    if (crashMultiplier >= crashTargetMultiplier) {
        crashExplode();
    }
}

function cashOut() {
    if (!isCrashGameRunning || crashMultiplier < 1.4) {
        showNotification('❌ Можно забрать только от 1.4x');
        return;
    }
    
    const winAmount = Math.floor(crashBetAmount * crashMultiplier);
    addBalance(winAmount);
    
    showWinAnimation(`💰 Выигрыш: ${formatNumber(winAmount)}⭐ (${crashMultiplier.toFixed(2)}x)`);
    
    // Статистика
    stats.crash.wins++;
    stats.crash.profit += (winAmount - crashBetAmount);
    saveStats();
    
    stopCrashGame();
}

function crashExplode() {
    if (!isCrashGameRunning) return;
    
    showLoseAnimation(`💥 Взрыв на ${crashTargetMultiplier.toFixed(2)}x!`);
    
    // Статистика
    stats.crash.losses++;
    stats.crash.profit -= crashBetAmount;
    saveStats();
    
    stopCrashGame();
}

function stopCrashGame() {
    clearInterval(crashInterval);
    isCrashGameRunning = false;
    
    document.getElementById('crash-start-btn').disabled = false;
    document.getElementById('cashout-btn').disabled = true;
    document.getElementById('crash-multiplier').textContent = '1.00x';
    
    // Очищаем след
    document.getElementById('crash-trail').innerHTML = '';
    
    // Сбрасываем самолёт
    document.getElementById('crash-plane').style.bottom = '20px';
}

// ========== MINES ИГРА ==========
function initMinesGrid() {
    const grid = document.getElementById('mines-grid');
    grid.innerHTML = '';
    
    minesGrid = [];
    minesRevealed = 0;
    
    // Создаём пустую сетку
    for (let i = 0; i < minesTotalCells; i++) {
        minesGrid.push({
            isMine: false,
            isRevealed: false
        });
    }
    
    // Размещаем мины случайно
    let minesPlaced = 0;
    while (minesPlaced < minesCount) {
        const randomIndex = Math.floor(Math.random() * minesTotalCells);
        if (!minesGrid[randomIndex].isMine) {
            minesGrid[randomIndex].isMine = true;
            minesPlaced++;
        }
    }
    
    // Создаём ячейки
    for (let i = 0; i < minesTotalCells; i++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.dataset.index = i;
        cell.onclick = () => revealMineCell(i);
        
        // Скрытое содержимое
        const content = document.createElement('div');
        content.className = 'cell-content';
        content.textContent = '❓';
        cell.appendChild(content);
        
        grid.appendChild(cell);
    }
    
    // Сброс кнопок
    document.getElementById('moves-count').textContent = '0';
    document.getElementById('mines-start-btn').disabled = false;
    document.getElementById('mines-cashout-btn').disabled = true;
    minesGameActive = false;
}

function startMinesGame() {
    const betInput = document.getElementById('mines-bet');
    const betAmount = parseInt(betInput.value);
    
    if (isNaN(betAmount) || betAmount < 10) {
        showNotification('❌ Минимальная ставка 10⭐');
        return;
    }
    
    if (!canAfford(betAmount)) {
        showNotification('❌ Недостаточно средств');
        return;
    }
    
    // Снимаем деньги
    deductBalance(betAmount);
    minesBetAmount = betAmount;
    minesGameActive = true;
    
    document.getElementById('mines-start-btn').disabled = true;
    document.getElementById('mines-cashout-btn').disabled = false;
    
    // Статистика
    stats.mines.games++;
    saveStats();
    
    showNotification('💣 Игра началась! Кликайте по клеткам');
}

function revealMineCell(index) {
    if (!minesGameActive || minesGrid[index].isRevealed) return;
    
    const cell = document.querySelector(`.mine-cell[data-index="${index}"]`);
    minesGrid[index].isRevealed = true;
    minesRevealed++;
    
    // Обновляем счётчик ходов
    document.getElementById('moves-count').textContent = minesRevealed;
    
    if (minesGrid[index].isMine) {
        // Мина взорвалась
        cell.classList.add('mine');
        cell.querySelector('.cell-content').textContent = '💣';
        cell.style.color = '#ff0000';
        
        // Проигрыш
        showLoseAnimation('💣 Вы наткнулись на мину!');
        
        // Статистика
        stats.mines.losses++;
        stats.mines.profit -= minesBetAmount;
        saveStats();
        
        minesGameActive = false;
        document.getElementById('mines-cashout-btn').disabled = true;
    } else {
        // Нашли деньги
        cell.classList.add('revealed');
        
        const reward = Math.floor(minesBetAmount * 0.2); // 20% от ставки за клетку
        cell.querySelector('.cell-content').textContent = '💰';
        cell.style.color = '#00ff00';
        
        // Анимация награды
        setTimeout(() => {
            cell.innerHTML = `<div style="color:#00ff00">+${reward}⭐</div>`;
        }, 500);
    }
    
    // Проверка на конец игры (все безопасные клетки открыты)
    const safeCells = minesTotalCells - minesCount;
    if (minesRevealed === safeCells) {
        cashOutMines();
    }
}

function cashOutMines() {
    if (!minesGameActive) return;
    
    const winAmount = Math.floor(minesBetAmount * (1 + minesRevealed * 0.2));
    addBalance(winAmount);
    
    showWinAnimation(`💰 Выигрыш: ${formatNumber(winAmount)}⭐ за ${minesRevealed} клеток!`);
    
    // Статистика
    stats.mines.wins++;
    stats.mines.profit += (winAmount - minesBetAmount);
    saveStats();
    
    minesGameActive = false;
    document.getElementById('mines-cashout-btn').disabled = true;
}

// ========== РУЛЕТКА ==========
function placeRouletteBet(color) {
    if (rouletteSpinning) return;
    
    const betInput = document.getElementById('roulette-bet');
    const betAmount = parseInt(betInput.value);
    
    if (isNaN(betAmount) || betAmount < 10) {
        showNotification('❌ Минимальная ставка 10⭐');
        return;
    }
    
    if (!canAfford(betAmount)) {
        showNotification('❌ Недостаточно средств');
        return;
    }
    
    // Показываем выбранный цвет
    showNotification(`🎯 Ставка на ${color === 'red' ? 'КРАСНОЕ' : color === 'green' ? 'ЗЕЛЁНОЕ' : 'ЧЁРНОЕ'}`);
}

function spinRoulette() {
    if (rouletteSpinning) return;
    
    const betInput = document.getElementById('roulette-bet');
    const betAmount = parseInt(betInput.value);
    
    if (isNaN(betAmount) || betAmount < 10) {
        showNotification('❌ Минимальная ставка 10⭐');
        return;
    }
    
    if (!canAfford(betAmount)) {
        showNotification('❌ Недостаточно средств');
        return;
    }
    
    // Снимаем деньги
    deductBalance(betAmount);
    rouletteSpinning = true;
    document.getElementById('roulette-spin-btn').disabled = true;
    
    // Статистика
    stats.roulette.games++;
    saveStats();
    
    // Имитация вращения
    setTimeout(() => {
        // Случайный результат: 0-36 (0 - зелёное, 1-18 красное, 19-36 чёрное)
        const result = Math.floor(Math.random() * 37);
        let resultColor;
        
        if (result === 0) {
            resultColor = 'green';
        } else if (result >= 1 && result <= 18) {
            resultColor = 'red';
        } else {
            resultColor = 'black';
        }
        
        // Проверка выигрыша (упрощённая логика)
        const userBet = 'red'; // В реальной игре это должно быть из выбора пользователя
        let multiplier = 1;
        
        if (resultColor === userBet) {
            if (resultColor === 'green') {
                multiplier = 36;
            } else {
                multiplier = 2;
            }
            
            const winAmount = Math.floor(betAmount * multiplier);
            addBalance(winAmount);
            
            showWinAnimation(`🎉 Выигрыш ${multiplier}x! Выпало: ${result} (${resultColor.toUpperCase()})`);
            
            // Статистика
            stats.roulette.wins++;
            stats.roulette.profit += (winAmount - betAmount);
        } else {
            showLoseAnimation(`💥 Проигрыш! Выпало: ${result} (${resultColor.toUpperCase()})`);
            
            // Статистика
            stats.roulette.losses++;
            stats.roulette.profit -= betAmount;
        }
        
        saveStats();
        rouletteSpinning = false;
        document.getElementById('roulette-spin-btn').disabled = false;
    }, 3000);
}

// ========== СЛОТЫ ==========
function spinSlots() {
    if (slotsSpinning) return;
    
    const betInput = document.getElementById('slots-bet');
    const betAmount = parseInt(betInput.value);
    
    if (isNaN(betAmount) || betAmount < 10) {
        showNotification('❌ Минимальная ставка 10⭐');
        return;
    }
    
    if (!canAfford(betAmount)) {
        showNotification('❌ Недостаточно средств');
        return;
    }
    
    // Снимаем деньги
    deductBalance(betAmount);
    slotsSpinning = true;
    document.getElementById('slots-spin-btn').disabled = true;
    document.getElementById('slots-auto-btn').disabled = true;
    
    // Статистика
    stats.slots.games++;
    saveStats();
    
    // Анимация вращения
    const reels = ['reel1', 'reel2', 'reel3', 'reel4', 'reel5'];
    reels.forEach((reelId, index) => {
        const reel = document.getElementById(reelId).querySelector('.slot-items');
        const duration = 1000 + index * 200; // Разное время остановки
        
        reel.style.animation = `slotSpin 0.1s linear`;
        
        setTimeout(() => {
            reel.style.animation = 'none';
            
            // Случайный результат
            const symbols = ['🍒', '🍋', '🍉', '⭐', '7️⃣'];
            const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
            
            // Устанавливаем позицию для отображения нужного символа
            const items = reel.querySelectorAll('.slot-item');
            items.forEach(item => item.textContent = randomSymbol);
            
            // После остановки последнего барабана проверяем результат
            if (index === reels.length - 1) {
                setTimeout(checkSlotsResult, 500);
            }
        }, duration);
    });
}

function checkSlotsResult() {
    // Собираем результаты с барабанов
    const results = [];
    for (let i = 1; i <= 5; i++) {
        const reel = document.getElementById(`reel${i}`).querySelector('.slot-items');
        const symbol = reel.querySelector('.slot-item').textContent;
        results.push(symbol);
    }
    
    // Проверка выигрышных комбинаций
    let multiplier = 0;
    let winMessage = '';
    
    // Джекпот: все 7
    if (results.every(symbol => symbol === '7️⃣')) {
        multiplier = 12;
        winMessage = '🎰 ДЖЕКПОТ! 77777 x12!';
    }
    // 5 одинаковых символов
    else if (results[0] === results[1] && results[1] === results[2] && results[2] === results[3] && results[3] === results[4]) {
        multiplier = 5;
        winMessage = `🎉 5 одинаковых символов! x5`;
    }
    // 4 одинаковых символа
    else if (
        (results[0] === results[1] && results[1] === results[2] && results[2] === results[3]) ||
        (results[1] === results[2] && results[2] === results[3] && results[3] === results[4])
    ) {
        multiplier = 3;
        winMessage = '🎯 4 одинаковых символа! x3';
    }
    // 3 одинаковых символа
    else if (
        (results[0] === results[1] && results[1] === results[2]) ||
        (results[1] === results[2] && results[2] === results[3]) ||
        (results[2] === results[3] && results[3] === results[4])
    ) {
        multiplier = 2;
        winMessage = '💰 3 одинаковых символа! x2';
    }
    
    const betInput = document.getElementById('slots-bet');
    const betAmount = parseInt(betInput.value);
    
    if (multiplier > 0) {
        const winAmount = Math.floor(betAmount * multiplier);
        addBalance(winAmount);
        
        showWinAnimation(`${winMessage} Выигрыш: ${formatNumber(winAmount)}⭐`);
        document.getElementById('slots-result').textContent = winMessage;
        
        // Статистика
        stats.slots.wins++;
        stats.slots.profit += (winAmount - betAmount);
    } else {
        showLoseAnimation('💥 Проигрыш! Попробуйте ещё раз');
        document.getElementById('slots-result').textContent = '💥 Проигрыш';
        
        // Статистика
        stats.slots.losses++;
        stats.slots.profit -= betAmount;
    }
    
    saveStats();
    slotsSpinning = false;
    document.getElementById('slots-spin-btn').disabled = false;
    document.getElementById('slots-auto-btn').disabled = false;
}

function autoSpinSlots() {
    const spins = 10;
    let completed = 0;
    
    function doSpin() {
        if (completed >= spins) return;
        
        spinSlots();
        setTimeout(() => {
            completed++;
            if (completed < spins) {
                doSpin();
            }
        }, 3500); // Ждём завершения вращения + пауза
    }
    
    doSpin();
}

// ========== DICE ИГРА ==========
function updateDiceGuess() {
    const slider = document.getElementById('dice-guess');
    const value = document.getElementById('guess-value');
    value.textContent = slider.value;
}

// Инициализация слайдера
document.getElementById('dice-guess').addEventListener('input', updateDiceGuess);
updateDiceGuess(); // Установить начальное значение

function rollDice() {
    if (diceRolling) return;
    
    const betInput = document.getElementById('dice-bet');
    const betAmount = parseInt(betInput.value);
    
    if (isNaN(betAmount) || betAmount < 10) {
        showNotification('❌ Минимальная ставка 10⭐');
        return;
    }
    
    if (!canAfford(betAmount)) {
        showNotification('❌ Недостаточно средств');
        return;
    }
    
    // Снимаем деньги
    deductBalance(betAmount);
    diceRolling = true;
    document.getElementById('dice-roll-btn').disabled = true;
    
    // Статистика
    stats.dice.games++;
    saveStats();
    
    // Анимация броска
    const diceResult = document.getElementById('dice-result');
    diceResult.style.animation = 'diceRoll 2s';
    
    setTimeout(() => {
        // Случайный результат от 1 до 100
        const randomNumber = Math.floor(Math.random() * 100) + 1;
        const userGuess = parseInt(document.getElementById('dice-guess').value);
        const difference = Math.abs(randomNumber - userGuess);
        
        diceResult.textContent = `🎲 ${randomNumber}`;
        
        let multiplier = 0;
        let winMessage = '';
        
        if (difference === 0) {
            multiplier = 4;
            winMessage = '🎯 ТОЧНО В ЦЕЛЬ! x4';
        } else if (difference <= 5) {
            multiplier = 2;
            winMessage = '💰 Очень близко! x2';
        } else if (difference <= 10) {
            multiplier = 1.5;
            winMessage = '🎯 Близко! x1.5';
        }
        
        if (multiplier > 0) {
            const winAmount = Math.floor(betAmount * multiplier);
            addBalance(winAmount);
            
            showWinAnimation(`${winMessage} Ваше число: ${userGuess}, Выпало: ${randomNumber}`);
            
            // Статистика
            stats.dice.wins++;
            stats.dice.profit += (winAmount - betAmount);
        } else {
            showLoseAnimation(`💥 Проигрыш! Ваше число: ${userGuess}, Выпало: ${randomNumber}`);
            
            // Статистика
            stats.dice.losses++;
            stats.dice.profit -= betAmount;
        }
        
        saveStats();
        diceRolling = false;
        document.getElementById('dice-roll-btn').disabled = false;
    }, 2000);
}

// ========== СИСТЕМА БАЛАНСА ==========
function canAfford(amount) {
    const currentBalance = isDemoMode ? demoBalance : balance;
    return currentBalance >= amount;
}

function deductBalance(amount) {
    if (isDemoMode) {
        demoBalance -= amount;
    } else {
        balance -= amount;
    }
    updateBalanceDisplay();
    saveUserData();
}

function addBalance(amount) {
    if (isDemoMode) {
        demoBalance += amount;
    } else {
        balance += amount;
    }
    updateBalanceDisplay();
    saveUserData();
}

// ========== МОДАЛЬНЫЕ ОКНА ==========
function showModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

function hideModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Пополнение баланса
function goToBot() {
    showNotification('🤖 Переход в Telegram бота...');
    // В реальном приложении здесь будет ссылка на бота
    window.open('https://t.me/BezdarMoneyBot', '_blank');
}

// Вывод средств
function createWithdrawal() {
    const amountInput = document.getElementById('withdraw-amount');
    const usernameInput = document.getElementById('withdraw-username');
    
    const amount = parseInt(amountInput.value);
    const username = usernameInput.value.trim();
    
    if (isNaN(amount) || amount < 100) {
        showNotification('❌ Минимальная сумма вывода 100⭐');
        return;
    }
    
    if (!username || !username.startsWith('@')) {
        showNotification('❌ Введите корректный Telegram username (начинается с @)');
        return;
    }
    
    if (!canAfford(amount)) {
        showNotification('❌ Недостаточно средств для вывода');
        return;
    }
    
    // В демо-режиме просто показываем сообщение
    if (isDemoMode) {
        showNotification('🎮 В демо-режиме вывод невозможен');
        return;
    }
    
    // Списание средств
    deductBalance(amount);
    
    // Сохраняем заявку
    const withdrawals = JSON.parse(localStorage.getItem('bezdarWithdrawals') || '[]');
    withdrawals.push({
        amount: amount,
        username: username,
        date: new Date().toISOString(),
        status: 'pending'
    });
    localStorage.setItem('bezdarWithdrawals', JSON.stringify(withdrawals));
    
    showNotification(`✅ Заявка на вывод ${amount}⭐ создана! Админ свяжется с @${username}`);
    hideModal('withdrawModal');
    
    // Очищаем поля
    amountInput.value = '100';
    usernameInput.value = '';
}

// Промокоды
function activatePromoCode() {
    const promoInput = document.getElementById('promo-code');
    const code = promoInput.value.trim().toUpperCase();
    
    if (!code) {
        showNotification('❌ Введите промокод');
        return;
    }
    
    if (promoCodeUsed) {
        showNotification('❌ Вы уже использовали промокод');
        return;
    }
    
    if (code === promoCode) {
        promoCodeUsed = true;
        addBalance(promoBonus);
        
        // Сохраняем активированный промокод
        const activatedPromos = JSON.parse(localStorage.getItem('bezdarPromos') || '[]');
        activatedPromos.push({ code: code, bonus: promoBonus, date: new Date().toISOString() });
        localStorage.setItem('bezdarPromos', JSON.stringify(activatedPromos));
        
        showNotification(`🎉 Промокод активирован! +${promoBonus}⭐`);
        
        // Обновляем список промокодов
        updateActivatedPromos();
        
        promoInput.value = '';
    } else {
        showNotification('❌ Неверный промокод');
    }
}

function updateActivatedPromos() {
    const container = document.getElementById('activated-promos');
    const activatedPromos = JSON.parse(localStorage.getItem('bezdarPromos') || '[]');
    
    if (activatedPromos.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center;">Нет активированных промокодов</p>';
        return;
    }
    
    container.innerHTML = '';
    activatedPromos.forEach(promo => {
        const promoElement = document.createElement('div');
        promoElement.style.marginBottom = '10px';
        promoElement.style.padding = '10px';
        promoElement.style.background = 'rgba(0,255,0,0.1)';
        promoElement.style.borderRadius = '5px';
        promoElement.style.border = '1px solid #00ff00';
        
        promoElement.innerHTML = `
            <div style="color: #00ff00; font-weight: bold;">${promo.code}</div>
            <div style="color: #ffd700; font-size: 12px;">+${promo.bonus}⭐</div>
            <div style="color: #999; font-size: 10px;">${new Date(promo.date).toLocaleDateString()}</div>
        `;
        
        container.appendChild(promoElement);
    });
}

// Выход из системы
function logout() {
    if (confirm('Вы уверены, что хотите выйти?')) {
        isAuthenticated = false;
        username = null;
        
        localStorage.removeItem('bezdarUsername');
        
        document.getElementById('username-display').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'none';
        document.getElementById('username-text').textContent = 'Гость';
        
        // Включаем демо-режим
        isDemoMode = true;
        updateBalanceDisplay();
        
        showNotification('👋 Вы вышли из системы');
    }
}

// ========== УТИЛИТЫ ==========
function showNotification(message) {
    // Создаём элемент уведомления
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    // Добавляем на страницу
    document.body.appendChild(notification);
    
    // Удаляем через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function showWinAnimation(message) {
    const animation = document.createElement('div');
    animation.className = 'win-animation';
    animation.textContent = '🎉 ' + message;
    
    document.body.appendChild(animation);
    
    setTimeout(() => {
        animation.remove();
    }, 2000);
}

function showLoseAnimation(message) {
    const animation = document.createElement('div');
    animation.className = 'lose-animation';
    animation.textContent = '💥 ' + message;
    
    document.body.appendChild(animation);
    
    setTimeout(() => {
        animation.remove();
    }, 2000);
}

// Сохранение данных пользователя
function saveUserData() {
    const userData = {
        balance: balance,
        demoBalance: demoBalance,
        isDemoMode: isDemoMode,
        username: username,
        isAuthenticated: isAuthenticated
    };
    
    localStorage.setItem('bezdarUserData', JSON.stringify(userData));
}

function loadUserData() {
    const savedData = localStorage.getItem('bezdarUserData');
    if (savedData) {
        try {
            const userData = JSON.parse(savedData);
            balance = userData.balance || 0;
            demoBalance = userData.demoBalance || 1000;
            isDemoMode = userData.isDemoMode !== undefined ? userData.isDemoMode : true;
            username = userData.username || null;
            isAuthenticated = userData.isAuthenticated || false;
        } catch (e) {
            console.error('Error loading user data:', e);
        }
    }
    
    // Загружаем активированные промокоды
    updateActivatedPromos();
}

// Статистика
function saveStats() {
    localStorage.setItem('bezdarStats', JSON.stringify(stats));
}

function loadStats() {
    const savedStats = localStorage.getItem('bezdarStats');
    if (savedStats) {
        try {
            stats = JSON.parse(savedStats);
        } catch (e) {
            console.error('Error loading stats:', e);
        }
    }
}

function updateStatsDisplay() {
    // CRASH
    document.getElementById('crash-games').textContent = stats.crash.games;
    document.getElementById('crash-wins').textContent = stats.crash.wins;
    document.getElementById('crash-losses').textContent = stats.crash.losses;
    document.getElementById('crash-profit').textContent = formatNumber(stats.crash.profit);
    
    // MINES
    document.getElementById('mines-games').textContent = stats.mines.games;
    document.getElementById('mines-wins').textContent = stats.mines.wins;
    document.getElementById('mines-losses').textContent = stats.mines.losses;
    document.getElementById('mines-profit').textContent = formatNumber(stats.mines.profit);
    
    // РУЛЕТКА
    document.getElementById('roulette-games').textContent = stats.roulette.games;
    document.getElementById('roulette-wins').textContent = stats.roulette.wins;
    document.getElementById('roulette-losses').textContent = stats.roulette.losses;
    document.getElementById('roulette-profit').textContent = formatNumber(stats.roulette.profit);
    
    // СЛОТЫ
    document.getElementById('slots-games').textContent = stats.slots.games;
    document.getElementById('slots-wins').textContent = stats.slots.wins;
    document.getElementById('slots-losses').textContent = stats.slots.losses;
    document.getElementById('slots-profit').textContent = formatNumber(stats.slots.profit);
    
    // DICE
    document.getElementById('dice-games').textContent = stats.dice.games;
    document.getElementById('dice-wins').textContent = stats.dice.wins;
    document.getElementById('dice-losses').textContent = stats.dice.losses;
    document.getElementById('dice-profit').textContent = formatNumber(stats.dice.profit);
}

// Telegram WebApp интеграция
if (window.Telegram && Telegram.WebApp) {
    const tg = Telegram.WebApp;
    
    // Обработчик для получения данных
    tg.onEvent('webAppDataReceived', (event) => {
        const data = event.data;
        console.log('Telegram data received:', data);
    });
    
    // Кнопка "Назад" в Telegram
    tg.BackButton.onClick(() => {
        exitGame();
    });
    
    // Показываем кнопку "Назад" когда в игре
    function updateBackButton() {
        if (currentGame !== null) {
            tg.BackButton.show();
        } else {
            tg.BackButton.hide();
        }
    }
}
