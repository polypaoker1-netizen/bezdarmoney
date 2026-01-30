import requests
import json
import sqlite3
import os
import time
from datetime import datetime
from dotenv import load_dotenv

# Загрузка настроек
load_dotenv()

BOT_TOKEN = os.getenv('BOT_TOKEN')
ADMINS = list(map(int, os.getenv('ADMINS', '').split(',')))
SITE_URL = os.getenv('SITE_URL', 'https://polypaoker1-netizen.github.io/bezdarmoney/')
API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}/"

# База данных
class Database:
    def __init__(self):
        self.conn = sqlite3.connect('stars.db', check_same_thread=False)
        self.cursor = self.conn.cursor()
        self.init_db()
    
    def init_db(self):
        # Пользователи
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                stars INTEGER DEFAULT 0,
                total_deposited INTEGER DEFAULT 0,
                total_withdrawn INTEGER DEFAULT 0,
                reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Транзакции
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT,
                stars INTEGER,
                description TEXT,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Выводы
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS withdrawals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                stars INTEGER,
                status TEXT DEFAULT 'pending',
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        self.conn.commit()
    
    def add_user(self, user_id, username, first_name, last_name):
        self.cursor.execute('''
            INSERT OR IGNORE INTO users (user_id, username, first_name, last_name)
            VALUES (?, ?, ?, ?)
        ''', (user_id, username, first_name, last_name))
        self.conn.commit()
    
    def get_user(self, user_id):
        self.cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        user = self.cursor.fetchone()
        if user:
            return {
                'id': user[0],
                'username': user[1],
                'first_name': user[2],
                'last_name': user[3],
                'stars': user[4],
                'total_deposited': user[5],
                'total_withdrawn': user[6],
                'reg_date': user[7]
            }
        return None
    
    def update_stars(self, user_id, stars):
        self.cursor.execute('UPDATE users SET stars = stars + ? WHERE user_id = ?', (stars, user_id))
        if stars > 0:
            self.cursor.execute('UPDATE users SET total_deposited = total_deposited + ? WHERE user_id = ?', (stars, user_id))
        else:
            self.cursor.execute('UPDATE users SET total_withdrawn = total_withdrawn + ? WHERE user_id = ?', (abs(stars), user_id))
        self.conn.commit()
        return True
    
    def add_transaction(self, user_id, trans_type, stars, description):
        self.cursor.execute('''
            INSERT INTO transactions (user_id, type, stars, description)
            VALUES (?, ?, ?, ?)
        ''', (user_id, trans_type, stars, description))
        self.conn.commit()
    
    def create_withdrawal(self, user_id, stars):
        self.cursor.execute('INSERT INTO withdrawals (user_id, stars, status) VALUES (?, ?, "pending")', (user_id, stars))
        self.conn.commit()
        return self.cursor.lastrowid
    
    def get_pending_withdrawals(self):
        self.cursor.execute('''
            SELECT w.*, u.username FROM withdrawals w
            JOIN users u ON w.user_id = u.user_id
            WHERE w.status = "pending"
        ''')
        return self.cursor.fetchall()
    
    def update_withdrawal(self, withdrawal_id, status):
        self.cursor.execute('UPDATE withdrawals SET status = ? WHERE id = ?', (status, withdrawal_id))
        self.conn.commit()
    
    def get_all_users(self):
        self.cursor.execute('SELECT * FROM users ORDER BY stars DESC')
        return self.cursor.fetchall()
    
    def get_stats(self):
        self.cursor.execute('SELECT COUNT(*) FROM users')
        total_users = self.cursor.fetchone()[0]
        
        self.cursor.execute('SELECT SUM(stars) FROM users')
        total_stars = self.cursor.fetchone()[0] or 0
        
        return {'total_users': total_users, 'total_stars': total_stars}

db = Database()

# Telegram API функции
def send_message(chat_id, text, reply_markup=None):
    url = API_URL + "sendMessage"
    data = {'chat_id': chat_id, 'text': text, 'parse_mode': 'HTML'}
    if reply_markup:
        data['reply_markup'] = json.dumps(reply_markup)
    try:
        requests.post(url, json=data)
    except:
        pass

