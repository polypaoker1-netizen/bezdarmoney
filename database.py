import sqlite3
import json
from datetime import datetime
import logging

class Database:
    def __init__(self, db_name='casino.db'):
        self.conn = sqlite3.connect(db_name, check_same_thread=False)
        self.cursor = self.conn.cursor()
        self.init_db()
    
    def init_db(self):
        # Пользователи
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                first_name TEXT,
                balance REAL DEFAULT 0,
                demo_balance REAL DEFAULT 1000,
                is_admin INTEGER DEFAULT 0,
                is_banned INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP
            )
        ''')
        
        # Транзакции (пополнения)
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                amount REAL,
                type TEXT,
                status TEXT,
                payment_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        # Игры (история)
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                game_type TEXT,
                bet_amount REAL,
                win_amount REAL,
                result TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        self.conn.commit()
    
    def get_or_create_user(self, user_id, username="", first_name=""):
        self.cursor.execute(
            'SELECT * FROM users WHERE user_id = ?', 
            (user_id,)
        )
        user = self.cursor.fetchone()
        
        if not user:
            self.cursor.execute('''
                INSERT INTO users (user_id, username, first_name, balance, demo_balance)
                VALUES (?, ?, ?, 0, 1000)
            ''', (user_id, username, first_name))
            self.conn.commit()
            
            self.cursor.execute(
                'SELECT * FROM users WHERE user_id = ?', 
                (user_id,)
            )
            user = self.cursor.fetchone()
        
        # Обновляем последний логин
        self.cursor.execute(
            'UPDATE users SET last_login = ? WHERE user_id = ?',
            (datetime.now().isoformat(), user_id)
        )
        self.conn.commit()
        
        return user
    
    def update_balance(self, user_id, amount, is_demo=False):
        if is_demo:
            self.cursor.execute(
                'UPDATE users SET demo_balance = demo_balance + ? WHERE user_id = ?',
                (amount, user_id)
            )
        else:
            self.cursor.execute(
                'UPDATE users SET balance = balance + ? WHERE user_id = ?',
                (amount, user_id)
            )
        self.conn.commit()
        return self.get_balance(user_id, is_demo)
    
    def get_balance(self, user_id, is_demo=False):
        self.cursor.execute(
            'SELECT balance, demo_balance FROM users WHERE user_id = ?', 
            (user_id,)
        )
        result = self.cursor.fetchone()
        if result:
            return result[1] if is_demo else result[0]
        return 0
    
    def add_transaction(self, user_id, amount, payment_id, type="deposit"):
        self.cursor.execute('''
            INSERT INTO transactions (user_id, amount, type, status, payment_id)
            VALUES (?, ?, ?, 'completed', ?)
        ''', (user_id, amount, type, payment_id))
        self.conn.commit()
    
    def add_game_result(self, user_id, game_type, bet_amount, win_amount, result):
        self.cursor.execute('''
            INSERT INTO games (user_id, game_type, bet_amount, win_amount, result)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, game_type, bet_amount, win_amount, json.dumps(result)))
        self.conn.commit()
    
    def get_user_stats(self, user_id):
        self.cursor.execute('''
            SELECT COUNT(*), SUM(bet_amount), SUM(win_amount) 
            FROM games WHERE user_id = ?
        ''', (user_id,))
        return self.cursor.fetchone()
    
    def get_all_users(self):
        self.cursor.execute('SELECT * FROM users ORDER BY created_at DESC')
        return self.cursor.fetchall()
    
    def get_all_stats(self):
        self.cursor.execute('''
            SELECT 
                COUNT(DISTINCT user_id) as total_users,
                SUM(balance) as total_balance,
                COUNT(*) as total_games,
                SUM(bet_amount) as total_bets,
                SUM(win_amount) as total_wins
            FROM users, games
        ''')
        return self.cursor.fetchone()
    
    def set_admin(self, user_id, is_admin=True):
        self.cursor.execute(
            'UPDATE users SET is_admin = ? WHERE user_id = ?',
            (1 if is_admin else 0, user_id)
        )
        self.conn.commit()
    
    def set_ban(self, user_id, is_banned=True):
        self.cursor.execute(
            'UPDATE users SET is_banned = ? WHERE user_id = ?',
            (1 if is_banned else 0, user_id)
        )
        self.conn.commit()

db = Database()
