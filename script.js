// Иконка (base64 - можно заменить на свою)
const iconBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAABHklEQVR4nO2VMU4CQRTHv82KLRYWJvQGJh6AngK9guER1BNgY29hZw+hRzCxs9HeQk0MhsRgvruf+BA+Zt95k+/A7Mz//fd2F+IKK6z4jxjz4x7a9cMEqJ92fPby8KkKfFzrBQDA/gRYX1TA/KoyP22uAhWA+aKcJhVwDlQA1lYVJykjCgAAnp/+V3TjgqU8GxU4/jmB+Zl4BsZWAON3qU7FjZ9c/NeQqQCIQgGWRQAQAR6xqgDSQJJUAEQiQEQAwMMxJAAQURCwT3wFkj7gJ0gRA5h3PyhXAH61CMATgAzJHY6kAAhEMBaA8QsAAOQMiC5L8qKkCgBu/GmT1Dtg9QCAB0QW59k9AIh2AUh87QM89AUfEHIeMPsAAAAASUVORK5CYII=';

// URL для иконки (можно сохранить отдельно как icon.png)
const iconUrl = 'icon.png'; // Или оставить base64 выше

// Данные пользователя
let userData = {
    balance: 0,
    gamesPlayed: 0,
    totalWins: 0,
    bestWin: 0,
    userId: 'user_' + Math.random().toString(36).substr(2, 9)
};

// Telegram данные (замените на свои!)
const BOT_TOKEN = '7634324714:AAHnJR3SD0M47tPols4rirVsBpT3GJTQnZQ'; // Токен бота от @BotFather
const ADMIN_ID = '8373042596'; // ID админа
const TON_WALLET = 'UQB_SEDoL3M_1ZdlZ7NU6cjJ0usA5hQQtwIzQGdCKacxsSmM';

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    updateUI();
});

// Загрузка данных пользователя
function loadUserData() {
    const saved = localStorage.getItem('bezdarUser');
    if (saved) {
        userData = JSON.parse(saved);
    } else {
        localStorage.setItem('bezdarUser', JSON.stringify(userData));
    }
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('balance').textContent = userData.balance;
    document.getElementById('games-played').textContent = userData.gamesPlayed;
    document.getElementById('total-wins').textContent = userData.totalWins;
    document.getElementById('best-win').textContent = userData.bestWin;
}

// ИГРЫ //

function startGame(gameType) {
    const modal = document.getElementById('gameModal');
    const content = document.getElementById('gameContent');
    
    switch(gameType) {
        case 'dice':
            content.innerHTML = `
                <h2><i class="fas fa-dice"></i> Dice</h2>
                <p>Ставка: <input type="number" id="diceBet" value="10" min="1" max="${userData.balance}"> звёзд</p>
                <p>Выберите число от 1 до 100: <input type="number" id="diceGuess" value="50" min="1" max="100"></p>
                <p>Множитель: до x99</p>
                <button onclick="playDice()" class="bet-btn">БРОСИТЬ КОСТИ</button>
                <div id="diceResult"></div>
            `;
            break;
            
        case 'roulette':
            content.innerHTML = `
                <h2><i class="fas fa-roulette-wheel"></i> Рулетка</h2>
                <p>Ставка: <input type="number" id="rouletteBet" value="10" min="1" max="${userData.balance}"> звёзд</p>
                <p>Выберите цвет:</p>
                <div class="bet-controls">
                    <button onclick="setRouletteBet('red')" style="background:red">КРАСНОЕ (x2)</button>
                    <button onclick="setRouletteBet('black')" style="background:black">ЧЁРНОЕ (x2)</button>
                    <button onclick="setRouletteBet('green')" style="background:green">ЗЕЛЁНОЕ (x36)</button>
                </div>
                <button onclick="playRoulette()" class="bet-btn">КРУТИТЬ РУЛЕТКУ</button>
                <div id="rouletteResult"></div>
            `;
            break;
            
        case 'mines':
            content.innerHTML = `
                <h2><i class="fas fa-gem"></i> Mines</h2>
                <p>Ставка: <input type="number" id="minesBet" value="10" min="1" max="${userData.balance}"> звёзд</p>
                <p>Выберите количество мин (1-24): <input type="number" id="minesCount" value="3" min="1" max="24"></p>
                <div id="minesGrid" class="mines-grid"></div>
                <button onclick="startMines()" class="bet-btn">НАЧАТЬ ИГРУ</button>
                <div id="minesResult"></div>
            `;
            break;
            
        case 'crash':
            content.innerHTML = `
                <h2><i class="fas fa-chart-line"></i> Crash</h2>
                <p>Ставка: <input type="number" id="crashBet" value="10" min="1" max="${userData.balance}"> звёзд</p>
                <button onclick="playCrash()" class="bet-btn">ЗАПУСТИТЬ</button>
                <div id="crashMultiplier">Множитель: 1.00x</div>
                <button onclick="cashOut()" id="cashOutBtn" disabled>ЗАБРАТЬ</button>
                <div id="crashResult"></div>
            `;
            break;
            
        case 'slots':
            content.innerHTML = `
                <h2><i class="fas fa-sliders-h"></i> Slots</h2>
                <p>Ставка: <input type="number" id="slotsBet" value="10" min="1" max="${userData.balance}"> звёзд</p>
                <div class="slots-reels">
                    <div class="reel" id="reel1">🍒</div>
                    <div class="reel" id="reel2">🍒</div>
                    <div class="reel" id="reel3">🍒</div>
                </div>
                <button onclick="playSlots()" class="bet-btn">КРУТИТЬ</button>
                <div id="slotsResult"></div>
            `;
            break;
    }
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('gameModal').style.display = 'none';
}

