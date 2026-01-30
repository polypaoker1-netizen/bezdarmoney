import asyncio
import logging
import sqlite3
import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, Message, PreCheckoutQuery, LabeledPrice
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.context import FSMContext
from aiogram.fsm.storage.memory import MemoryStorage
from aiohttp import web

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========== КОНФИГУРАЦИЯ ==========
BOT_TOKEN = os.getenv('BOT_TOKEN', '7634324714:AAHnJR3SD0M47tPols4rirVsBpT3GJTQnZQ')
ADMIN_IDS = [int(id.strip()) for id in os.getenv('ADMIN_IDS', '8373042596,7804182255').split(',')]
WEBSITE_URL = os.getenv('WEBSITE_URL', 'https://polypaoker1-netizen.github.io/bezdarmoney')
SUPPORT_USERNAME = os.getenv('SUPPORT_USERNAME', 'TPBezdarCasino')
API_SECRET = os.getenv('API_SECRET', 'bezdar_casino_secret_2024')
PORT = int(os.getenv('PORT', '10000'))

# МИНИМАЛЬНЫЕ СУММЫ
MIN_DEPOSIT = 20
MIN_WITHDRAWAL = 300

# Инициализация бота
bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode="HTML"))
dp = Dispatcher(storage=MemoryStorage())

# ========== СОСТОЯНИЯ ==========
class RegisterStates(StatesGroup):
    waiting_password = State()
    waiting_password_confirm = State()

class LoginStates(StatesGroup):
    waiting_password = State()

class WithdrawStates(StatesGroup):
    waiting_amount = State()
    waiting_username = State()

class AdminStates(StatesGroup):
    ban_user = State()
    unban_user = State()
    add_balance = State()
    remove_balance = State()
    broadcast_message = State()
    create_promo = State()
    promo_amount = State()
    promo_uses = State()
    promo_expires = State()

