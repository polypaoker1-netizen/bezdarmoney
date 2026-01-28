// Данные пользователя
let userData = {
    balance: 0,
    gamesPlayed: 0,
    totalWins: 0,
    bestWin: 0,
    userId: 'user_' + Math.random().toString(36).substr(2, 9)
};

// Транзакции (хранятся в localStorage)
let transactions = {
    deposits: [],
    withdrawals: [],
    users: []
};

// Админ пароль (можно поменять)
const ADMIN_PASSWORD = 'admin123';

// TON кошелёк
const TON_WALLET = 'UQB_SEDoL3M_1ZdIZ7NU6cj0usA5hQQtwlzQGdCKacxsSmM';

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    loadTransactions();
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

// Загрузка транзакций
function loadTransactions() {
    const saved = localStorage.getItem('bezdarTransactions');
    if (saved) {
        transactions = JSON.parse(saved);
    } else {
        // Добавляем тестового пользователя
        transactions.users.push({
            id: userData.userId,
            balance: 0,
            deposits: 0,
            withdrawals: 0
        });
        localStorage.setItem('bezdarTransactions', JSON.stringify(transactions));
    }
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('balance').textContent = userData.balance;
    document.getElementById('games-played').textContent = userData.gamesPlayed;
    document.getElementById('total-wins').textContent = userData.totalWins;
    document.getElementById('best-win').textContent = userData.bestWin;
}

