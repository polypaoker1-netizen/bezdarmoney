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
        
        # Таблица пользователей (баланс в звездах)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                stars INTEGER DEFAULT 0, -- баланс в звездах
                total_deposited_stars INTEGER DEFAULT 0,
                total_withdrawn_stars INTEGER DEFAULT 0,
                games_played INTEGER DEFAULT 0,
                registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Таблица транзакций (все суммы в звездах)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                type TEXT, -- 'deposit_stars', 'withdrawal_stars', 'game_win', 'game_loss'
                stars INTEGER, -- количество звезд
                description TEXT,
                telegram_payment_id TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        # Таблица заявок на вывод звезд
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                stars INTEGER,
                status TEXT DEFAULT 'pending', -- pending, approved, rejected, completed
                admin_id INTEGER,
                processed_date TIMESTAMP,
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
    
    def update_stars_balance(self, user_id, stars):
        """Обновление баланса звезд"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('UPDATE users SET stars = stars + ? WHERE user_id = ?', (stars, user_id))
        
        # Обновляем статистику
        if stars > 0:
            cursor.execute('UPDATE users SET total_deposited_stars = total_deposited_stars + ? WHERE user_id = ?', (stars, user_id))
        else:
            cursor.execute('UPDATE users SET total_withdrawn_stars = total_withdrawn_stars + ? WHERE user_id = ?', (abs(stars), user_id))
        
        conn.commit()
        conn.close()
        return True
    
    def add_transaction(self, user_id, transaction_type, stars, description, telegram_payment_id=None):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO transactions (user_id, type, stars, description, telegram_payment_id)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, transaction_type, stars, description, telegram_payment_id))
        
        conn.commit()
        conn.close()
    
    def get_user_stats(self, user_id):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users WHERE user_id = ?', (user_id,))
        user = cursor.fetchone()
        
        cursor.execute('''
            SELECT COUNT(*), SUM(stars) FROM transactions 
            WHERE user_id = ? AND type = 'deposit_stars'
        ''', (user_id,))
        deposit_stats = cursor.fetchone()
        
        cursor.execute('''
            SELECT COUNT(*), SUM(stars) FROM transactions 
            WHERE user_id = ? AND type LIKE 'game_%'
        ''', (user_id,))
        game_stats = cursor.fetchone()
        
        conn.close()
        
        if user:
            return {
                'user_id': user[0],
                'username': user[1],
                'stars': user[4],  # баланс в звездах
                'total_deposited_stars': user[5],
                'total_withdrawn_stars': user[6],
                'games_played': user[7],
                'registration_date': user[8],
                'deposits_count': deposit_stats[0] or 0,
                'deposits_total_stars': deposit_stats[1] or 0,
                'games_count': game_stats[0] or 0
            }
        return None
    
    def create_withdrawal_request(self, user_id, stars):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO withdrawal_requests (user_id, stars, status)
            VALUES (?, ?, 'pending')
        ''', (user_id, stars))
        
        request_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        return request_id
    
    def get_pending_withdrawals(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT wr.*, u.username, u.first_name 
            FROM withdrawal_requests wr
            JOIN users u ON wr.user_id = u.user_id
            WHERE wr.status = 'pending'
            ORDER BY wr.timestamp
        ''')
        
        withdrawals = cursor.fetchall()
        conn.close()
        return withdrawals
    
    def update_withdrawal_status(self, request_id, status, admin_id=None):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE withdrawal_requests 
            SET status = ?, admin_id = ?, processed_date = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (status, admin_id, request_id))
        
        conn.commit()
        conn.close()
        return True
    
    def get_all_users(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM users ORDER BY stars DESC')
        users = cursor.fetchall()
        
        conn.close()
        return users
    
    def get_total_stats(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT COUNT(*) FROM users')
        total_users = cursor.fetchone()[0]
        
        cursor.execute('SELECT SUM(stars) FROM users')
        total_stars = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT SUM(total_deposited_stars) FROM users')
        total_deposited_stars = cursor.fetchone()[0] or 0
        
        cursor.execute('SELECT SUM(total_withdrawn_stars) FROM users')
        total_withdrawn_stars = cursor.fetchone()[0] or 0
        
        conn.close()
        
        return {
            'total_users': total_users,
            'total_stars': total_stars,
            'total_deposited_stars': total_deposited_stars,
            'total_withdrawn_stars': total_withdrawn_stars
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
