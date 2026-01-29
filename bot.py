import asyncio
import logging
import sqlite3
import json
import os
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
import hashlib

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
MIN_DEPOSIT = 20      # Минимальное пополнение
MIN_WITHDRAWAL = 300  # Минимальный вывод

# Инициализация бота
bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode="HTML"))
dp = Dispatcher(storage=MemoryStorage())

# ========== СОСТОЯНИЯ ==========
class WithdrawStates(StatesGroup):
    waiting_amount = State()
    waiting_username = State()

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

def update_balance(user_id, amount, is_deposit=True):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    
    # Создаем пользователя если его нет
    cursor.execute('INSERT OR IGNORE INTO users (user_id, balance) VALUES (?, 0)', (user_id,))
    
    # Обновляем баланс
    if is_deposit:
        cursor.execute('UPDATE users SET balance = balance + ?, total_deposited = total_deposited + ? WHERE user_id = ?', 
                      (amount, amount, user_id))
    else:
        cursor.execute('UPDATE users SET balance = balance - ?, total_withdrawn = total_withdrawn + ? WHERE user_id = ?', 
                      (amount, amount, user_id))
    
    # Получаем новый баланс
    cursor.execute('SELECT balance FROM users WHERE user_id = ?', (user_id,))
    new_balance = cursor.fetchone()[0]
    
    conn.commit()
    conn.close()
    return new_balance

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
    
    # Удаляем старые сессии
    cursor.execute('DELETE FROM api_sessions WHERE user_id = ?', (user_id,))
    
    # Создаем новую сессию
    session_token = hashlib.sha256(f"{user_id}{datetime.now()}{API_SECRET}".encode()).hexdigest()
    expires_at = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
    
    cursor.execute('''
        INSERT INTO api_sessions (user_id, session_token, expires_at)
        VALUES (?, ?, ?)
    ''', (user_id, session_token, expires_at))
    
    conn.commit()
    conn.close()
    return session_token

