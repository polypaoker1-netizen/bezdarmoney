import asyncio
import logging
import sqlite3
import json
import os
import hashlib
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

class UserStates(StatesGroup):
    activate_promo = State()

# ========== БАЗА ДАННЫХ ==========
def init_db():
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            balance INTEGER DEFAULT 0,
            total_deposited INTEGER DEFAULT 0,
            total_withdrawn INTEGER DEFAULT 0,
            is_banned BOOLEAN DEFAULT FALSE,
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
    
    conn.commit()
    conn.close()

init_db()

# ========== ФУНКЦИИ БАЗЫ ДАННЫХ ==========
def get_balance(user_id):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('SELECT balance FROM users WHERE user_id = ?', (user_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else 0

def get_user(user_id):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
    result = cursor.fetchone()
    conn.close()
    return result

def update_balance(user_id, amount, is_deposit=True):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    
    cursor.execute('INSERT OR IGNORE INTO users (user_id, balance) VALUES (?, 0)', (user_id,))
    
    if is_deposit:
        cursor.execute('UPDATE users SET balance = balance + ?, total_deposited = total_deposited + ? WHERE user_id = ?', 
                      (amount, amount, user_id))
    else:
        cursor.execute('UPDATE users SET balance = balance - ?, total_withdrawn = total_withdrawn + ? WHERE user_id = ?', 
                      (amount, amount, user_id))
    
    cursor.execute('SELECT balance FROM users WHERE user_id = ?', (user_id,))
    new_balance = cursor.fetchone()[0]
    
    conn.commit()
    conn.close()
    return new_balance

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
    
    cursor.execute('SELECT SUM(amount) FROM payments WHERE status = "completed"')
    total_deposits = cursor.fetchone()[0] or 0
    
    cursor.execute('SELECT SUM(amount) FROM withdrawals WHERE status = "completed"')
    total_withdrawals = cursor.fetchone()[0] or 0
    
    cursor.execute('SELECT COUNT(*) FROM withdrawals WHERE status = "pending"')
    pending_withdrawals = cursor.fetchone()[0]
    
    conn.close()
    return {
        'total_users': total_users,
        'total_balance': total_balance,
        'total_deposits': total_deposits,
        'total_withdrawals': total_withdrawals,
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
    
    # Проверяем промокод
    cursor.execute('SELECT amount, uses_left FROM promocodes WHERE code = ? AND datetime(expires_at) > datetime("now")', (code,))
    promo = cursor.fetchone()
    
    if not promo:
        conn.close()
        return None
    
    amount, uses_left = promo
    
    if uses_left <= 0:
        conn.close()
        return None
    
    # Проверяем, использовал ли уже пользователь этот промокод
    cursor.execute('SELECT id FROM promo_uses WHERE user_id = ? AND code = ?', (user_id, code))
    if cursor.fetchone():
        conn.close()
        return None
    
    # Обновляем промокод
    cursor.execute('UPDATE promocodes SET uses_left = uses_left - 1 WHERE code = ?', (code,))
    
    # Записываем использование
    cursor.execute('INSERT INTO promo_uses (user_id, code) VALUES (?, ?)', (user_id, code))
    
    # Начисляем баланс
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
    
    # Удаляем старые сессии пользователя
    cursor.execute('DELETE FROM api_sessions WHERE user_id = ?', (user_id,))
    
    # Создаем новую сессию
    session_token = hashlib.sha256(f"{user_id}{datetime.now()}{API_SECRET}".encode()).hexdigest()
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

def get_session_by_user(user_id):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('SELECT session_token FROM api_sessions WHERE user_id = ? AND datetime(expires_at) > datetime("now")', (user_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

# ========== КОМАНДА /start ==========
@dp.message(Command("start"))
async def cmd_start(message: Message):
    user_id = message.from_user.id
    username = message.from_user.username or "Без имени"
    
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)', (user_id, username))
    conn.commit()
    conn.close()
    
    balance = get_balance(user_id)
    # Создаем сессию для сайта
    session_token = get_session_by_user(user_id)
    if not session_token:
        session_token = create_api_session(user_id)
    
    # Генерируем ссылку на сайт с параметрами
    website_url_with_params = f"{WEBSITE_URL}?user_id={user_id}&session_token={session_token}"
    
    welcome_text = f"""
🎮 <b>Добро пожаловать в BezdarMoney Casino!</b>

💰 <b>Ваш баланс:</b> {balance} ⭐

📊 <b>Минимальные суммы:</b>
• Пополнение: от {MIN_DEPOSIT} ⭐
• Вывод: от {MIN_WITHDRAWAL} ⭐

✨ <b>Пополняйте баланс через Telegram Stars!</b>
    """
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💰 Пополнить баланс", callback_data="deposit_menu")],
        [InlineKeyboardButton(text="💸 Вывести средства", callback_data="withdraw")],
        [InlineKeyboardButton(text="🎮 Играть на сайте", url=website_url_with_params)],
        [InlineKeyboardButton(text="📞 Поддержка", url=f"https://t.me/{SUPPORT_USERNAME}")],
        [InlineKeyboardButton(text="🎁 Активировать промокод", callback_data="activate_promo")]
    ])
    
    await message.answer(welcome_text, reply_markup=keyboard)

@dp.callback_query(F.data == "activate_promo")
async def activate_promo_callback(callback: types.CallbackQuery):
    await callback.message.answer("✏️ <b>Введите промокод:</b>")
    await UserStates.activate_promo.set()
    await callback.answer()

@dp.message(UserStates.activate_promo)
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

# ========== КОМАНДА /play (для быстрого перехода на сайт) ==========
@dp.message(Command("play"))
async def cmd_play(message: Message):
    user_id = message.from_user.id
    session_token = get_session_by_user(user_id)
    
    if not session_token:
        session_token = create_api_session(user_id)
    
    website_url_with_params = f"{WEBSITE_URL}?user_id={user_id}&session_token={session_token}"
    
    play_text = f"""
🎮 <b>Играть на сайте BezdarMoney Casino</b>

Нажмите кнопку ниже, чтобы перейти на сайт и начать играть!

Ваш баланс будет автоматически синхронизирован.
    """
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🎮 Начать игру", url=website_url_with_params)]
    ])
    
    await message.answer(play_text, reply_markup=keyboard)