# ========== БАЗА ДАННЫХ ==========
def init_db():
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    
    # Пользователи с паролями
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            password_hash TEXT,
            balance INTEGER DEFAULT 0,
            total_deposited INTEGER DEFAULT 0,
            total_withdrawn INTEGER DEFAULT 0,
            total_wagered INTEGER DEFAULT 0,
            total_won INTEGER DEFAULT 0,
            total_lost INTEGER DEFAULT 0,
            is_banned BOOLEAN DEFAULT FALSE,
            is_online BOOLEAN DEFAULT FALSE,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            amount INTEGER,
            telegram_payment_charge_id TEXT UNIQUE,
            status TEXT DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS withdrawals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            amount INTEGER,
            username TEXT,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS api_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            session_token TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS promocodes (
            code TEXT PRIMARY KEY,
            amount INTEGER,
            uses_left INTEGER,
            max_uses INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS promo_uses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            code TEXT,
            used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS game_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            game_type TEXT,
            bet_amount INTEGER,
            win_amount INTEGER,
            result TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    conn.commit()
    conn.close()

init_db()

# ========== ФУНКЦИИ БАЗЫ ДАННЫХ ==========
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(password, hashed):
    return hash_password(password) == hashed

def register_user(user_id, username, password):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    
    try:
        password_hash = hash_password(password)
        cursor.execute('''
            INSERT INTO users (user_id, username, password_hash, balance) 
            VALUES (?, ?, ?, 0)
        ''', (user_id, username, password_hash))
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def login_user(username, password):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT user_id, password_hash FROM users WHERE username = ?', (username,))
    result = cursor.fetchone()
    conn.close()
    
    if result and verify_password(password, result[1]):
        return result[0]  # Возвращаем user_id
    return None

def get_user_by_id(user_id):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
    result = cursor.fetchone()
    conn.close()
    return result

def get_user_by_username(username):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
    result = cursor.fetchone()
    conn.close()
    return result

def update_balance(user_id, amount, is_deposit=True, game_type=None, win_amount=0):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    
    if is_deposit:
        cursor.execute('UPDATE users SET balance = balance + ?, total_deposited = total_deposited + ? WHERE user_id = ?', 
                      (amount, amount, user_id))
    else:
        cursor.execute('UPDATE users SET balance = balance - ?, total_withdrawn = total_withdrawn + ? WHERE user_id = ?', 
                      (amount, amount, user_id))
    
    # Если это игра, обновляем статистику
    if game_type:
        if win_amount > 0:
            cursor.execute('UPDATE users SET total_won = total_won + ?, total_wagered = total_wagered + ? WHERE user_id = ?',
                          (win_amount, amount, user_id))
        else:
            cursor.execute('UPDATE users SET total_lost = total_lost + ?, total_wagered = total_wagered + ? WHERE user_id = ?',
                          (amount, amount, user_id))
    
    cursor.execute('SELECT balance FROM users WHERE user_id = ?', (user_id,))
    new_balance = cursor.fetchone()[0]
    
    conn.commit()
    conn.close()
    return new_balance

def get_balance(user_id):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('SELECT balance FROM users WHERE user_id = ?', (user_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else 0

def record_game_history(user_id, game_type, bet_amount, win_amount, result):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO game_history (user_id, game_type, bet_amount, win_amount, result)
        VALUES (?, ?, ?, ?, ?)
    ''', (user_id, game_type, bet_amount, win_amount, result))
    conn.commit()
    conn.close()

def ban_user(user_id):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET is_banned = TRUE WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()

def unban_user(user_id):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET is_banned = FALSE WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()

def get_all_users():
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('SELECT user_id, username, balance, is_banned FROM users ORDER BY created_at DESC')
    users = cursor.fetchall()
    conn.close()
    return users

def get_stats():
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT COUNT(*) FROM users')
    total_users = cursor.fetchone()[0]
    
    cursor.execute('SELECT SUM(balance) FROM users')
    total_balance = cursor.fetchone()[0] or 0
    
    cursor.execute('SELECT SUM(total_deposited) FROM users')
    total_deposits = cursor.fetchone()[0] or 0
    
    cursor.execute('SELECT SUM(total_withdrawn) FROM users')
    total_withdrawals = cursor.fetchone()[0] or 0
    
    cursor.execute('SELECT SUM(total_wagered) FROM users')
    total_wagered = cursor.fetchone()[0] or 0
    
    cursor.execute('SELECT COUNT(*) FROM withdrawals WHERE status = "pending"')
    pending_withdrawals = cursor.fetchone()[0]
    
    conn.close()
    return {
        'total_users': total_users,
        'total_balance': total_balance,
        'total_deposits': total_deposits,
        'total_withdrawals': total_withdrawals,
        'total_wagered': total_wagered,
        'pending_withdrawals': pending_withdrawals
    }

def create_promocode(code, amount, max_uses, expires_days):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    
    expires_at = (datetime.now() + timedelta(days=expires_days)).strftime('%Y-%m-%d %H:%M:%S')
    
    cursor.execute('''
        INSERT INTO promocodes (code, amount, uses_left, max_uses, expires_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (code, amount, max_uses, max_uses, expires_at))
    
    conn.commit()
    conn.close()

def use_promocode(user_id, code):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    
    cursor.execute('SELECT amount, uses_left FROM promocodes WHERE code = ? AND datetime(expires_at) > datetime("now")', (code,))
    promo = cursor.fetchone()
    
    if not promo:
        conn.close()
        return None
    
    amount, uses_left = promo
    
    if uses_left <= 0:
        conn.close()
        return None
    
    cursor.execute('SELECT id FROM promo_uses WHERE user_id = ? AND code = ?', (user_id, code))
    if cursor.fetchone():
        conn.close()
        return None
    
    cursor.execute('UPDATE promocodes SET uses_left = uses_left - 1 WHERE code = ?', (code,))
    cursor.execute('INSERT INTO promo_uses (user_id, code) VALUES (?, ?)', (user_id, code))
    cursor.execute('UPDATE users SET balance = balance + ? WHERE user_id = ?', (amount, user_id))
    
    conn.commit()
    conn.close()
    return amount

def get_promocodes():
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('SELECT code, amount, uses_left, max_uses, expires_at FROM promocodes ORDER BY created_at DESC')
    promos = cursor.fetchall()
    conn.close()
    return promos

def record_payment(user_id, amount, charge_id):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO payments (user_id, amount, telegram_payment_charge_id) VALUES (?, ?, ?)',
                  (user_id, amount, charge_id))
    conn.commit()
    conn.close()

def add_withdrawal(user_id, amount, username):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO withdrawals (user_id, amount, username) VALUES (?, ?, ?)',
                  (user_id, amount, username))
    withdrawal_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return withdrawal_id

def create_api_session(user_id):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM api_sessions WHERE user_id = ?', (user_id,))
    session_token = hashlib.sha256(f"{user_id}{datetime.now()}{secrets.token_hex(16)}".encode()).hexdigest()
    expires_at = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('INSERT INTO api_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)',
                  (user_id, session_token, expires_at))
    conn.commit()
    conn.close()
    return session_token

def verify_api_session(session_token):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('SELECT user_id FROM api_sessions WHERE session_token = ? AND datetime(expires_at) > datetime("now")', (session_token,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

# ========== СИСТЕМА АВТОРИЗАЦИИ ==========
user_sessions = {}  # user_id: {username: '', logged_in: False}

# ========== КОМАНДА /start ==========
@dp.message(Command("start"))
async def cmd_start(message: Message):
    user_id = message.from_user.id
    username = message.from_user.username or f"user_{user_id}"
    
    # Проверяем, зарегистрирован ли пользователь
    user_data = get_user_by_id(user_id)
    
    if not user_data:
        # Пользователь не зарегистрирован
        await message.answer(f"""
👋 <b>Добро пожаловать в BezdarMoney Casino!</b>

У вас еще нет аккаунта.
Выберите действие:
        """, reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="📝 Регистрация", callback_data="register")],
            [InlineKeyboardButton(text="🔐 Вход", callback_data="login")],
            [InlineKeyboardButton(text="ℹ️ О проекте", callback_data="about")]
        ]))
    else:
        # Пользователь уже зарегистрирован
        balance = get_balance(user_id)
        session_token = create_api_session(user_id)
        website_url_with_params = f"{WEBSITE_URL}?user_id={user_id}&session_token={session_token}"
        
        await message.answer(f"""
🎮 <b>Добро пожаловать назад!</b>

👤 <b>Ваш профиль:</b>
├ Имя: @{user_data[1]}
├ Баланс: {balance} ⭐
└ ID: {user_id}

<b>Выберите действие:</b>
        """, reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="💰 Пополнить баланс", callback_data="deposit_menu")],
            [InlineKeyboardButton(text="💸 Вывести средства", callback_data="withdraw")],
            [InlineKeyboardButton(text="🎮 Играть на сайте", url=website_url_with_params)],
            [InlineKeyboardButton(text="📊 Моя статистика", callback_data="my_stats")],
            [InlineKeyboardButton(text="🎁 Активировать промокод", callback_data="activate_promo")],
            [InlineKeyboardButton(text="📞 Поддержка", url=f"https://t.me/{SUPPORT_USERNAME}")]
        ]))

