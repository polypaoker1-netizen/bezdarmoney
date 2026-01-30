// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let userBalance = 0;
let userId = null;
let sessionToken = null;
let username = '';
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

// API конфигурация
const API_URL = 'https://bezdar-money-bot.onrender.com';

// ==================== ИСПРАВЛЕННЫЕ ИГРЫ ====================

// ========== CRASH (исправлен, меньшие шансы на выигрыш) ==========
async function placeCrashBet() {
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
    
    // Генерация точки взрыва с малыми шансами на большой выигрыш
    const random = Math.random();
    if (random < 0.4) {
        // 40% - взрыв между 1.2x и 1.8x
        crashExplodePoint = 1.2 + Math.random() * 0.6;
    } else if (random < 0.7) {
        // 30% - взрыв между 1.8x и 2.5x
        crashExplodePoint = 1.8 + Math.random() * 0.7;
    } else if (random < 0.9) {
        // 20% - взрыв между 2.5x и 3.5x
        crashExplodePoint = 2.5 + Math.random() * 1.0;
    } else if (random < 0.98) {
        // 8% - взрыв между 3.5x и 5x
        crashExplodePoint = 3.5 + Math.random() * 1.5;
    } else {
        // 2% - взрыв между 5x и 10x (редко)
        crashExplodePoint = 5.0 + Math.random() * 5.0;
    }
    
    crashMultiplier = 1.0;
    
    document.getElementById('cashout-btn').disabled = false;
    document.getElementById('crash-start-btn').disabled = true;
    
    crashInterval = setInterval(updateCrash, 150); // Замедлили скорость
    
    showNotification('Самолёт взлетает! Забирайте деньги от 1.5x!', 'warning');
}

// ========== MINES (исправлен, меньшие шансы на выигрыш) ==========
async function startMinesGame() {
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
    
    // 8 мин вместо 5 (меньше шансов выиграть)
    let minesPlaced = 0;
    while (minesPlaced < 8) {
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

async function revealMine(index) {
    if (!minesGameActive || minesGrid[index].revealed) return;
    
    minesStep++;
    document.getElementById('moves-count').textContent = minesStep;
    
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
        saveToStorage();
        
        minesGameActive = false;
        document.getElementById('mines-cashout-btn').disabled = true;
        document.getElementById('mines-start-btn').disabled = false;
    } else {
        cell.className = 'mine-cell revealed';
        cell.textContent = '💎';
        
        // Уменьшили множитель
        minesCashoutAmount = Math.floor(minesCashoutAmount * 1.2);
        
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
            saveToStorage();
            
            minesGameActive = false;
            document.getElementById('mines-cashout-btn').disabled = true;
            document.getElementById('mines-start-btn').disabled = false;
        } else {
            showNotification('Найдена драгоценность! Текущий выигрыш: ' + minesCashoutAmount + '⭐', 'info');
        }
    }
}

// ========== РУЛЕТКА (исправлена, меньшие шансы на выигрыш) ==========
async function spinRoulette() {
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
    
    setTimeout(async () => {
        // Измененные шансы: зеленое реже, красное и черное 49/49
        const random = Math.random() * 100;
        let resultColor, multiplier;
        
        if (random < 0.5) { // 0.5% на зеленое
            resultColor = 'green';
            multiplier = 36;
        } else if (random < 49.5) { // 49% на красное
            resultColor = 'red';
            multiplier = 2;
        } else { // 50.5% на черное
            resultColor = 'black';
            multiplier = 2;
        }
        
        wheel.style.animation = 'none';
        ball.style.animation = 'none';
        
        setTimeout(async () => {
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
            saveToStorage();
            
            rouletteBetAmount = 0;
            rouletteBetColor = '';
            rouletteSpinning = false;
            document.getElementById('roulette-spin-btn').disabled = false;
            
        }, 500);
        
    }, 2000);
}