# ========== КОМАНДА /balance ==========
@dp.message(Command("balance"))
async def cmd_balance(message: Message):
    user_id = message.from_user.id
    balance = get_balance(user_id)
    
    balance_text = f"""
💰 <b>Ваш баланс:</b> {balance} ⭐

💳 <b>Минимальные суммы:</b>
• Пополнение: от {MIN_DEPOSIT} ⭐
• Вывод: от {MIN_WITHDRAWAL} ⭐

🎮 <b>Для игры:</b>
• Нажмите /play для перехода на сайт
• Или нажмите "Играть на сайте" в меню /start
    """
    
    await message.answer(balance_text)

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

# ========== АДМИН: УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==========
@dp.callback_query(F.data == "admin_users")
async def admin_users_menu(callback: types.CallbackQuery):
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🔨 Забанить пользователя", callback_data="admin_ban")],
        [InlineKeyboardButton(text="✅ Разбанить пользователя", callback_data="admin_unban")],
        [InlineKeyboardButton(text="📋 Список пользователей", callback_data="admin_list_users")],
        [InlineKeyboardButton(text="🔙 Назад в админку", callback_data="admin_back")]
    ])
    
    await callback.message.edit_text("👥 <b>Управление пользователями:</b>", reply_markup=keyboard)
    await callback.answer()

@dp.callback_query(F.data == "admin_ban")
async def admin_ban(callback: types.CallbackQuery):
    await callback.message.answer("Введите ID пользователя для бана:")
    await AdminStates.ban_user.set()
    await callback.answer()

@dp.message(AdminStates.ban_user)
async def process_ban(message: Message, state: FSMContext):
    try:
        user_id = int(message.text)
        user = get_user(user_id)
        
        if not user:
            await message.answer("❌ Пользователь не найден!")
            return
        
        ban_user(user_id)
        await message.answer(f"✅ Пользователь {user_id} забанен!")
        
        # Уведомляем пользователя
        try:
            await bot.send_message(user_id, "⛔ Ваш аккаунт был заблокирован администратором.")
        except:
            pass
        
    except ValueError:
        await message.answer("❌ Введите корректный ID пользователя!")
    finally:
        await state.clear()

@dp.callback_query(F.data == "admin_unban")
async def admin_unban(callback: types.CallbackQuery):
    await callback.message.answer("Введите ID пользователя для разбана:")
    await AdminStates.unban_user.set()
    await callback.answer()

@dp.message(AdminStates.unban_user)
async def process_unban(message: Message, state: FSMContext):
    try:
        user_id = int(message.text)
        user = get_user(user_id)
        
        if not user:
            await message.answer("❌ Пользователь не найден!")
            return
        
        unban_user(user_id)
        await message.answer(f"✅ Пользователь {user_id} разбанен!")
        
        # Уведомляем пользователя
        try:
            await bot.send_message(user_id, "✅ Ваш аккаунт разблокирован администратором.")
        except:
            pass
        
    except ValueError:
        await message.answer("❌ Введите корректный ID пользователя!")
    finally:
        await state.clear()

