import sqlite3
import json
from datetime import datetime

class Database:
    def __init__(self, db_path='data/database.db'):
        self.db_path = db_path
        self.init_db()
    
    def init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Таблица пользователей
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                balance REAL DEFAULT 0,
                total_deposited REAL DEFAULT 0,
                total_withdrawn REAL DEFAULT 0,
                games_played INTEGER DEFAULT 0,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Таблица транзакций
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT, -- 'deposit', 'withdrawal', 'game_win', 'game_loss'
                amount REAL,
                description TEXT,
                telegram_payment_id TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        # Таблица админских действий
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS admin_actions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id INTEGER,
                action TEXT,
                target_user_id INTEGER,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def add_user(self, user_id, username, first_name, last_name):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT OR IGNORE INTO users (user_id, username, first_name, last_name)
            VALUES (?, ?, ?, ?)
        ''', (user_id, username, first_name, last_name))
        
        conn.commit()
        conn.close()
    
    def get_user(self, user_id):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        user = cursor.fetchone()
        
        conn.close()
        return user
    
    def update_balance(self, user_id, amount):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('UPDATE users SET balance = balance + ? WHERE user_id = ?', (amount, user_id))
        
        # Обновляем total_deposited или total_withdrawn
        if amount > 0:
            cursor.execute('UPDATE users SET total_deposited = total_deposited + ? WHERE user_id = ?', (amount, user_id))
        else:
            cursor.execute('UPDATE users SET total_withdrawn = total_withdrawn + ? WHERE user_id = ?', (abs(amount), user_id))
        
        conn.commit()
        conn.close()
        return True
    
    def add_transaction(self, user_id, transaction_type, amount, description, telegram_payment_id=None):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO transactions (user_id, type, amount, description, telegram_payment_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, transaction_type, amount, description, telegram_payment_id))
        
        conn.commit()
        conn.close()
    
    def get_user_stats(self, user_id):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        user = cursor.fetchone()
        
        cursor.execute('''
            SELECT COUNT(*), SUM(amount) FROM transactions 
            WHERE user_id = ? AND type = 'deposit'
        ''', (user_id,))
        deposit_stats = cursor.fetchone()
        
        cursor.execute('''
            SELECT COUNT(*), SUM(amount) FROM transactions 
            WHERE user_id = ? AND type LIKE 'game_%'
        ''', (user_id,))
        game_stats = cursor.fetchone()
        
        conn.close()
        
        if user:
            return {
                'user_id': user[0],
                'username': user[1],
                'balance': user[4],
                'total_deposited': user[5],
                'total_withdrawn': user[6],
                'games_played': user[7],
                'registration_date': user[8],
                'deposits_count': deposit_stats[0] or 0,
                'deposits_total': deposit_stats[1] or 0,
                'games_count': game_stats[0] or 0
            }
        return None
    
    def get_all_users(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users ORDER BY balance DESC')
        users = cursor.fetchall()
        
        conn.close()
        return users
    
    def get_total_stats(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM users')
        total_users = cursor.fetchone()[0]
        
        cursor.execute('SELECT SUM(balance) FROM users')
        total_balance = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT SUM(total_deposited) FROM users')
        total_deposited = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT SUM(total_withdrawn) FROM users')
        total_withdrawn = cursor.fetchone()[0] or 0
        
        conn.close()
        
        return {
            'total_users': total_users,
            'total_balance': total_balance,
            'total_deposited': total_deposited,
            'total_withdrawn': total_withdrawn
        }
    
    def log_admin_action(self, admin_id, action, target_user_id, details):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO admin_actions (admin_id, action, target_user_id, details)
            VALUES (?, ?, ?, ?)
        ''', (admin_id, action, target_user_id, json.dumps(details)))
        
        conn.commit()
        conn.close()
    
    def update_user_activity(self, user_id):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE users SET last_activity = CURRENT_TIMESTAMP 
            WHERE user_id = ?
        ''', (user_id,))
        
        conn.commit()
        conn.close()
    
    def search_users(self, search_term):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Ищем по user_id или username
        try:
            user_id = int(search_term)
            cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        except ValueError:
            cursor.execute('SELECT * FROM users WHERE username LIKE ? OR first_name LIKE ?', 
                          (f'%{search_term}%', f'%{search_term}%'))
        
        users = cursor.fetchall()
        conn.close()
        return users
    
    def get_recent_transactions(self, limit=10):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT t.*, u.username FROM transactions t
            LEFT JOIN users u ON t.user_id = u.user_id
            ORDER BY t.timestamp DESC LIMIT ?
        ''', (limit,))
        
        transactions = cursor.fetchall()
        conn.close()
        return transactions
    
    def get_user_transactions(self, user_id, limit=20):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM transactions 
            WHERE user_id = ? 
            ORDER BY timestamp DESC LIMIT ?
        ''', (user_id, limit))
        
        transactions = cursor.fetchall()
        conn.close()
        return transactions