// ========== СЛОТЫ (исправлены, меньшие шансы на выигрыш) ==========
async function checkSlotsWin(results, bet) {
    let winMultiplier = 0;
    let winMessage = '';
    
    // Уменьшили шансы на выигрыш
    const rand = Math.random();
    
    // Джекпот 5 семерок - очень редко (0.1%)
    if (results.every(symbol => symbol === '7️⃣') && rand < 0.001) {
        winMultiplier = 12;
        winMessage = '🎰 ДЖЕКПОТ! x12 🎰';
    }
    // 4 семерки - редко (0.5%)
    else if (results.filter(symbol => symbol === '7️⃣').length >= 4 && rand < 0.005) {
        winMultiplier = 8;
        winMessage = '4 СЕМЁРКИ! x8';
    }
    // 3 семерки - редко (1%)
    else if (results.filter(symbol => symbol === '7️⃣').length >= 3 && rand < 0.01) {
        winMultiplier = 5;
        winMessage = '3 СЕМЁРКИ! x5';
    }
    // 5 одинаковых - редко (2%)
    else if (new Set(results).size === 1 && rand < 0.02) {
        winMultiplier = 6;
        winMessage = '5 ОДИНАКОВЫХ! x6';
    }
    // 3+ вишен - иногда (10%)
    else if (results.filter(symbol => symbol === '🍒').length >= 3 && rand < 0.1) {
        winMultiplier = 2;
        winMessage = '3+ ВИШНИ! x2';
    }
    // 3+ звёзд - редко (5%)
    else if (results.filter(symbol => symbol === '⭐').length >= 3 && rand < 0.05) {
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
    
    document.getElementById('slots-result').textContent = results.join(' ');
    updateStatsDisplay();
    saveToStorage();
}

// ========== DICE (исправлен, меньшие шансы на выигрыш) ==========
async function rollDice() {
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
    diceResult.style.animation = 'diceRoll 1s';
    
    setTimeout(async () => {
        const randomNumber = Math.floor(Math.random() * 100) + 1;
        diceResult.textContent = randomNumber;
        
        const difference = Math.abs(randomNumber - guess);
        let winMultiplier = 0;
        
        // Уменьшили шансы на выигрыш
        if (difference === 0 && Math.random() < 0.1) { // 10% шанс на точное попадание
            winMultiplier = 4;
        } else if (difference <= 3 && Math.random() < 0.2) { // 20% шанс на ±3
            winMultiplier = 2;
        } else if (difference <= 7 && Math.random() < 0.3) { // 30% шанс на ±7
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
        saveToStorage();
        
        setTimeout(() => {
            diceResult.style.animation = '';
            diceRolling = false;
            document.getElementById('dice-roll-btn').disabled = false;
        }, 1000);
        
    }, 1000);
}

// ==================== СИСТЕМА АВТОРИЗАЦИИ ====================
function initLoginSystem() {
    console.log('Инициализация системы авторизации...');
    
    // Проверяем URL параметры
    const urlParams = new URLSearchParams(window.location.search);
    const tgUserId = urlParams.get('user_id');
    const tgSession = urlParams.get('session_token');
    
    console.log('Параметры URL:', { tgUserId, tgSession });
    
    if (tgUserId && tgSession) {
        console.log('Найдены параметры в URL, авторизуем...');
        userId = parseInt(tgUserId);
        sessionToken = tgSession;
        
        localStorage.setItem('tg_user_id', userId.toString());
        localStorage.setItem('tg_session_token', sessionToken);
        
        // Очищаем URL от параметров
        if (window.history && window.history.replaceState) {
            const cleanUrl = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
        
        // Загружаем данные пользователя
        loadUserData();
        return;
    }
    
    // Проверяем данные в localStorage
    const savedUserId = localStorage.getItem('tg_user_id');
    const savedSession = localStorage.getItem('tg_session_token');
    
    if (savedUserId && savedSession) {
        console.log('Найдены данные в localStorage');
        userId = parseInt(savedUserId);
        sessionToken = savedSession;
        
        // Проверяем сессию
        checkSessionValidity();
        return;
    }
    
    // Если ничего не найдено, показываем окно входа
    console.log('Данные не найдены, показываем окно входа');
    showLoginModal();
}

async function loadUserData() {
    try {
        const response = await fetch(`${API_URL}/api/balance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                session_token: sessionToken
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to load user data');
        }
        
        const data = await response.json();
        
        if (data.success) {
            userBalance = data.balance;
            username = data.username || 'Гость';
            updateBalanceDisplay();
            showNotification(`✅ Добро пожаловать, ${username}!`, 'success');
            
            loadFromStorage();
            updateStatsDisplay();
            updateActivatedPromos();
            
            // Скрываем окно входа если оно открыто
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.remove();
            }
            
            // Обновляем информацию о пользователе в интерфейсе
            document.getElementById('username-display').textContent = username;
            document.getElementById('username-display').style.display = 'inline-block';
        } else {
            showNotification('⚠️ Ошибка загрузки данных', 'warning');
            showLoginModal();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        showNotification('⚠️ Ошибка соединения', 'error');
        showLoginModal();
    }
}

function showLoginModal() {
    // Проверяем, не открыто ли уже модальное окно
    if (document.getElementById('loginModal')) {
        return;
    }
    
    const modalHTML = `
        <div id="loginModal" class="modal" style="display: flex;">
            <div class="modal-content">
                <h2 style="color: #ffd700; margin-bottom: 20px;">🔐 ВХОД В BEZDARMONEY</h2>
                <div style="margin: 20px 0;">
                    <p style="color: #ffd700; margin-bottom: 20px;">
                        Для игры необходимо авторизоваться через Telegram бота
                    </p>
                    <div style="background: rgba(0,255,0,0.1); padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid #00ff00;">
                        <h3 style="color: #00ff00;">📱 Как войти:</h3>
                        <ol style="color: #ffd700; text-align: left; margin: 15px 0; padding-left: 20px;">
                            <li><strong>Откройте Telegram бота:</strong> @BezdarMoneyBot</li>
                            <li><strong>Зарегистрируйтесь</strong> или войдите в аккаунт</li>
                            <li><strong>Нажмите кнопку</strong> "🎮 Играть на сайте"</li>
                            <li><strong>Вы будете автоматически авторизованы</strong></li>
                        </ol>
                    </div>
                    <button class="btn btn-success" onclick="goToBotForAuth()" style="margin: 10px 0; width: 100%;">
                        🔗 ПЕРЕЙТИ В БОТА ДЛЯ ВХОДА
                    </button>
                    <div style="margin-top: 20px; padding: 10px; background: rgba(255,215,0,0.1); border-radius: 10px;">
                        <p style="color: #ff9999; font-size: 12px; margin: 5px 0;">
                            ⚠️ Если вы перешли из бота и видите это сообщение, 
                            обновите страницу или нажмите кнопку в боте ещё раз
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);
}

function goToBotForAuth() {
    const authUrl = `https://t.me/BezdarMoneyBot?start=website_auth`;
    window.open(authUrl, '_blank');
    
    showNotification('Открываем бота... Зарегистрируйтесь или войдите в аккаунт', 'info');
}

// ==================== ОБНОВЛЕНИЕ БАЛАНСА ====================
async function updateBalanceOnServer(amount, gameType, win = true) {
    if (!userId || !sessionToken) {
        return userBalance;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/webhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                secret: 'bezdar_casino_secret_2024',
                user_id: userId,
                amount: Math.abs(amount),
                game_type: gameType,
                win: win
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                userBalance = data.new_balance;
                updateBalanceDisplay();
                return userBalance;
            }
        }
    } catch (error) {
        console.error('Ошибка обновления баланса:', error);
    }
    
    return userBalance;
}

function updateBalance(amount, gameType = 'other', win = true) {
    userBalance += amount;
    updateBalanceDisplay();
    
    saveToStorage();
    
    if (userId && sessionToken && amount !== 0) {
        updateBalanceOnServer(Math.abs(amount), gameType, win);
    }
    
    return userBalance;
}

// ==================== ОСТАЛЬНЫЕ ФУНКЦИИ ====================
function startGame(game) {
    // Проверяем авторизацию
    if (!userId || !sessionToken) {
        showLoginModal();
        return;
    }
    
    document.querySelectorAll('.game-window').forEach(el => {
        el.style.display = 'none';
    });
    document.querySelector('.games-grid').style.display = 'none';
    
    document.querySelectorAll('.game-card').forEach(card => {
        card.classList.remove('active');
    });
    document.querySelector(`.game-card[onclick*="${game}"]`).classList.add('active');
    
    document.getElementById(`${game}-game`).style.display = 'block';
    
    if (game === 'mines') {
        resetMinesGrid();
    } else if (game === 'slots') {
        resetSlots();
    }
}

function showModal(modalId) {
    if (!userId || !sessionToken) {
        showLoginModal();
        return;
    }
    
    document.getElementById(modalId).style.display = 'flex';
}

// ==================== LOCAL STORAGE ====================
function saveToStorage() {
    const data = {
        balance: userBalance,
        gameHistory: gameHistory,
        activatedPromoCodes: activatedPromoCodes,
        username: username
    };
    localStorage.setItem('bezdarMoneyData', JSON.stringify(data));
}

function loadFromStorage() {
    const saved = localStorage.getItem('bezdarMoneyData');
    if (saved) {
        const data = JSON.parse(saved);
        userBalance = data.balance || 0;
        gameHistory = data.gameHistory || {
            crash: { games: 0, wins: 0, losses: 0, profit: 0 },
            mines: { games: 0, wins: 0, losses: 0, profit: 0 },
            roulette: { games: 0, wins: 0, losses: 0, profit: 0 },
            slots: { games: 0, wins: 0, losses: 0, profit: 0 },
            dice: { games: 0, wins: 0, losses: 0, profit: 0 }
        };
        activatedPromoCodes = data.activatedPromoCodes || [];
        username = data.username || 'Гость';
        
        updateActivatedPromos();
        updateBalanceDisplay();
        document.getElementById('username-display').textContent = username;
        document.getElementById('username-display').style.display = 'inline-block';
    }
}

// Автоматическая проверка при загрузке
window.addEventListener('load', function() {
    initLoginSystem();
function logout() 
{
    if (confirm('Вы уверены, что хотите выйти?')) {
        localStorage.removeItem('tg_user_id');
        localStorage.removeItem('tg_session_token');
        localStorage.removeItem('bezdarMoneyData');
        
        userId = null;
        sessionToken = null;
        userBalance = 0;
        username = '';
        
        updateBalanceDisplay();
        document.getElementById('username-display').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'none';
        
        showNotification('Вы вышли из аккаунта', 'info');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
}

});