@dp.callback_query(F.data == "admin_list_users")
async def admin_list_users(callback: types.CallbackQuery):
    users = get_all_users()
    
    if not users:
        await callback.message.answer("📭 Пользователей нет!")
        return
    
    text = "📋 <b>Список пользователей:</b>\n\n"
    
    for user in users[:50]:  # Первые 50 пользователей
        user_id, username, balance, is_banned = user
        status = "🔴 БАН" if is_banned else "🟢 АКТИВЕН"
        text += f"👤 {username or 'Без имени'}\n"
        text += f"🆔 ID: {user_id}\n"
        text += f"💰 Баланс: {balance} ⭐\n"
        text += f"📊 Статус: {status}\n"
        text += "─" * 30 + "\n"
    
    if len(users) > 50:
        text += f"\n📊 ... и еще {len(users) - 50} пользователей"
    
    await callback.message.answer(text)
    await callback.answer()

# ========== АДМИН: УПРАВЛЕНИЕ БАЛАНСАМИ ==========
@dp.callback_query(F.data == "admin_balance")
async def admin_balance_menu(callback: types.CallbackQuery):
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="➕ Начислить баланс", callback_data="admin_add_balance")],
        [InlineKeyboardButton(text="➖ Снять баланс", callback_data="admin_remove_balance")],
        [InlineKeyboardButton(text="🔙 Назад в админку", callback_data="admin_back")]
    ])
    
    await callback.message.edit_text("💰 <b>Управление балансами:</b>", reply_markup=keyboard)
    await callback.answer()

@dp.callback_query(F.data == "admin_add_balance")
async def admin_add_balance(callback: types.CallbackQuery):
    await callback.message.answer("Введите данные в формате:\n<code>ID_пользователя СУММА</code>\n\nПример: <code>123456789 100</code>")
    await AdminStates.add_balance.set()
    await callback.answer()

@dp.message(AdminStates.add_balance)
async def process_add_balance(message: Message, state: FSMContext):
    try:
        parts = message.text.split()
        if len(parts) != 2:
            raise ValueError
        
        user_id = int(parts[0])
        amount = int(parts[1])
        
        user = get_user(user_id)
        if not user:
            await message.answer("❌ Пользователь не найден!")
            return
        
        new_balance = update_balance(user_id, amount, is_deposit=True)
        
        await message.answer(f"✅ Баланс начислен!\n\n👤 Пользователь: {user_id}\n💰 Начислено: {amount} ⭐\n🏦 Новый баланс: {new_balance} ⭐")
        
        # Уведомляем пользователя
        try:
            await bot.send_message(user_id, f"💰 Вам начислено {amount} ⭐!\n🏦 Новый баланс: {new_balance} ⭐")
        except:
            pass
        
    except ValueError:
        await message.answer("❌ Неверный формат! Используйте: <code>ID СУММА</code>")
    finally:
        await state.clear()

@dp.callback_query(F.data == "admin_remove_balance")
async def admin_remove_balance(callback: types.CallbackQuery):
    await callback.message.answer("Введите данные в формате:\n<code>ID_пользователя СУММА</code>\n\nПример: <code>123456789 100</code>")
    await AdminStates.remove_balance.set()
    await callback.answer()

@dp.message(AdminStates.remove_balance)
async def process_remove_balance(message: Message, state: FSMContext):
    try:
        parts = message.text.split()
        if len(parts) != 2:
            raise ValueError
        
        user_id = int(parts[0])
        amount = int(parts[1])
        
        user = get_user(user_id)
        if not user:
            await message.answer("❌ Пользователь не найден!")
            return
        
        balance = get_balance(user_id)
        if balance < amount:
            await message.answer(f"❌ У пользователя недостаточно средств!\n💰 Текущий баланс: {balance} ⭐")
            return
        
        new_balance = update_balance(user_id, amount, is_deposit=False)
        
        await message.answer(f"✅ Баланс снят!\n\n👤 Пользователь: {user_id}\n💰 Снято: {amount} ⭐\n🏦 Новый баланс: {new_balance} ⭐")
        
        # Уведомляем пользователя
        try:
            await bot.send_message(user_id, f"💰 С вашего баланса снято {amount} ⭐!\n🏦 Новый баланс: {new_balance} ⭐")
        except:
            pass
        
    except ValueError:
        await message.answer("❌ Неверный формат! Используйте: <code>ID СУММА</code>")
    finally:
        await state.clear()