# ========== РЕГИСТРАЦИЯ ==========
@dp.callback_query(F.data == "register")
async def register_callback(callback: types.CallbackQuery, state: FSMContext):
    user_id = callback.from_user.id
    username = callback.from_user.username or f"user_{user_id}"
    
    # Проверяем, не зарегистрирован ли уже
    if get_user_by_id(user_id):
        await callback.message.answer("❌ Вы уже зарегистрированы!")
        await callback.answer()
        return
    
    await state.update_data(username=username)
    await callback.message.answer(
        "📝 <b>Регистрация аккаунта</b>\n\n"
        f"👤 Ваш Telegram username: @{username}\n\n"
        "🔐 <b>Придумайте надежный пароль:</b>\n"
        "(минимум 6 символов, буквы и цифры)"
    )
    await RegisterStates.waiting_password.set()
    await callback.answer()

@dp.message(RegisterStates.waiting_password)
async def process_password(message: Message, state: FSMContext):
    password = message.text.strip()
    
    if len(password) < 6:
        await message.answer("❌ Пароль должен содержать минимум 6 символов!\nВведите пароль снова:")
        return
    
    if not any(char.isdigit() for char in password):
        await message.answer("❌ Пароль должен содержать хотя бы одну цифру!\nВведите пароль снова:")
        return
    
    await state.update_data(password=password)
    await message.answer("🔐 <b>Повторите пароль для подтверждения:</b>")
    await RegisterStates.waiting_password_confirm.set()

@dp.message(RegisterStates.waiting_password_confirm)
async def process_password_confirm(message: Message, state: FSMContext):
    data = await state.get_data()
    password = data.get('password')
    confirm_password = message.text.strip()
    
    if password != confirm_password:
        await message.answer("❌ Пароли не совпадают!\nНачните регистрацию заново: /start")
        await state.clear()
        return
    
    username = data.get('username')
    user_id = message.from_user.id
    
    success = register_user(user_id, username, password)
    
    if success:
        # Дарим бонус за регистрацию
        update_balance(user_id, 50, is_deposit=True)
        
        await message.answer(f"""
✅ <b>Регистрация успешно завершена!</b>

👤 <b>Ваш аккаунт:</b>
├ Логин: @{username}
├ Пароль: {'•' * len(password)}
└ Бонус за регистрацию: 50 ⭐

🔐 <b>Ваши данные для входа:</b>
<b>Логин:</b> @{username}
<b>Пароль:</b> {password}

⚠️ <i>Сохраните эти данные!</i>

Теперь вы можете пополнить баланс и начать играть!
        """)
        
        # Создаем сессию для сайта
        session_token = create_api_session(user_id)
        website_url_with_params = f"{WEBSITE_URL}?user_id={user_id}&session_token={session_token}"
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="💰 Пополнить баланс", callback_data="deposit_menu")],
            [InlineKeyboardButton(text="🎮 Играть на сайте", url=website_url_with_params)]
        ])
        
        await message.answer("🎮 <b>Начните играть прямо сейчас!</b>", reply_markup=keyboard)
    else:
        await message.answer("❌ Ошибка регистрации! Возможно, такой username уже существует.")
    
    await state.clear()

