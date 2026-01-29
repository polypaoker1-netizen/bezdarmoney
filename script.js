// ==================== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ====================
let userBalance = 0;
let userId = null;
let sessionToken = null;
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
// Для локальной разработки используйте:
// const API_URL = 'http://localhost:10000';
// Для продакшена:
const API_URL = 'https://bezdar-money-bot.onrender.com';

// ==================== ИНИЦИАЛИЗАЦИЯ ====================
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loader').style.display = 'none';
    createStars();
    initLoginSystem();
    
    const diceSlider = document.getElementById('dice-guess');
    const guessValue = document.getElementById('guess-value');
    
    diceSlider.addEventListener('input', function() {
        guessValue.textContent = this.value;
    });
    
    // Добавляем обработчик для сообщений от бота
    window.addEventListener('message', handleTelegramMessage);
    
    setTimeout(() => {
        showNotification('💰 Добро пожаловать в BezdarMoney Casino!', 'info');
    }, 1000);
});

// ==================== ОБРАБОТКА СООБЩЕНИЙ ОТ TELEGRAM ====================
function handleTelegramMessage(event) {
    // Проверяем источник сообщения
    if (event.origin.includes('t.me') || event.origin.includes('telegram.org')) {
        try {
            if (event.data && event.data.user_id && event.data.session_token) {
                // Сохраняем данные из Telegram Web App
                handleTelegramAuth(event.data.user_id, event.data.session_token);
            }
        } catch (error) {
            console.error('Ошибка обработки сообщения от Telegram:', error);
        }
    }
}

// ==================== СИСТЕМА АВТОРИЗАЦИИ ====================
function initLoginSystem() {
    console.log('Инициализация системы авторизации...');
    
    // Пробуем получить данные из URL хэша (для Telegram Web App)
    try {
        const hashParams = getHashParams();
        if (hashParams.user_id && hashParams.session_token) {
            console.log('Найдены параметры в хэше:', hashParams);
            handleTelegramAuth(hashParams.user_id, hashParams.session_token);
            return;
        }
    } catch (e) {
        console.log('Не удалось прочитать хэш:', e);
    }
    
    // Пробуем получить данные из параметров URL
    const urlParams = new URLSearchParams(window.location.search);
    const tgUserId = urlParams.get('user_id') || urlParams.get('tg_user_id');
    const tgSession = urlParams.get('session') || urlParams.get('session_token');
    
    if (tgUserId && tgSession) {
        console.log('Найдены параметры в URL:', { tgUserId, tgSession });
        handleTelegramAuth(tgUserId, tgSession);
        return;
    }
    
    // Пробуем получить из localStorage
    const savedUserId = localStorage.getItem('tg_user_id');
    const savedSession = localStorage.getItem('tg_session_token');
    
    if (savedUserId && savedSession) {
        console.log('Найдены данные в localStorage');
        userId = parseInt(savedUserId);
        sessionToken = savedSession;
        loadBalanceFromServer();
        return;
    }
    
    // Проверяем, запущены ли мы в Telegram Web App
    if (window.Telegram && window.Telegram.WebApp) {
        console.log('Обнаружен Telegram Web App');
        initTelegramWebApp();
        return;
    }
    
    // Если ничего не найдено, показываем окно входа
    console.log('Данные не найдены, показываем окно входа');
    setTimeout(() => {
        showLoginModal();
    }, 1000);
}

function getHashParams() {
    const hash = window.location.hash.substring(1);
    if (!hash) return {};
    
    return hash.split('&').reduce(function(result, item) {
        const parts = item.split('=');
        result[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
        return result;
    }, {});
}

function initTelegramWebApp() {
    try {
        const tg = window.Telegram.WebApp;
        
        // Расширяем на весь экран
        tg.expand();
        
        // Получаем данные пользователя
        const user = tg.initDataUnsafe?.user;
        if (user && user.id) {
            // Генерируем сессию на основе данных Telegram
            const sessionToken = generateSessionToken(user.id);
            handleTelegramAuth(user.id, sessionToken);
        } else {
            // Показываем окно входа для получения данных
            showLoginModal();
        }
    } catch (error) {
        console.error('Ошибка инициализации Telegram Web App:', error);
        showLoginModal();
    }
}

function handleTelegramAuth(tgUserId, tgSessionToken) {
    console.log('Обработка авторизации Telegram:', { tgUserId, tgSessionToken });
    
    // Сохраняем данные
    userId = parseInt(tgUserId);
    sessionToken = tgSessionToken;
    
    localStorage.setItem('tg_user_id', userId.toString());
    localStorage.setItem('tg_session_token', sessionToken);
    
    // Обновляем URL без параметров для чистоты
    if (window.history && window.history.replaceState) {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
    }
    
    // Загружаем баланс
    loadBalanceFromServer();
    
    // Загружаем локальные данные
    loadFromStorage();
    updateStatsDisplay();
    
    // Скрываем окно входа если оно открыто
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        loginModal.remove();
    }
}