# ========== АДМИН: РАССЫЛКА ==========
@dp.callback_query(F.data == "admin_broadcast")
async def admin_broadcast(callback: types.CallbackQuery):
    await callback.message.answer("Введите сообщение для рассылки всем пользователям:")
    await AdminStates.broadcast_message.set()
    await callback.answer()

@dp.message(AdminStates.broadcast_message)
async def process_broadcast(message: Message, state: FSMContext):
    users = get_all_users()
    total = len(users)
    success = 0
    failed = 0
    
    progress_msg = await message.answer(f"📢 Начинаю рассылку...\n👥 Всего пользователей: {total}")
    
    for user in users:
        user_id = user[0]
        try:
            await bot.send_message(user_id, f"📢 <b>Сообщение от администратора:</b>\n\n{message.text}")
            success += 1
            
            if success % 10 == 0:
                await progress_msg.edit_text(f"📢 Рассылка...\n✅ Отправлено: {success}/{total}")
                
            await asyncio.sleep(0.1)  # Задержка чтобы не попасть в лимиты
            
        except Exception as e:
            failed += 1
    
    await progress_msg.edit_text(f"✅ Рассылка завершена!\n\n📊 Результаты:\n✅ Успешно: {success}\n❌ Не отправлено: {failed}")
    await state.clear()

# ========== АДМИН: ПРОМОКОДЫ ==========
@dp.callback_query(F.data == "admin_create_promo")
async def admin_create_promo(callback: types.CallbackQuery):
    await callback.message.answer("Введите код промокода (только буквы и цифры):")
    await AdminStates.create_promo.set()
    await callback.answer()

@dp.message(AdminStates.create_promo)
async def process_promo_code(message: Message, state: FSMContext):
    promo_code = message.text.strip().upper()
    
    # Проверка формата
    if not promo_code.isalnum():
        await message.answer("❌ Код должен содержать только буквы и цифры!")
        return
    
    await state.update_data(promo_code=promo_code)
    await message.answer("Введите сумму промокода (в звездах):")
    await AdminStates.promo_amount.set()

@dp.message(AdminStates.promo_amount)
async def process_promo_amount(message: Message, state: FSMContext):
    try:
        amount = int(message.text)
        if amount <= 0:
            raise ValueError
        
        await state.update_data(amount=amount)
        await message.answer("Введите количество использований (макс. 1000):")
        await AdminStates.promo_uses.set()
        
    except ValueError:
        await message.answer("❌ Введите корректное число!")

@dp.message(AdminStates.promo_uses)
async def process_promo_uses(message: Message, state: FSMContext):
    try:
        max_uses = int(message.text)
        if max_uses <= 0 or max_uses > 1000:
            raise ValueError
        
        await state.update_data(max_uses=max_uses)
        await message.answer("Введите срок действия в днях (1-365):")
        await AdminStates.promo_expires.set()
        
    except ValueError:
        await message.answer("❌ Введите число от 1 до 1000!")

@dp.message(AdminStates.promo_expires)
async def process_promo_expires(message: Message, state: FSMContext):
    try:
        expires_days = int(message.text)
        if expires_days <= 0 or expires_days > 365:
            raise ValueError
        
        data = await state.get_data()
        promo_code = data['promo_code']
        amount = data['amount']
        max_uses = data['max_uses']
        
        create_promocode(promo_code, amount, max_uses, expires_days)
        
        await message.answer(
            f"✅ Промокод создан!\n\n"
            f"🎁 Код: <code>{promo_code}</code>\n"
            f"💰 Сумма: {amount} ⭐\n"
            f"🔢 Использований: {max_uses}\n"
            f"⏰ Срок: {expires_days} дней\n\n"
            f"📋 Для активации: /start → 🎁 Активировать промокод"
        )
        
    except ValueError:
        await message.answer("❌ Введите число от 1 до 365!")
    finally:
        await state.clear()

@dp.callback_query(F.data == "admin_list_promos")
async def admin_list_promos(callback: types.CallbackQuery):
    promos = get_promocodes()
    
    if not promos:
        await callback.message.answer("🎁 Промокодов нет!")
        return
    
    text = "📋 <b>Список промокодов:</b>\n\n"
    
    for promo in promos:
        code, amount, uses_left, max_uses, expires_at = promo
        expires_date = datetime.strptime(expires_at, '%Y-%m-%d %H:%M:%S')
        days_left = (expires_date - datetime.now()).days
        
        text += f"🎁 Код: <code>{code}</code>\n"
        text += f"💰 Сумма: {amount} ⭐\n"
        text += f"📊 Использовано: {max_uses - uses_left}/{max_uses}\n"
        text += f"⏰ Осталось дней: {max(0, days_left)}\n"
        text += "─" * 30 + "\n"
    
    await callback.message.answer(text)
    await callback.answer()

