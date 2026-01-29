import asyncio
import logging
import sqlite3
import json
import os
from datetime import datetime, timedelta
from aiogram import Bot, Dispatcher, types, F
from aiogram.filters import Command
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, Message
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.context import FSMContext
from aiogram.fsm.storage.memory import MemoryStorage
from aiohttp import web
import aiohttp_cors
import hashlib

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ========== КОНФИГУРАЦИЯ ИЗ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ ==========
BOT_TOKEN = os.getenv('BOT_TOKEN', '7634324714:AAHnJR3SD0M47tPols4rirVsBpT3GJTQnZQ')
ADMIN_IDS = [int(id.strip()) for id in os.getenv('ADMIN_IDS', '8373042596,7804182255').split(',')]
WEBSITE_URL = os.getenv('WEBSITE_URL', 'https://polypaoker1-netizen.github.io/bezdarmoney')
SUPPORT_USERNAME = os.getenv('SUPPORT_USERNAME', 'TPBezdarCasino')
API_SECRET = os.getenv('API_SECRET', 'bezdar_casino_secret_2024')
PORT = int(os.getenv('PORT', '10000'))

# Инициализация бота
bot = Bot(token=BOT_TOKEN, default=DefaultBotProperties(parse_mode="HTML"))
dp = Dispatcher(storage=MemoryStorage())

# ========== БАЗА ДАННЫХ ==========
def init_db():
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    
    # Таблица пользователей
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY,
            username TEXT,
            balance INTEGER DEFAULT 0,
            web_user_id TEXT,
            is_banned BOOLEAN DEFAULT FALSE,
            last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Таблица для API сессий
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

def update_balance(user_id, amount):
    conn = sqlite3.connect('bezdar_casino.db')
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET balance = balance + ? WHERE user_id = ?', (amount, user_id))
    conn.commit()
    conn.close()
    return get_balance(user_id)

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
        SELECT user_id, expires_at FROM api_sessions 
        WHERE session_token = ? 
        AND datetime(expires_at) > datetime('now')
    ''', (session_token,))
    
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

# ========== КОМАНДЫ БОТА ==========
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

🎮 <b>Для игры перейдите на сайт:</b>
{WEBSITE_URL}

🎁 <b>Как начать играть:</b>
1. Пополните баланс через бота
2. Нажмите кнопку "🎮 Играть на сайте" ниже
3. Баланс автоматически синхронизируется!
    """
    
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="💰 Пополнить баланс", callback_data="deposit")],
        [InlineKeyboardButton(text="🎮 Играть на сайте", url=WEBSITE_URL)],
        [InlineKeyboardButton(text="📞 Поддержка", url=f"https://t.me/{SUPPORT_USERNAME}")]
    ])
    
    await message.answer(welcome_text, reply_markup=keyboard)

# ========== API МАРШРУТЫ ==========
async def api_get_balance(request):
    try:
        data = await request.json()
        user_id = data.get('user_id')
        session_token = data.get('session_token')
        
        if not session_token or verify_api_session(session_token) != user_id:
            return web.json_response({'error': 'Invalid session'}, status=401)
        
        balance = get_balance(user_id)
        
        return web.json_response({
            'success': True,
            'balance': balance,
            'user_id': user_id
        })
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
        
        return web.json_response({
            'success': True,
            'session_token': session_token,
            'user_id': user_id,
            'balance': balance
        })
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
        
        new_balance = update_balance(user_id, amount)
        
        return web.json_response({
            'success': True,
            'new_balance': new_balance,
            'user_id': user_id
        })
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return web.json_response({'error': str(e)}, status=500)

async def health_check(request):
    return web.json_response({'status': 'ok', 'service': 'bezdar-money-bot'})

# ========== НАСТРОЙКА ВЕБ-СЕРВЕРА ==========
app = web.Application()

# Настраиваем CORS
cors = aiohttp_cors.setup(app, defaults={
    "*": aiohttp_cors.ResourceOptions(
        allow_credentials=True,
        expose_headers="*",
        allow_headers="*",
        allow_methods="*"
    )
})

# Добавляем маршруты
app.router.add_get('/health', health_check)
app.router.add_post('/api/balance', api_get_balance)
app.router.add_post('/api/session', api_create_session)
app.router.add_post('/api/webhook', webhook_update)

# Настраиваем CORS для всех маршрутов
for route in list(app.router.routes()):
    cors.add(route)

# ========== ЗАПУСК ==========
async def start_bot():
    logger.info(f"🚀 Запуск BezdarMoney Bot на порту {PORT}")
    
    # Запускаем веб-сервер
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', PORT)
    await site.start()
    
    logger.info(f"✅ Веб-сервер запущен")
    logger.info(f"🌐 API готов к работе")
    
    # Запускаем бота
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(start_bot())