def verify_api_session(session_token):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT user_id FROM api_sessions 
        WHERE session_token = ? 
        AND datetime(expires_at) > datetime('now')
    ''', (session_token,))
    
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

# ========== КОМАНДА /start ==========
@dp.message(Command("start"))
async def cmd_start(message: Message):
    user_id = message.from_user.id
    username = message.from_user.username or "Без имени"
    
    # Создаем пользователя если его нет
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('INSERT OR IGNORE INTO users (user_id, username) VALUES (?, ?)', (user_id, username))
    conn.commit()
    conn.close()
    
    balance = get_balance(user_id)
    
    welcome_text = f"""
🎮 <b>Добро пожаловать в BezdarMoney Casino!</b>

💰 <b>Ваш баланс:</b> {balance} ⭐

📊 <b>Минимальные суммы:</b>
• Пополнение: от {MIN_DEPOSIT} ⭐
• Вывод: от {MIN_WITHDRAWAL} ⭐

✨ <b>Пополняйте баланс через Telegram Stars!</b>
🎮 <b>Играйте на сайте:</b> {WEBSITE_URL}
    """
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💰 Пополнить баланс", callback_data="deposit_menu")],
        [InlineKeyboardButton(text="💸 Вывести средства", callback_data="withdraw")],
        [InlineKeyboardButton(text="🎮 Играть на сайте", url=WEBSITE_URL)],
        [InlineKeyboardButton(text="📞 Поддержка", url=f"https://t.me/{SUPPORT_USERNAME}")]
    ])
    
    await message.answer(welcome_text, reply_markup=keyboard)

# ========== ПОПОЛНЕНИЕ ЧЕРЕЗ TELEGRAM STARS ==========
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
    
    # Проверка минимальной суммы
    if amount < MIN_DEPOSIT:
        await callback.message.answer(f"❌ Минимальная сумма пополнения: {MIN_DEPOSIT}⭐")
        await callback.answer()
        return
    
    # Создаем кнопку для оплаты
    builder = InlineKeyboardBuilder()
    builder.button(text=f"Оплатить {amount} ⭐", pay=True)
    pay_keyboard = builder.as_markup()
    
    # Выставляем счет
    prices = [LabeledPrice(label="XTR", amount=amount)]
    
    await callback.message.answer_invoice(
        title=f"Пополнение баланса в BezdarMoney Casino",
        description=f"Пополнение на {amount} ⭐ для игры на сайте",
        prices=prices,
        provider_token="",  # Пустая строка для Telegram Stars
        payload=f"deposit_{amount}_{callback.from_user.id}",
        currency="XTR",
        reply_markup=pay_keyboard,
    )
    await callback.answer()

# ========== ПРЕДВАРИТЕЛЬНАЯ ПРОВЕРКА ==========
@dp.pre_checkout_query()
async def pre_checkout_handler(pre_checkout_q: PreCheckoutQuery):
    # Всегда подтверждаем платеж
    await bot.answer_pre_checkout_query(pre_checkout_q.id, ok=True)

# ========== УСПЕШНЫЙ ПЛАТЕЖ ==========
@dp.message(F.successful_payment)
async def successful_payment(message: Message):
    user_id = message.from_user.id
    amount = message.successful_payment.total_amount  # Уже в звездах
    
    # Зачисляем средства
    new_balance = update_balance(user_id, amount, is_deposit=True)
    record_payment(user_id, amount, message.successful_payment.telegram_payment_charge_id)
    
    # Создаем сессию для API сайта
    session_token = create_api_session(user_id)
    
    success_text = f"""
✅ <b>Оплата успешно принята!</b>

💰 <b>Зачислено:</b> {amount} ⭐
🏦 <b>Новый баланс:</b> {new_balance} ⭐

🔗 <b>Для игры на сайте:</b>
1. Перейдите по ссылке: {WEBSITE_URL}
2. Баланс уже синхронизирован!

🎮 <b>Удачной игры!</b>
    """
    
    await message.answer(success_text)
    
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
    
    # Создаем заявку на вывод
    withdrawal_id = add_withdrawal(user_id, amount, username)
    
    # Списываем средства
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
    
    # Уведомляем админов
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

# ========== КОМАНДА /paysupport (без возврата) ==========
@dp.message(Command("paysupport"))
async def pay_support_handler(message: Message):
    support_text = """
ℹ️ <b>Информация о платежах</b>

🔹 <b>Пополнение баланса:</b>
• Минимальная сумма: 20 ⭐
• Оплата через Telegram Stars
• Баланс зачисляется автоматически

🔹 <b>Вывод средств:</b>
• Минимальная сумма: 300 ⭐
• Обработка в течение 24 часов
• Вывод на Telegram username

🔹 <b>Техническая поддержка:</b>
@{SUPPORT_USERNAME}
    """.format(SUPPORT_USERNAME=SUPPORT_USERNAME)
    
    await message.answer(support_text)

# ========== API ДЛЯ САЙТА ==========
async def api_get_balance(request):
    try:
        data = await request.json()
        user_id = data.get('user_id')
        session_token = data.get('session_token')
        
        if not session_token or verify_api_session(session_token) != user_id:
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
        return web.json_response({'error': str(e)}, status=500)

async def api_create_session(request):
    try:
        data = await request.json()
        user_id = data.get('user_id')
        
        if not user_id:
            return web.json_response({'error': 'User ID required'}, status=400)
        
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
        return web.json_response({'error': str(e)}, status=500)

async def webhook_update(request):
    try:
        data = await request.json()
        secret = data.get('secret')
        
        if secret != API_SECRET:
            return web.json_response({'error': 'Invalid secret'}, status=403)
        
        user_id = data.get('user_id')
        amount = data.get('amount')
        
        if not all([user_id, amount]):
            return web.json_response({'error': 'Missing parameters'}, status=400)
        
        new_balance = update_balance(user_id, amount, is_deposit=True)
        
        response = web.json_response({
            'success': True,
            'new_balance': new_balance,
            'user_id': user_id
        })
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return web.json_response({'error': str(e)}, status=500)

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

# CORS middleware
@web.middleware
async def cors_middleware(request, handler):
    if request.method == 'OPTIONS':
        response = web.Response()
    else:
        response = await handler(request)
    
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return response

app.middlewares.append(cors_middleware)

# Маршруты
app.router.add_get('/health', health_check)
app.router.add_post('/api/balance', api_get_balance)
app.router.add_post('/api/session', api_create_session)
app.router.add_post('/api/webhook', webhook_update)

# ========== ЗАПУСК ==========
async def start_web_server():
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', PORT)
    await site.start()
    logger.info(f"✅ Веб-сервер запущен на порту {PORT}")

async def main():
    logger.info("🚀 Запуск BezdarMoney Bot...")
    logger.info(f"📊 Минимальные суммы: пополнение={MIN_DEPOSIT}⭐, вывод={MIN_WITHDRAWAL}⭐")
    
    # Запускаем веб-сервер в фоне
    web_task = asyncio.create_task(start_web_server())
    
    # Запускаем бота
    logger.info("🤖 Запуск Telegram бота...")
    await dp.start_polling(bot)
    
    await web_task

if __name__ == '__main__':
    asyncio.run(main())