# ========== АДМИН: СТАТИСТИКА ==========
@dp.callback_query(F.data == "admin_stats")
async def admin_stats(callback: types.CallbackQuery):
    stats = get_stats()
    
    text = f"""
📊 <b>Полная статистика казино:</b>

👥 <b>Пользователи:</b>
• Всего пользователей: {stats['total_users']}
• Общий баланс: {stats['total_balance']} ⭐

💸 <b>Финансы:</b>
• Всего пополнений: {stats['total_deposits']} ⭐
• Всего выводов: {stats['total_withdrawals']} ⭐
• Ожидают вывода: {stats['pending_withdrawals']} заявок

⚡ <b>Средние показатели:</b>
• Средний депозит: {stats['total_deposits'] // max(1, stats['total_users'])} ⭐
• Средний баланс: {stats['total_balance'] // max(1, stats['total_users'])} ⭐
    """
    
    await callback.message.answer(text)
    await callback.answer()

# ========== АДМИН: НАЗАД ==========
@dp.callback_query(F.data == "admin_back")
async def admin_back(callback: types.CallbackQuery):
    await cmd_admin(callback.message)
    await callback.answer()

# ========== ПОПОЛНЕНИЕ БАЛАНСА ==========
@dp.callback_query(F.data == "deposit_menu")
async def deposit_menu(callback: types.CallbackQuery):
    menu_text = f"""
💰 <b>Пополнение баланса через Telegram Stars</b>

✨ <b>Минимальное пополнение:</b> {MIN_DEPOSIT} ⭐

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
        [InlineKeyboardButton(text="🔙 Назад", callback_data="back")]
    ])
    
    await callback.message.edit_text(menu_text, reply_markup=keyboard)
    await callback.answer()

@dp.callback_query(F.data.startswith("pay_"))
async def process_payment(callback: types.CallbackQuery):
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
async def withdraw_callback(callback: types.CallbackQuery):
    user_id = callback.from_user.id
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

# ========== КОМАНДА /help ==========
@dp.message(Command("help"))
async def cmd_help(message: Message):
    help_text = """
🎮 <b>BezdarMoney Casino - Помощь</b>

<b>Основные команды:</b>
/start - Главное меню
/play - Перейти на игровой сайт
/balance - Проверить баланс
/help - Эта справка

<b>Пополнение баланса:</b>
1. Нажмите "💰 Пополнить баланс"
2. Выберите сумму
3. Оплатите через Telegram Stars
4. Баланс обновится автоматически

<b>Вывод средств:</b>
1. Нажмите "💸 Вывести средства"
2. Введите сумму (от 300⭐)
3. Введите ваш Telegram username
4. Администратор свяжется с вами

<b>Игра на сайте:</b>
1. Нажмите "🎮 Играть на сайте"
2. Войдите с Telegram
3. Ваш баланс синхронизируется
4. Начните играть!

<b>Техподдержка:</b>
@{SUPPORT_USERNAME}
    """.format(SUPPORT_USERNAME=SUPPORT_USERNAME)
    
    await message.answer(help_text)

# ========== API ДЛЯ САЙТА ==========
async def api_get_balance(request):
    try:
        # Разрешаем CORS
        if request.method == 'OPTIONS':
            response = web.Response()
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
            return response
        
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
        
        response = web.json_response({
            'success': True,
            'balance': balance,
            'user_id': user_id,
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
        # Разрешаем CORS
        if request.method == 'OPTIONS':
            response = web.Response()
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
            return response
        
        data = await request.json()
        user_id = data.get('user_id')
        
        if not user_id:
            return web.json_response({'error': 'User ID required'}, status=400)
        
        user_id = int(user_id)
        session_token = create_api_session(user_id)
        balance = get_balance(user_id)
        
        response = web.json_response({
            'success': True,
            'session_token': session_token,
            'user_id': user_id,
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
        # Разрешаем CORS
        if request.method == 'OPTIONS':
            response = web.Response()
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
            return response
        
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
            new_balance = update_balance(user_id, abs(amount), is_deposit=True)
        else:
            new_balance = update_balance(user_id, abs(amount), is_deposit=False)
        
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
    
    # Ожидаем завершения веб-сервера (хотя это никогда не произойдет)
    await web_task

if __name__ == '__main__':
    asyncio.run(main())
