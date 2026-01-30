import requests
import json
import sqlite3
import os
import time
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv('BOT_TOKEN')
ADMINS = list(map(int, os.getenv('ADMINS', '').split(',')))
SITE_URL = os.getenv('SITE_URL', 'https://polypaoker1-netizen.github.io/bezdarmoney/')
API_URL = f"https://api.telegram.org/bot{BOT_TOKEN}/"

class Database:
    def __init__(self):
        self.conn = sqlite3.connect('stars.db')
        self.init_db()
    
    def init_db(self):
        cursor = self.conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                stars INTEGER DEFAULT 0,
                reg_date TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        self.conn.commit()
    
    def add_user(self, user_id, username, first_name):
        cursor = self.conn.cursor()
        cursor.execute('''
            INSERT OR IGNORE INTO users (user_id, username, first_name)
            VALUES (?, ?, ?)
        ''', (user_id, username, first_name))
        self.conn.commit()
    
    def get_user(self, user_id):
        cursor = self.conn.cursor()
        cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        user = cursor.fetchone()
        return user

db = Database()

def send_message(chat_id, text):
    url = API_URL + "sendMessage"
    data = {
        'chat_id': chat_id,
        'text': text,
        'parse_mode': 'HTML'
    }
    try:
        requests.post(url, json=data)
    except:
        pass

def get_updates(offset=None):
    url = API_URL + "getUpdates"
    params = {'timeout': 30}
    if offset:
        params['offset'] = offset
    
    try:
        response = requests.get(url, params=params, timeout=35)
        return response.json()
    except:
        return None

def main():
    print("🤖 Простой бот запущен!")
    print(f"👑 Админы: {ADMINS}")
    
    offset = 0
    
    while True:
        try:
            updates = get_updates(offset)
            
            if updates and 'result' in updates:
                for update in updates['result']:
                    offset = update['update_id'] + 1
                    
                    if 'message' in update:
                        msg = update['message']
                        user = msg['from']
                        
                        if 'text' in msg:
                            text = msg['text']
                            
                            if text.startswith('/start'):
                                db.add_user(user['id'], user.get('username'), user.get('first_name'))
                                
                                keyboard = {
                                    'inline_keyboard': [
                                        [
                                            {'text': '⭐ Пополнить', 'callback_data': 'deposit'},
                                            {'text': '🎮 К играм', 'url': SITE_URL}
                                        ],
                                        [
                                            {'text': '📊 Баланс', 'callback_data': 'balance'},
                                            {'text': '💸 Вывод', 'callback_data': 'withdraw'}
                                        ]
                                    ]
                                }
                                
                                if user['id'] in ADMINS:
                                    keyboard['inline_keyboard'].append([
                                        {'text': '👑 Админ', 'callback_data': 'admin'}
                                    ])
                                
                                user_data = db.get_user(user['id'])
                                stars = user_data[3] if user_data else 0
                                
                                send_message(
                                    user['id'],
                                    f"🎉 <b>Добро пожаловать в BezdarMoney!</b>\n\n"
                                    f"⭐ <b>Ваш баланс:</b> {stars} ⭐\n\n"
                                    f"✨ Пополняйте через Telegram Stars\n"
                                    f"🎮 Играйте на сайте\n"
                                    f"💸 Выводите звёзды\n\n"
                                    f"<b>Сайт:</b> {SITE_URL}",
                                    json.dumps(keyboard) if 'keyboard' in locals() else None
                                )
                            
                            elif text.startswith('/addstars') and user['id'] in ADMINS:
                                try:
                                    parts = text.split()
                                    target_id = int(parts[1])
                                    stars = int(parts[2])
                                    
                                    cursor = db.conn.cursor()
                                    cursor.execute('UPDATE users SET stars = stars + ? WHERE user_id = ?', (stars, target_id))
                                    db.conn.commit()
                                    
                                    send_message(user['id'], f"✅ Пользователю {target_id} добавлено {stars} ⭐")
                                    
                                    # Уведомляем пользователя
                                    send_message(
                                        target_id,
                                        f"✨ Администратор пополнил ваш баланс!\n\n"
                                        f"⭐ Добавлено: {stars} ⭐"
                                    )
                                except:
                                    send_message(user['id'], "Использование: /addstars user_id количество")
        
        except Exception as e:
            print(f"Ошибка: {e}")
            time.sleep(5)

if __name__ == '__main__':
    main()