# ========== ВХОД ==========
@dp.callback_query(F.data == "login")
async def login_callback(callback: types.CallbackQuery, state: FSMContext):
    await callback.message.answer(
        "🔐 <b>Вход в аккаунт</b>\n\n"
        "Введите ваш <b>Telegram username</b> (тот, который указывали при регистрации):\n"
        "<i>Пример: @username</i>"
    )
    await LoginStates.waiting_password.set()
    await callback.answer()

@dp.message(LoginStates.waiting_password)
async def process_login(message: Message, state: FSMContext):
    username = message.text.strip().replace('@', '')
    user_id = message.from_user.id
    
    # Проверяем существование пользователя
    user_data = get_user_by_username(username)
    
    if not user_data:
        await message.answer("❌ Пользователь не найден!\nПроверьте username или зарегистрируйтесь.")
        await state.clear()
        return
    
    await state.update_data(username=username)
    await message.answer(f"👤 Пользователь: @{username}\n\n🔐 <b>Введите пароль:</b>")

@dp.message()
async def process_login_password(message: Message, state: FSMContext):
    password = message.text.strip()
    data = await state.get_data()
    username = data.get('username')
    
    if not username:
        await message.answer("❌ Ошибка сессии. Начните заново: /start")
        await state.clear()
        return
    
    user_id = login_user(username, password)
    
    if user_id:
        # Обновляем user_id в базе (связываем с Telegram)
        conn = sqlite3.connect('bezdar_casino.db')
        cursor = conn.cursor()
        cursor.execute('UPDATE users SET user_id = ? WHERE username = ?', (message.from_user.id, username))
        conn.commit()
        conn.close()
        
        balance = get_balance(message.from_user.id)
        session_token = create_api_session(message.from_user.id)
        website_url_with_params = f"{WEBSITE_URL}?user_id={message.from_user.id}&session_token={session_token}"
        
        await message.answer(f"""
✅ <b>Вход выполнен успешно!</b>

👤 <b>Ваш профиль:</b>
├ Имя: @{username}
├ Баланс: {balance} ⭐
└ ID: {message.from_user.id}

<b>Выберите действие:</b>
        """, reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="💰 Пополнить баланс", callback_data="deposit_menu")],
            [InlineKeyboardButton(text="💸 Вывести средства", callback_data="withdraw")],
            [InlineKeyboardButton(text="🎮 Играть на сайте", url=website_url_with_params)],
            [InlineKeyboardButton(text="📊 Моя статистика", callback_data="my_stats")],
            [InlineKeyboardButton(text="🎁 Активировать промокод", callback_data="activate_promo")]
        ]))
    else:
        await message.answer("❌ Неверный пароль!\nПопробуйте снова или восстановите доступ через поддержку.")
    
    await state.clear()

# ========== КОМАНДА /profile ==========
@dp.message(Command("profile"))
async def cmd_profile(message: Message):
    user_id = message.from_user.id
    user_data = get_user_by_id(user_id)
    
    if not user_data:
        await message.answer("❌ У вас нет аккаунта!\nЗарегистрируйтесь: /start")
        return
    
    balance = get_balance(user_id)
    username = user_data[1]
    
    stats_text = f"""
📊 <b>Ваш профиль</b>

👤 <b>Основная информация:</b>
├ Имя: @{username}
├ Баланс: {balance} ⭐
└ ID: {user_id}

💰 <b>Финансовая статистика:</b>
├ Всего пополнено: {user_data[4]} ⭐
├ Всего выведено: {user_data[5]} ⭐
├ Поставлено всего: {user_data[6]} ⭐
├ Выиграно всего: {user_data[7]} ⭐
└ Проиграно всего: {user_data[8]} ⭐

🕐 <b>Дата регистрации:</b> {user_data[12]}
    """
    
    await message.answer(stats_text)