function generateSessionToken(userId) {
    // Генерируем простой токен сессии
    return 'tg_session_' + userId + '_' + Date.now() + '_' + Math.random().toString(36).substr(2);
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
                        <h3 style="color: #00ff00;">📱 3 способа войти:</h3>
                        <ol style="color: #ffd700; text-align: left; margin: 15px 0; padding-left: 20px;">
                            <li><strong>Через бота:</strong> Нажмите кнопку ниже</li>
                            <li><strong>В Telegram Web App:</strong> Откройте сайт через бота</li>
                            <li><strong>Демо-режим:</strong> Играйте бесплатно (кнопка ниже)</li>
                        </ol>
                    </div>
                    <button class="btn btn-success" onclick="goToBotForAuth()" style="margin: 10px 0; width: 100%;">
                        🔗 ПЕРЕЙТИ В БОТА ДЛЯ АВТОРИЗАЦИИ
                    </button>
                    <button class="btn btn-warning" onclick="demoMode()" style="margin: 10px 0; width: 100%;">
                        🎮 ДЕМО-РЕЖИМ (игра без риска)
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
    // Создаём уникальную ссылку для авторизации
    const authUrl = `https://t.me/BezdarMoneyBot?start=website_auth_${Date.now()}`;
    window.open(authUrl, '_blank');
    
    showNotification('Открываем бота... Нажмите "🎮 Играть на сайте" в меню бота', 'info');
}

function demoMode() {
    // Скрываем модальное окно
    const modal = document.getElementById('loginModal');
    if (modal) modal.remove();
    
    // Устанавливаем демо-режим
    userId = 0;
    sessionToken = 'demo_session_' + Date.now();
    userBalance = 10000; // Начальный баланс в демо-режиме
    
    localStorage.setItem('tg_user_id', userId.toString());
    localStorage.setItem('tg_session_token', sessionToken);
    
    updateBalanceDisplay();
    showNotification('🎮 Включен демо-режим! Играйте бесплатно!', 'success');
    
    // Загружаем локальные данные
    loadFromStorage();
    updateStatsDisplay();
}

async function loadBalanceFromServer() {
    // В демо-режиме пропускаем запрос к серверу
    if (userId === 0 || sessionToken.includes('demo')) {
        console.log('Демо-режим, пропускаем запрос баланса');
        updateBalanceDisplay();
        return;
    }
    
    try {
        console.log('Загрузка баланса с сервера...', { userId, sessionToken });
        
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
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Ответ от сервера:', data);
        
        if (data.success) {
            userBalance = data.balance;
            updateBalanceDisplay();
            showNotification(`💰 Баланс загружен: ${userBalance}⭐`, 'success');
        } else {
            showNotification('⚠️ Используется локальный баланс', 'warning');
            loadFromStorage();
        }
    } catch (error) {
        console.error('Ошибка загрузки баланса:', error);
        showNotification('⚠️ Не удалось загрузить баланс. Используется локальная версия', 'warning');
        loadFromStorage();
    }
}

// ==================== ОСТАЛЬНЫЕ ФУНКЦИИ (без изменений) ====================

async function updateBalanceOnServer(amount, gameType, win = true) {
    if (userId === 0 || sessionToken.includes('demo')) {
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
                amount: amount,
                game_type: gameType,
                win: win
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                userBalance = data.new_balance;
                updateBalanceDisplay();
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
    
    if (userId !== 0 && !sessionToken.includes('demo') && amount !== 0) {
        updateBalanceOnServer(Math.abs(amount), gameType, win);
    }
    
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
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function startGame(game) {
    if (userId === null) {
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

// ... (остальные функции игр остаются без изменений)

// ==================== LOCAL STORAGE ====================
function saveToStorage() {
    const data = {
        balance: userBalance,
        gameHistory: gameHistory,
        activatedPromoCodes: activatedPromoCodes
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
        
        updateActivatedPromos();
        updateBalanceDisplay();
    }
}

// ==================== ДОПОЛНИТЕЛЬНЫЕ ФИКСЫ ====================

// Автоматическая проверка авторизации при загрузке
function checkAuthOnLoad() {
    // Проверяем разные источники данных
    const sources = [
        () => getHashParams(),
        () => Object.fromEntries(new URLSearchParams(window.location.search)),
        () => ({
            user_id: localStorage.getItem('tg_user_id'),
            session_token: localStorage.getItem('tg_session_token')
        })
    ];
    
    for (const source of sources) {
        try {
            const params = source();
            if (params && params.user_id && params.session_token) {
                console.log('Найдены данные авторизации:', params);
                handleTelegramAuth(params.user_id, params.session_token);
                return true;
            }
        } catch (e) {
            continue;
        }
    }
    
    return false;
}

// Запускаем проверку при загрузке
setTimeout(checkAuthOnLoad, 100);