def send_invoice(chat_id, title, description, payload, prices):
    url = API_URL + "sendInvoice"
    data = {
        'chat_id': chat_id,
        'title': title,
        'description': description,
        'payload': payload,
        'provider_token': '',
        'currency': 'XTR',
        'prices': prices
    }
    try:
        requests.post(url, json=data)
    except:
        pass

# Обработка команды /start
def handle_start(user_id, username, first_name, text):
    db.add_user(user_id, username, first_name, "")
    user = db.get_user(user_id)
    
    # Если команда /start site (с сайта)
    if len(text.split()) > 1 and text.split()[1] == 'site':
        # Клавиатура с Web App кнопкой
        keyboard = {
            'inline_keyboard': [[
                {
                    'text': '🎮 Открыть игры',
                    'web_app': {'url': f'{SITE_URL}?tg_user={user_id}'}
                }
            ]]
        }
        
        send_message(
            user_id,
            f"🎉 <b>Добро пожаловать, {first_name}!</b>\n\n"
            f"✅ Вы успешно авторизованы!\n\n"
            f"⭐ <b>Ваш баланс:</b> {user['stars'] if user else 0} ⭐\n\n"
            f"Нажмите кнопку ниже, чтобы открыть игры:\n"
            f"(Или вернитесь на сайт)",
            keyboard
        )
    else:
        # Обычный старт
        keyboard = {
            'inline_keyboard': [
                [{'text': '⭐ Пополнить', 'callback_data': 'deposit'}],
                [{'text': '📊 Статистика', 'callback_data': 'stats'}],
                [{'text': '💸 Вывод', 'callback_data': 'withdraw'}],
                [{'text': '🎮 На сайт', 'url': SITE_URL}]
            ]
        }
        
        if user_id in ADMINS:
            keyboard['inline_keyboard'].append([{'text': '👑 Админ', 'callback_data': 'admin'}])
        
        send_message(
            user_id,
            f"🤖 <b>Добро пожаловать в BezdarMoney Casino!</b>\n\n"
            f"⭐ <b>Ваш баланс:</b> {user['stars'] if user else 0} ⭐\n\n"
            f"✨ <i>Пополняйте баланс через Telegram Stars</i>\n"
            f"🎮 <i>Играйте на сайте или в боте</i>\n"
            f"💸 <i>Выводите звёзды обратно</i>",
            keyboard
        )