# ========== КОМАНДА /play ==========
@dp.message(Command("play"))
async def cmd_play(message: Message):
    user_id = message.from_user.id
    user_data = get_user_by_id(user_id)
    
    if not user_data:
        await message.answer("❌ У вас нет аккаунта!\nЗарегистрируйтесь: /start")
        return
    
    session_token = create_api_session(user_id)
    website_url_with_params = f"{WEBSITE_URL}?user_id={user_id}&session_token={session_token}"
    
    play_text = f"""
🎮 <b>Играть на сайте BezdarMoney Casino</b>

Нажмите кнопку ниже, чтобы перейти на сайт и начать играть!

Ваш баланс: {get_balance(user_id)} ⭐
Ваш баланс будет автоматически синхронизирован.
    """
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎮 Начать игру", url=website_url_with_params)]
    ])
    
    await message.answer(play_text, reply_markup=keyboard)

# ========== АДМИН КОМАНДА /admin ==========
@dp.message(Command("admin"))
async def cmd_admin(message: Message):
    user_id = message.from_user.id
    
    if user_id not in ADMIN_IDS:
        await message.answer("⛔ У вас нет доступа к админ-панели!")
        return
    
    stats = get_stats()
    
    admin_text = f"""
⚙️ <b>Админ-панель BezdarMoney Casino</b>

📊 <b>Статистика:</b>
👥 Всего пользователей: {stats['total_users']}
💰 Общий баланс: {stats['total_balance']} ⭐
📥 Всего пополнений: {stats['total_deposits']} ⭐
📤 Всего выводов: {stats['total_withdrawals']} ⭐
🎰 Всего поставлено: {stats['total_wagered']} ⭐
⏳ Ожидают вывода: {stats['pending_withdrawals']} заявок

<b>Выберите действие:</b>
    """
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="👥 Управление пользователями", callback_data="admin_users")],
        [InlineKeyboardButton(text="💰 Управление балансами", callback_data="admin_balance")],
        [InlineKeyboardButton(text="📢 Рассылка", callback_data="admin_broadcast")],
        [InlineKeyboardButton(text="🎁 Создать промокод", callback_data="admin_create_promo")],
        [InlineKeyboardButton(text="📊 Статистика", callback_data="admin_stats")],
        [InlineKeyboardButton(text="📋 Список промокодов", callback_data="admin_list_promos")]
    ])
    
    await message.answer(admin_text, reply_markup=keyboard)

# ========== АКТИВАЦИЯ ПРОМОКОДА ==========
@dp.callback_query(F.data == "activate_promo")
async def activate_promo_callback(callback: types.CallbackQuery):
    await callback.message.answer("✏️ <b>Введите промокод:</b>")
    await AdminStates.create_promo.set()
    await callback.answer()

@dp.message(AdminStates.create_promo)
async def process_promo(message: Message, state: FSMContext):
    promo_code = message.text.strip().upper()
    user_id = message.from_user.id
    
    result = use_promocode(user_id, promo_code)
    
    if result:
        new_balance = get_balance(user_id)
        await message.answer(
            f"✅ <b>Промокод активирован!</b>\n\n"
            f"💰 Начислено: {result} ⭐\n"
            f"🏦 Новый баланс: {new_balance} ⭐"
        )
    else:
        await message.answer("❌ <b>Промокод недействителен или уже использован!</b>")
    
    await state.clear()