// Игра Dice
function playDice() {
    const bet = parseInt(document.getElementById('diceBet').value);
    const guess = parseInt(document.getElementById('diceGuess').value);
    
    if (bet > userData.balance) {
        showMessage('Недостаточно звёзд!');
        return;
    }
    
    const roll = Math.floor(Math.random() * 100) + 1;
    let multiplier = 1;
    
    if (roll === guess) {
        multiplier = 99;
    } else if (Math.abs(roll - guess) <= 5) {
        multiplier = 5;
    } else if (Math.abs(roll - guess) <= 10) {
        multiplier = 2;
    } else {
        multiplier = 0;
    }
    
    const win = bet * multiplier;
    
    if (multiplier > 0) {
        userData.balance += win;
        userData.totalWins += win;
        userData.bestWin = Math.max(userData.bestWin, win);
        showMessage(`🎲 Выпало: ${roll}! Выигрыш: ${win} звёзд (x${multiplier})`);
    } else {
        userData.balance -= bet;
        showMessage(`🎲 Выпало: ${roll}. Вы проиграли ${bet} звёзд`);
    }
    
    userData.gamesPlayed++;
    saveAndUpdate();
    
    document.getElementById('diceResult').innerHTML = `
        <h3>🎲 Выпало: ${roll}</h3>
        <h3>${multiplier > 0 ? '🏆 ВЫИГРЫШ: ' + win + ' звёзд' : '💸 ПРОИГРЫШ: ' + bet + ' звёзд'}</h3>
    `;
}

// Игра Рулетка
let rouletteBetType = 'red';

function setRouletteBet(type) {
    rouletteBetType = type;
}