# Обработка callback кнопок
def handle_callback(user_id, data):
    user = db.get_user(user_id)
    
    if data == 'deposit':
        keyboard = {
            'inline_keyboard': [
                [{'text': '20 ⭐', 'callback_data': 'deposit_20'}],
                [{'text': '50 ⭐', 'callback_data': 'deposit_50'}],
                [{'text': '100 ⭐', 'callback_data': 'deposit_100'}],
                [{'text': '200 ⭐', 'callback_data': 'deposit_200'}],
                [{'text': '🔙 Назад', 'callback_data': 'main'}]
            ]
        }
        send_message(user_id, "✨ Выберите сумму для пополнения:", keyboard)
    
    elif data.startswith('deposit_'):
        amounts = {'deposit_20': 20, 'deposit_50': 50, 'deposit_100': 100, 'deposit_200': 200}
        stars = amounts.get(data, 20)
        
        prices = [{"label": "Telegram Stars", "amount": stars}]
        send_invoice(
            user_id,
            f"Пополнение на {stars} ⭐",
            f"Ваш баланс пополнится на {stars} звёзд",
            f"deposit_{user_id}_{stars}",
            prices
        )
    
    elif data == 'stats':
        send_message(
            user_id,
            f"📊 <b>Ваша статистика:</b>\n\n"
            f"⭐ Баланс: {user['stars']} ⭐\n"
            f"📈 Пополнено: {user['total_deposited']} ⭐\n"
            f"💸 Выведено: {user['total_withdrawn']} ⭐\n"
            f"📅 Регистрация: {user['reg_date']}"
        )
    
    elif data == 'withdraw':
        keyboard = {
            'inline_keyboard': [
                [{'text': '20 ⭐', 'callback_data': 'withdraw_20'}],
                [{'text': '50 ⭐', 'callback_data': 'withdraw_50'}],
                [{'text': '100 ⭐', 'callback_data': 'withdraw_100'}],
                [{'text': '🔙 Назад', 'callback_data': 'main'}]
            ]
        }
        send_message(user_id, f"💸 Вывод звёзд\n\nБаланс: {user['stars']} ⭐\n\nВыберите сумму:", keyboard)
    
    elif data.startswith('withdraw_'):
        amounts = {'withdraw_20': 20, 'withdraw_50': 50, 'withdraw_100': 100}
        stars = amounts.get(data, 20)
        
        if user['stars'] >= stars:
            withdrawal_id = db.create_withdrawal(user_id, stars)
            db.update_stars(user_id, -stars)
            
            # Уведомляем админов
            for admin_id in ADMINS:
                send_message(
                    admin_id,
                    f"🔄 Новая заявка на вывод!\n\n"
                    f"👤 Пользователь: {user['username'] or user['first_name']}\n"
                    f"🆔 ID: {user_id}\n"
                    f"⭐ Сумма: {stars} ⭐\n"
                    f"📋 Номер: #{withdrawal_id}"
                )
            
            send_message(
                user_id,
                f"✅ Заявка #{withdrawal_id} создана!\n"
                f"⭐ Сумма: {stars} ⭐\n"
                f"⏳ Статус: Ожидает подтверждения"
            )
        else:
            send_message(user_id, "❌ Недостаточно звёзд!")

# Главный цикл бота
def bot_polling():
    print("🤖 Бот запущен!")
    print(f"👑 Админы: {ADMINS}")
    print(f"🎮 Сайт: {SITE_URL}")
    
    offset = 0
    
    while True:
        try:
            # Получаем обновления
            url = f"{API_URL}getUpdates"
            params = {'offset': offset, 'timeout': 30}
            response = requests.get(url, params=params).json()
            
            if 'result' in response:
                for update in response['result']:
                    offset = update['update_id'] + 1
                    
                    # Сообщения
                    if 'message' in update:
                        msg = update['message']
                        user = msg['from']
                        
                        if 'text' in msg:
                            text = msg['text']
                            
                            if text.startswith('/start'):
                                handle_start(user['id'], user.get('username'), user.get('first_name'), text)
                            
                            elif text.startswith('/addstars') and user['id'] in ADMINS:
                                try:
                                    parts = text.split()
                                    target_id = int(parts[1])
                                    stars = int(parts[2])
                                    db.update_stars(target_id, stars)
                                    send_message(user['id'], f"✅ Пользователю {target_id} добавлено {stars} ⭐")
                                except:
                                    pass
                    
                    # Callback кнопки
                    elif 'callback_query' in update:
                        callback = update['callback_query']
                        user = callback['from']
                        data = callback['data']
                        
                        handle_callback(user['id'], data)
                        
                        # Отвечаем на callback
                        requests.post(f"{API_URL}answerCallbackQuery", 
                                     json={'callback_query_id': callback['id']})
                    
                    # Платежи
                    elif 'pre_checkout_query' in update:
                        pre_checkout = update['pre_checkout_query']
                        requests.post(f"{API_URL}answerPreCheckoutQuery",
                                     json={'pre_checkout_query_id': pre_checkout['id'], 'ok': True})
                    
                    elif 'message' in update and 'successful_payment' in update['message']:
                        msg = update['message']
                        user = msg['from']
                        payment = msg['successful_payment']
                        
                        # Получаем сумму из payload
                        payload = payment['invoice_payload']
                        if '_' in payload:
                            stars = int(payload.split('_')[-1])
                            db.update_stars(user['id'], stars)
                            send_message(user['id'], f"✅ Успешное пополнение!\n+{stars} ⭐")
        
        except Exception as e:
            print(f"Ошибка: {e}")
            time.sleep(5)

if __name__ == '__main__':
    bot_polling()