# ========== МОЯ СТАТИСТИКА ==========
@dp.callback_query(F.data == "my_stats")
async def my_stats_callback(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    user_data = get_user_by_id(user_id)
    
    if not user_data:
        await callback.answer("❌ У вас нет аккаунта!")
        return
    
    balance = get_balance(user_id)
    
    # Рассчитываем проценты
    total_wagered = user_data[6] or 0
    total_won = user_data[7] or 0
    total_lost = user_data[8] or 0
    
    win_rate = (total_won / total_wagered * 100) if total_wagered > 0 else 0
    loss_rate = (total_lost / total_wagered * 100) if total_wagered > 0 else 0
    
    stats_text = f"""
📊 <b>Ваша игровая статистика</b>

💰 <b>Финансы:</b>
├ Текущий баланс: {balance} ⭐
├ Всего пополнено: {user_data[4]} ⭐
└ Всего выведено: {user_data[5]} ⭐

🎰 <b>Игровая статистика:</b>
├ Всего поставлено: {total_wagered} ⭐
├ Всего выиграно: {total_won} ⭐
├ Всего проиграно: {total_lost} ⭐
├ Процент выигрышей: {win_rate:.1f}%
└ Процент проигрышей: {loss_rate:.1f}%

📅 <b>Дата регистрации:</b> {user_data[12]}
    """
    
    await callback.message.answer(stats_text)
    await callback.answer()

# ========== ПОПОЛНЕНИЕ БАЛАНСА ==========
@dp.callback_query(F.data == "deposit_menu")
async def deposit_menu(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    user_data = get_user_by_id(user_id)
    
    if not user_data:
        await callback.message.answer("❌ У вас нет аккаунта!\nЗарегистрируйтесь: /start")
        await callback.answer()
        return
    
    menu_text = f"""
💰 <b>Пополнение баланса через Telegram Stars</b>

✨ <b>Минимальное пополнение:</b> {MIN_DEPOSIT} ⭐
💰 <b>Ваш баланс:</b> {get_balance(user_id)} ⭐

Выберите сумму пополнения:
• {MIN_DEPOSIT} ⭐ (минимальная сумма)
• 100 ⭐
• 250 ⭐  
• 500 ⭐
• 1000 ⭐

💎 <b>После оплаты баланс обновится автоматически!</b>
"""
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=f"⭐ {MIN_DEPOSIT} звёзд", callback_data=f"pay_{MIN_DEPOSIT}"),
         InlineKeyboardButton(text="⭐ 100 звёзд", callback_data="pay_100")],
        [InlineKeyboardButton(text="⭐ 250 звёзд", callback_data="pay_250"),
         InlineKeyboardButton(text="⭐ 500 звёзд", callback_data="pay_500")],
        [InlineKeyboardButton(text="⭐ 1000 звёзд", callback_data="pay_1000")],
        [InlineKeyboardButton(text="🔙 Назад", callback_data="back_to_menu")]
    ])
    
    await callback.message.edit_text(menu_text, reply_markup=keyboard)
    await callback.answer()

@dp.callback_query(F.data.startswith("pay_"))
async def process_payment(callback: types.CallbackQuery):
    user_id = callback.from_user.id
    user_data = get_user_by_id(user_id)
    
    if not user_data:
        await callback.message.answer("❌ У вас нет аккаунта!")
        await callback.answer()
        return
    
    amount = int(callback.data.split("_")[1])
    
    if amount < MIN_DEPOSIT:
        await callback.message.answer(f"❌ Минимальная сумма пополнения: {MIN_DEPOSIT}⭐")
        await callback.answer()
        return
    
    builder = InlineKeyboardBuilder()
    builder.button(text=f"Оплатить {amount} ⭐", pay=True)
    pay_keyboard = builder.as_markup()
    
    prices = [LabeledPrice(label="Пополнение BezdarMoney Casino", amount=amount)]
    
    await callback.message.answer_invoice(
        title=f"Пополнение баланса в BezdarMoney Casino",
        description=f"Пополнение на {amount} ⭐ для игры на сайте",
        prices=prices,
        provider_token="",
        payload=f"deposit_{amount}_{callback.from_user.id}",
        currency="XTR",
        reply_markup=pay_keyboard,
    )
    await callback.answer()

@dp.pre_checkout_query()
async def pre_checkout_handler(pre_checkout_q: PreCheckoutQuery):
    await bot.answer_pre_checkout_query(pre_checkout_q.id, ok=True)

@dp.message(F.successful_payment)
async def successful_payment(message: Message):
    user_id = message.from_user.id
    amount = message.successful_payment.total_amount
    
    new_balance = update_balance(user_id, amount, is_deposit=True)
    record_payment(user_id, amount, message.successful_payment.telegram_payment_charge_id)
    
    # Создаем новую сессию для сайта после пополнения
    session_token = create_api_session(user_id)
    website_url_with_params = f"{WEBSITE_URL}?user_id={user_id}&session_token={session_token}"
    
    success_text = f"""
✅ <b>Оплата успешно принята!</b>

💰 <b>Зачислено:</b> {amount} ⭐
🏦 <b>Новый баланс:</b> {new_balance} ⭐

🎮 <b>Можете начинать играть!</b>
Нажмите кнопку ниже для перехода на игровой сайт:
    """
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎮 Играть на сайте", url=website_url_with_params)]
    ])
    
    await message.answer(success_text, reply_markup=keyboard)
    
    # Уведомление админам
    for admin_id in ADMIN_IDS:
        try:
            await bot.send_message(
                admin_id,
                f"💰 <b>НОВОЕ ПОПОЛНЕНИЕ</b>\n\n"
                f"👤 Пользователь: @{message.from_user.username or 'нет username'}\n"
                f"🆔 ID: {user_id}\n"
                f"💎 Сумма: {amount}⭐\n"
                f"🏦 Новый баланс: {new_balance}⭐\n"
                f"📋 ID платежа: {message.successful_payment.telegram_payment_charge_id}"
            )
        except:
            pass