function playRoulette() {
    const bet = parseInt(document.getElementById('rouletteBet').value);
    
    if (bet > userData.balance) {
        showMessage('Недостаточно звёзд!');
        return;
    }
    
    const number = Math.floor(Math.random() * 37);
    let color = 'green';
    
    if (number === 0) {
        color = 'green';
    } else if (number % 2 === 0) {
        color = 'black';
    } else {
        color = 'red';
    }
    
    let multiplier = 1;
    if (rouletteBetType === color) {
        multiplier = rouletteBetType === 'green' ? 36 : 2;
    } else {
        multiplier = 0;
    }
    
    const win = bet * multiplier;
    
    if (multiplier > 0) {
        userData.balance += win;
        userData.totalWins += win;
        userData.bestWin = Math.max(userData.bestWin, win);
        showMessage(`🎰 Выпало: ${number} (${color})! Выигрыш: ${win} звёзд`);
    } else {
        userData.balance -= bet;
        showMessage(`🎰 Выпало: ${number} (${color}). Вы проиграли ${bet} звёзд`);
    }
    
    userData.gamesPlayed++;
    saveAndUpdate();
    
    document.getElementById('rouletteResult').innerHTML = `
        <h3 style="color:${color}">🎰 Выпало: ${number} (${color.toUpperCase()})</h3>
        <h3>${multiplier > 0 ? '🏆 ВЫИГРЫШ: ' + win + ' звёзд' : '💸 ПРОИГРЫШ: ' + bet + ' звёзд'}</h3>
    `;
}

// POPOLNENIE I VIVOD //

function copyWallet() {
    navigator.clipboard.writeText(TON_WALLET);
    showMessage('Кошелёк скопирован в буфер!');
}

function selectPackage(stars, ton) {
    document.getElementById('deposit-stars').value = stars;
    showMessage(`Выбрано ${stars} звёзд (~${ton} TON)`);
}

async function submitDeposit() {
    const stars = parseInt(document.getElementById('deposit-stars').value);
    const txHash = document.getElementById('tx-hash').value.trim();
    
    if (!stars || stars < 10) {
        showMessage('Минимум 10 звёзд для пополнения!');
        return;
    }
    
    if (!txHash) {
        showMessage('Введите хэш транзакции!');
        return;
    }
    
    // Здесь должна быть отправка в Telegram админу
    const message = `🟢 НОВОЕ ПОПОЛНЕНИЕ\n\n👤 Пользователь: ${userData.userId}\n⭐ Звёзд: ${stars}\n💎 TON: ${stars * 0.015}\n🔗 Хэш: ${txHash}`;
    
    // Отправка через Telegram API (раскомментировать и добавить токен)
    // fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    //     method: 'POST',
    //     headers: {'Content-Type': 'application/json'},
    //     body: JSON.stringify({
    //         chat_id: ADMIN_ID,
    //         text: message
    //     })
    // });
    
    showMessage('✅ Запрос отправлен админу! Ожидайте подтверждения.');
    
    // Очистка полей
    document.getElementById('deposit-stars').value = '';
    document.getElementById('tx-hash').value = '';
}

async function submitWithdraw() {
    const stars = parseInt(document.getElementById('withdraw-stars').value);
    const wallet = document.getElementById('withdraw-wallet').value.trim();
    
    if (!stars || stars < 10 || stars > userData.balance) {
        showMessage('Проверьте количество звёзд!');
        return;
    }
    
    if (!wallet) {
        showMessage('Введите адрес кошелька TON!');
        return;
    }
    
    // Здесь должна быть отправка в Telegram админу
    const message = `🔴 ЗАПРОС ВЫВОДА\n\n👤 Пользователь: ${userData.userId}\n⭐ Звёзд: ${stars}\n💎 TON: ${stars * 0.015}\n👛 Кошелёк: ${wallet}`;
    
    // Отправка через Telegram API
    // fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    //     method: 'POST',
    //     headers: {'Content-Type': 'application/json'},
    //     body: JSON.stringify({
    //         chat_id: ADMIN_ID,
    //         text: message
    //     })
    // });
    
    showMessage('✅ Запрос на вывод отправлен админу!');
    
    // Очистка полей
    document.getElementById('withdraw-stars').value = '';
    document.getElementById('withdraw-wallet').value = '';
}

// Вспомогательные функции
function saveAndUpdate() {
    localStorage.setItem('bezdarUser', JSON.stringify(userData));
    updateUI();
}

function showMessage(text) {
    document.getElementById('messageText').textContent = text;
    document.getElementById('messageModal').style.display = 'block';
}

function closeMessageModal() {
    document.getElementById('messageModal').style.display = 'none';
}

// Закрытие модальных окон кликом вне
window.onclick = function(event) {
    const modals = document.getElementsByClassName('modal');
    for (let modal of modals) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
};