// ИГРЫ (упрощенные версии)
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
                <button onclick="playDice()" class="submit-btn">БРОСИТЬ КОСТИ</button>
                <div id="diceResult"></div>
            `;
            break;
            
        case 'roulette':
            content.innerHTML = `
                <h2><i class="fas fa-roulette-wheel"></i> Рулетка</h2>
                <p>Ставка: <input type="number" id="rouletteBet" value="10" min="1" max="${userData.balance}"> звёзд</p>
                <div style="display:flex;gap:10px;margin:15px 0;">
                    <button onclick="setRouletteBet('red')" style="background:red;color:white;padding:10px;">КРАСНОЕ (x2)</button>
                    <button onclick="setRouletteBet('black')" style="background:black;color:white;padding:10px;">ЧЁРНОЕ (x2)</button>
                    <button onclick="setRouletteBet('green')" style="background:green;color:white;padding:10px;">ЗЕЛЁНОЕ (x36)</button>
                </div>
                <button onclick="playRoulette()" class="submit-btn">КРУТИТЬ РУЛЕТКУ</button>
                <div id="rouletteResult"></div>
            `;
            break;
            
        case 'mines':
            content.innerHTML = `
                <h2><i class="fas fa-gem"></i> Mines</h2>
                <p>Ставка: <input type="number" id="minesBet" value="10" min="1" max="${userData.balance}"> звёзд</p>
                <p>Правила: Находите алмазы, избегайте мин. Множитель до x100</p>
                <button onclick="playMines()" class="submit-btn">ИГРАТЬ В MINES</button>
                <div id="minesResult"></div>
            `;
            break;
            
        case 'crash':
            content.innerHTML = `
                <h2><i class="fas fa-chart-line"></i> Crash</h2>
                <p>Ставка: <input type="number" id="crashBet" value="10" min="1" max="${userData.balance}"> звёзд</p>
                <p>Правила: Множитель растет. Заберите деньги до краша!</p>
                <button onclick="playCrash()" class="submit-btn">ЗАПУСТИТЬ CRASH</button>
                <div id="crashResult"></div>
            `;
            break;
            
        case 'slots':
            content.innerHTML = `
                <h2><i class="fas fa-sliders-h"></i> Slots</h2>
                <p>Ставка: <input type="number" id="slotsBet" value="10" min="1" max="${userData.balance}"> звёзд</p>
                <p>Правила: Совпадение 3 символов = выигрыш до x100</p>
                <button onclick="playSlots()" class="submit-btn">КРУТИТЬ СЛОТЫ</button>
                <div id="slotsResult"></div>
            `;
            break;
    }
    
    modal.style.display = 'block';
}

function playDice() {
    const bet = parseInt(document.getElementById('diceBet').value);
    if (bet > userData.balance) {
        showMessage('Недостаточно звёзд!');
        return;
    }
    
    const roll = Math.floor(Math.random() * 100) + 1;
    const guess = parseInt(document.getElementById('diceGuess').value);
    let multiplier = 0;
    
    if (roll === guess) multiplier = 99;
    else if (Math.abs(roll - guess) <= 5) multiplier = 5;
    else if (Math.abs(roll - guess) <= 10) multiplier = 2;
    
    processGameResult(bet, multiplier, 'Dice', `Выпало: ${roll}`);
}

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
    let color = number === 0 ? 'green' : (number % 2 === 0 ? 'black' : 'red');
    let multiplier = rouletteBetType === color ? (color === 'green' ? 36 : 2) : 0;
    
    processGameResult(bet, multiplier, 'Roulette', `Выпало: ${number} (${color})`);
}

function playMines() {
    const bet = parseInt(document.getElementById('minesBet').value);
    if (bet > userData.balance) {
        showMessage('Недостаточно звёзд!');
        return;
    }
    
    // Упрощенная версия Mines
    const multiplier = Math.random() > 0.5 ? Math.floor(Math.random() * 100) + 1 : 0;
    processGameResult(bet, multiplier, 'Mines', `Игра в алмазы`);
}

function playCrash() {
    const bet = parseInt(document.getElementById('crashBet').value);
    if (bet > userData.balance) {
        showMessage('Недостаточно звёзд!');
        return;
    }
    
    // Упрощенная версия Crash
    const multiplier = Math.random() * 10;
    const win = multiplier > 1 ? bet * multiplier : 0;
    
    processGameResult(bet, multiplier, 'Crash', `Множитель: ${multiplier.toFixed(2)}x`);
}

function playSlots() {
    const bet = parseInt(document.getElementById('slotsBet').value);
    if (bet > userData.balance) {
        showMessage('Недостаточно звёзд!');
        return;
    }
    
    // Упрощенная версия Slots
    const symbols = ['🍒', '🍋', '🍉', '⭐', '7️⃣'];
    const result = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
    ];
    
    let multiplier = 0;
    if (result[0] === result[1] && result[1] === result[2]) {
        multiplier = result[0] === '7️⃣' ? 100 : 
                    result[0] === '⭐' ? 50 : 
                    result[0] === '🍉' ? 20 : 10;
    }
    
    processGameResult(bet, multiplier, 'Slots', `Результат: ${result.join(' ')}`);
}

function processGameResult(bet, multiplier, gameName, details) {
    const win = Math.floor(bet * multiplier);
    
    if (multiplier > 0) {
        userData.balance += win;
        userData.totalWins += win;
        userData.bestWin = Math.max(userData.bestWin, win);
    } else {
        userData.balance -= bet;
    }
    
    userData.gamesPlayed++;
    saveAndUpdate();
    
    const resultElement = document.getElementById(gameName.toLowerCase() + 'Result') || 
                         document.querySelector('#gameContent div:last-child');
    
    if (resultElement) {
        resultElement.innerHTML = `
            <h3>${details}</h3>
            <h3 style="color:${multiplier > 0 ? '#28a745' : '#dc3545'}">
                ${multiplier > 0 ? '🏆 ВЫИГРЫШ: ' + win + ' звёзд (x' + multiplier.toFixed(2) + ')' : 
                                   '💸 ПРОИГРЫШ: ' + bet + ' звёзд'}
            </h3>
        `;
    }
    
    showMessage(multiplier > 0 ? 
        `🎉 Поздравляем! Вы выиграли ${win} звёзд в ${gameName}!` :
        `😢 Вы проиграли ${bet} звёзд в ${gameName}. Попробуйте еще!`
    );
}

// ПОПОЛНЕНИЕ И ВЫВОД
function copyWallet() {
    navigator.clipboard.writeText(TON_WALLET);
    showMessage('Кошелёк скопирован в буфер!');
}

function selectPackage(stars) {
    document.getElementById('deposit-stars').value = stars;
    showMessage(`Выбрано ${stars} звёзд (~${stars * 0.015} TON)`);
}

function submitDeposit() {
    const stars = parseInt(document.getElementById('deposit-stars').value);
    const txHash = document.getElementById('tx-hash').value.trim();
    
    if (!stars || stars < 10) {
        showMessage('Минимум 10 звёзд для пополнения!');
        return;
    }
    
    if (!txHash) {
        showMessage('Введите хэш транзакции TON!');
        return;
    }
    
    // Создаем запрос на пополнение
    const deposit = {
        id: Date.now(),
        userId: userData.userId,
        stars: stars,
        tonAmount: stars * 0.015,
        txHash: txHash,
        status: 'pending',
        date: new Date().toLocaleString()
    };
    
    // Добавляем в историю
    transactions.deposits.push(deposit);
    localStorage.setItem('bezdarTransactions', JSON.stringify(transactions));
    
    showMessage('✅ Запрос на пополнение отправлен! Админ проверит в течение 15 минут.');
    
    // Очистка полей
    document.getElementById('deposit-stars').value = '100';
    document.getElementById('tx-hash').value = '';
}

function submitWithdraw() {
    const stars = parseInt(document.getElementById('withdraw-stars').value);
    const wallet = document.getElementById('withdraw-wallet').value.trim();
    
    if (!stars || stars < 10 || stars > userData.balance) {
        showMessage('Проверьте количество звёзд! Минимум 10, максимум ваш баланс');
        return;
    }
    
    if (!wallet || wallet.length < 10) {
        showMessage('Введите корректный адрес кошелька TON!');
        return;
    }
    
    // Создаем запрос на вывод
    const withdrawal = {
        id: Date.now(),
        userId: userData.userId,
        stars: stars,
        tonAmount: stars * 0.015,
        wallet: wallet,
        status: 'pending',
        date: new Date().toLocaleString()
    };
    
    // Временно списываем со счета
    userData.balance -= stars;
    saveAndUpdate();
    
    // Добавляем в историю
    transactions.withdrawals.push(withdrawal);
    localStorage.setItem('bezdarTransactions', JSON.stringify(transactions));
    
    showMessage('✅ Запрос на вывод отправлен! Админ обработает в течение 30 минут.');
    
    // Очистка полей
    document.getElementById('withdraw-stars').value = '';
    document.getElementById('withdraw-wallet').value = '';
}

// АДМИН ПАНЕЛЬ
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
        showMessage('❌ Неверный пароль!');
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
    loadTransactions();
    
    // Пополнения
    const depositsDiv = document.getElementById('pendingDeposits');
    depositsDiv.innerHTML = '';
    
    const pendingDeposits = transactions.deposits.filter(d => d.status === 'pending');
    
    if (pendingDeposits.length === 0) {
        depositsDiv.innerHTML = '<p>Нет ожидающих пополнений</p>';
    } else {
        pendingDeposits.forEach(deposit => {
            depositsDiv.innerHTML += `
                <div class="transaction-item">
                    <p><strong>Пользователь:</strong> ${deposit.userId}</p>
                    <p><strong>Звёзд:</strong> ${deposit.stars}</p>
                    <p><strong>TON:</strong> ${deposit.tonAmount}</p>
                    <p><strong>Хэш:</strong> ${deposit.txHash}</p>
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
    
    const pendingWithdrawals = transactions.withdrawals.filter(w => w.status === 'pending');
    
    if (pendingWithdrawals.length === 0) {
        withdrawalsDiv.innerHTML = '<p>Нет ожидающих выводов</p>';
    } else {
        pendingWithdrawals.forEach(withdrawal => {
            withdrawalsDiv.innerHTML += `
                <div class="transaction-item">
                    <p><strong>Пользователь:</strong> ${withdrawal.userId}</p>
                    <p><strong>Звёзд:</strong> ${withdrawal.stars}</p>
                    <p><strong>TON:</strong> ${withdrawal.tonAmount}</p>
                    <p><strong>Кошелёк:</strong> ${withdrawal.wallet}</p>
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
    
    // Пользователи
    const usersDiv = document.getElementById('usersList');
    usersDiv.innerHTML = '';
    
    transactions.users.forEach(user => {
        const userDeposits = transactions.deposits.filter(d => d.userId === user.id && d.status === 'approved');
        const userWithdrawals = transactions.withdrawals.filter(w => w.userId === user.id && w.status === 'approved');
        
        const totalDeposited = userDeposits.reduce((sum, d) => sum + d.stars, 0);
        const totalWithdrawn = userWithdrawals.reduce((sum, w) => sum + w.stars, 0);
        
        usersDiv.innerHTML += `
            <div class="transaction-item">
                <p><strong>ID:</strong> ${user.id}</p>
                <p><strong>Всего пополнено:</strong> ${totalDeposited} звёзд</p>
                <p><strong>Всего выведено:</strong> ${totalWithdrawn} звёзд</p>
                <div class="transaction-actions">
                    <button onclick="addStarsToUser('${user.id}')" style="background:#17a2b8;color:white">
                        <i class="fas fa-plus"></i> Добавить звёзды
                    </button>
                </div>
            </div>
        `;
    });
}

function approveDeposit(depositId) {
    const deposit = transactions.deposits.find(d => d.id === depositId);
    if (deposit) {
        deposit.status = 'approved';
        
        // Начисляем звёзды пользователю
        if (deposit.userId === userData.userId) {
            userData.balance += deposit.stars;
            saveAndUpdate();
            showMessage(`✅ Пополнение одобрено! Начислено ${deposit.stars} звёзд.`);
        }
        
        localStorage.setItem('bezdarTransactions', JSON.stringify(transactions));
        loadAdminData();
    }
}

function rejectDeposit(depositId) {
    const deposit = transactions.deposits.find(d => d.id === depositId);
    if (deposit) {
        deposit.status = 'rejected';
        localStorage.setItem('bezdarTransactions', JSON.stringify(transactions));
        loadAdminData();
        showMessage('❌ Пополнение отклонено.');
    }
}

function approveWithdrawal(withdrawalId) {
    const withdrawal = transactions.withdrawals.find(w => w.id === withdrawalId);
    if (withdrawal) {
        withdrawal.status = 'approved';
        localStorage.setItem('bezdarTransactions', JSON.stringify(transactions));
        loadAdminData();
        showMessage(`✅ Вывод одобрен! Отправьте ${withdrawal.tonAmount} TON на кошелёк: ${withdrawal.wallet}`);
    }
}

function rejectWithdrawal(withdrawalId) {
    const withdrawal = transactions.withdrawals.find(w => w.id === withdrawalId);
    if (withdrawal) {
        withdrawal.status = 'rejected';
        
        // Возвращаем звёзды пользователю
        if (withdrawal.userId === userData.userId) {
            userData.balance += withdrawal.stars;
            saveAndUpdate();
        }
        
        localStorage.setItem('bezdarTransactions', JSON.stringify(transactions));
        loadAdminData();
        showMessage('❌ Вывод отклонен. Звёзды возвращены на баланс.');
    }
}

function addStarsToUser(userId) {
    const stars = prompt('Сколько звёзд добавить пользователю ' + userId + '?', '100');
    if (stars && !isNaN(stars)) {
        if (userId === userData.userId) {
            userData.balance += parseInt(stars);
            saveAndUpdate();
            showMessage(`✅ Добавлено ${stars} звёзд пользователю ${userId}`);
        }
        // Здесь можно добавить логику для других пользователей
    }
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

function closeModal() {
    document.getElementById('gameModal').style.display = 'none';
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