# ========== ВЫВОД СРЕДСТВ ==========
@dp.callback_query(F.data == "withdraw")
async def withdraw_callback(callback: types.CallbackQuery, state: FSMContext):
    user_id = callback.from_user.id
    user_data = get_user_by_id(user_id)
    
    if not user_data:
        await callback.message.answer("❌ У вас нет аккаунта!")
        await callback.answer()
        return
    
    balance = get_balance(user_id)
    
    if balance < MIN_WITHDRAWAL:
        await callback.message.answer(
            f"❌ <b>Недостаточно средств для вывода!</b>\n\n"
            f"💰 Ваш баланс: {balance} ⭐\n"
            f"📊 Минимальный вывод: {MIN_WITHDRAWAL} ⭐\n\n"
            f"Пополните баланс или выиграйте больше!"
        )
        await callback.answer()
        return
    
    await callback.message.answer(
        f"💸 <b>Вывод средств</b>\n\n"
        f"💰 <b>Ваш баланс:</b> {balance} ⭐\n"
        f"📋 <b>Минимальная сумма вывода:</b> {MIN_WITHDRAWAL} ⭐\n\n"
        f"Введите сумму для вывода:"
    )
    await WithdrawStates.waiting_amount.set()
    await callback.answer()

@dp.message(WithdrawStates.waiting_amount)
async def withdraw_amount_handler(message: Message, state: FSMContext):
    try:
        amount = int(message.text)
        
        if amount < MIN_WITHDRAWAL:
            await message.answer(f"❌ Минимальная сумма вывода: {MIN_WITHDRAWAL}⭐\nВведите сумму снова:")
            return
        
        if amount > get_balance(message.from_user.id):
            await message.answer("❌ Недостаточно средств на балансе!\nВведите сумму снова:")
            return
        
        await state.update_data(amount=amount)
        await message.answer(
            f"✅ Сумма {amount}⭐ подтверждена!\n\n"
            f"Теперь введите ваш <b>Telegram username</b> (например, @username):\n"
            f"<i>Это необходимо для отправки вам средств</i>"
        )
        await WithdrawStates.waiting_username.set()
    except ValueError:
        await message.answer("❌ Пожалуйста, введите корректное число!\nВведите сумму:")

@dp.message(WithdrawStates.waiting_username)
async def withdraw_username_handler(message: Message, state: FSMContext):
    username = message.text.strip()
    
    if not username.startswith('@'):
        await message.answer("❌ Username должен начинаться с @\nВведите username снова:")
        return
    
    data = await state.get_data()
    amount = data['amount']
    user_id = message.from_user.id
    
    withdrawal_id = add_withdrawal(user_id, amount, username)
    new_balance = update_balance(user_id, amount, is_deposit=False)
    
    success_text = f"""
✅ <b>Заявка на вывод создана!</b>

📋 <b>Детали заявки:</b>
💰 Сумма: {amount} ⭐
👤 Username: {username}
🆔 Номер заявки: #{withdrawal_id}

🏦 <b>Ваш баланс:</b> {new_balance} ⭐

⏳ <b>Заявка будет обработана в течение 24 часов.</b>
📞 Администратор свяжется с вами в Telegram.

<i>Спасибо за игру! 🎮</i>
    """
    
    await message.answer(success_text)
    await state.clear()
    
    # Уведомление админам
    for admin_id in ADMIN_IDS:
        try:
            await bot.send_message(
                admin_id,
                f"📤 <b>НОВАЯ ЗАЯВКА НА ВЫВОД</b>\n\n"
                f"🆔 Заявка: #{withdrawal_id}\n"
                f"👤 Пользователь: @{message.from_user.username or 'нет username'}\n"
                f"🆔 ID: {user_id}\n"
                f"💎 Сумма: {amount}⭐\n"
                f"📱 Username: {username}\n"
                f"🏦 Остаток баланса: {new_balance}⭐\n\n"
                f"⏰ Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
            )
        except:
            pass

# ========== API ДЛЯ САЙТА ==========
async def api_get_balance(request):
    try:
        data = await request.json()
        user_id = data.get('user_id')
        session_token = data.get('session_token')
        
        logger.info(f"API Balance request: user_id={user_id}, session_token={session_token}")
        
        if not user_id or not session_token:
            return web.json_response({'error': 'Missing parameters'}, status=400)
        
        user_id = int(user_id)
        verified_user_id = verify_api_session(session_token)
        
        if verified_user_id != user_id:
            logger.warning(f"Invalid session for user {user_id}")
            return web.json_response({'error': 'Invalid session'}, status=401)
        
        balance = get_balance(user_id)
        user_data = get_user_by_id(user_id)
        
        response = web.json_response({
            'success': True,
            'balance': balance,
            'user_id': user_id,
            'username': user_data[1] if user_data else '',
            'min_deposit': MIN_DEPOSIT,
            'min_withdrawal': MIN_WITHDRAWAL
        })
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
        
    except Exception as e:
        logger.error(f"API error: {e}")
        response = web.json_response({'error': str(e)}, status=500)
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

async def api_create_session(request):
    try:
        data = await request.json()
        user_id = data.get('user_id')
        
        if not user_id:
            return web.json_response({'error': 'User ID required'}, status=400)
        
        user_id = int(user_id)
        session_token = create_api_session(user_id)
        balance = get_balance(user_id)
        user_data = get_user_by_id(user_id)
        
        response = web.json_response({
            'success': True,
            'session_token': session_token,
            'user_id': user_id,
            'username': user_data[1] if user_data else '',
            'balance': balance,
            'min_deposit': MIN_DEPOSIT,
            'min_withdrawal': MIN_WITHDRAWAL
        })
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
    except Exception as e:
        logger.error(f"API session error: {e}")
        response = web.json_response({'error': str(e)}, status=500)
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

async def api_webhook(request):
    try:
        data = await request.json()
        secret = data.get('secret')
        user_id = data.get('user_id')
        amount = data.get('amount')
        game_type = data.get('game_type', 'unknown')
        win = data.get('win', True)
        
        logger.info(f"Webhook: user={user_id}, amount={amount}, game={game_type}, win={win}")
        
        if secret != API_SECRET:
            logger.warning(f"Invalid secret from webhook")
            return web.json_response({'error': 'Invalid secret'}, status=403)
        
        if not all([user_id, amount]):
            return web.json_response({'error': 'Missing parameters'}, status=400)
        
        user_id = int(user_id)
        amount = int(amount)
        
        # Если выигрыш - добавляем баланс, если проигрыш - вычитаем
        if win:
            new_balance = update_balance(user_id, abs(amount), is_deposit=True, game_type=game_type, win_amount=abs(amount))
            record_game_history(user_id, game_type, abs(amount), abs(amount), 'win')
        else:
            new_balance = update_balance(user_id, abs(amount), is_deposit=False, game_type=game_type)
            record_game_history(user_id, game_type, abs(amount), 0, 'loss')
        
        response = web.json_response({
            'success': True,
            'new_balance': new_balance,
            'user_id': user_id
        })
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        response = web.json_response({'error': str(e)}, status=500)
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

async def health_check(request):
    response = web.json_response({
        'status': 'ok', 
        'service': 'bezdar-money-bot',
        'min_deposit': MIN_DEPOSIT,
        'min_withdrawal': MIN_WITHDRAWAL,
        'timestamp': datetime.now().isoformat()
    })
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

# ========== НАСТРОЙКА ВЕБ-СЕРВЕРА ==========
app = web.Application()

app.router.add_get('/health', health_check)
app.router.add_post('/api/balance', api_get_balance)
app.router.add_post('/api/session', api_create_session)
app.router.add_post('/api/webhook', api_webhook)

# ========== ЗАПУСК ==========
async def start_web_server():
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', PORT)
    await site.start()
    logger.info(f"✅ Веб-сервер запущен на порту {PORT}")
    logger.info(f"🌐 API доступно по адресу: http://0.0.0.0:{PORT}")

async def main():
    logger.info("🚀 Запуск BezdarMoney Bot...")
    logger.info(f"📊 Минимальные суммы: пополнение={MIN_DEPOSIT}⭐, вывод={MIN_WITHDRAWAL}⭐")
    logger.info(f"🌐 Сайт: {WEBSITE_URL}")
    logger.info(f"👑 Админы: {ADMIN_IDS}")
    
    # Запускаем веб-сервер в фоне
    web_task = asyncio.create_task(start_web_server())
    
    logger.info("🤖 Запуск Telegram бота...")
    await dp.start_polling(bot)
    
    # Ожидаем завершения веб-сервера
    await web_task

if __name__ == '__main__':
    asyncio.run(main())
