import asyncio
import os
from dotenv import load_dotenv
from aiogram import Bot, Dispatcher, Router, F
from aiogram.types import Message, CallbackQuery, LabeledPrice, PreCheckoutQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.filters import Command, CommandStart
from aiogram.utils.keyboard import InlineKeyboardBuilder
import logging

from database import Database

# Загрузка переменных окружения
load_dotenv()

# Конфигурация
BOT_TOKEN = os.getenv('BOT_TOKEN')
ADMINS = list(map(int, os.getenv('ADMINS', '').split(',')))
SITE_URL = os.getenv('SITE_URL', 'https://polypaoker1-netizen.github.io/bezdarmoney/')

# Инициализация бота
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
db = Database()

# Настройка логирования
logging.basicConfig(level=logging.INFO)

# ===================== КЛАВИАТУРЫ =====================
def main_menu_keyboard():
    builder = InlineKeyboardBuilder()
    builder.button(text="⭐ Пополнить звёздами", callback_data="deposit_stars")
    builder.button(text="🎮 Перейти к играм", url=SITE_URL)
    builder.button(text="📊 Моя статистика", callback_data="stats")
    builder.button(text="💸 Вывести звёзды", callback_data="withdraw_stars")
    builder.adjust(2, 1, 1)
    return builder.as_markup()

def deposit_stars_keyboard():
    builder = InlineKeyboardBuilder()
    builder.button(text="⭐ 20 звёзд", callback_data="deposit_20")
    builder.button(text="⭐ 50 звёзд", callback_data="deposit_50")
    builder.button(text="⭐ 100 звёзд", callback_data="deposit_100")
    builder.button(text="⭐ 200 звёзд", callback_data="deposit_200")
    builder.button(text="⭐ 500 звёзд", callback_data="deposit_500")
    builder.button(text="⭐ 1000 звёзд", callback_data="deposit_1000")
    builder.button(text="🔙 Назад", callback_data="main_menu")
    builder.adjust(3, 3, 1)
    return builder.as_markup()

def admin_keyboard():
    builder = InlineKeyboardBuilder()
    builder.button(text="📊 Общая статистика", callback_data="admin_stats")
    builder.button(text="📢 Рассылка", callback_data="admin_broadcast")
    builder.button(text="⭐ Управление балансом", callback_data="admin_balance")
    builder.button(text="💸 Заявки на вывод", callback_data="admin_withdrawals")
    builder.button(text="📈 Топ пользователей", callback_data="admin_top")
    builder.button(text="🔙 Главное меню", callback_data="main_menu")
    builder.adjust(2, 2, 1, 1)
    return builder.as_markup()

def payment_keyboard(stars_amount=20):
    builder = InlineKeyboardBuilder()
    builder.button(text=f"Оплатить {stars_amount} ⭐", pay=True)
    builder.button(text="❌ Отмена", callback_data="main_menu")
    builder.adjust(1)
    return builder.as_markup()

def withdrawal_keyboard():
    builder = InlineKeyboardBuilder()
    builder.button(text="⭐ 20 звёзд", callback_data="withdraw_20")
    builder.button(text="⭐ 50 звёзд", callback_data="withdraw_50")
    builder.button(text="⭐ 100 звёзд", callback_data="withdraw_100")
    builder.button(text="⭐ Всё", callback_data="withdraw_all")
    builder.button(text="🔙 Назад", callback_data="main_menu")
    builder.adjust(2, 2, 1)
    return builder.as_markup()

# ===================== ОСНОВНЫЕ КОМАНДЫ =====================
@dp.message(CommandStart())
async def start_command(message: Message):
    user_id = message.from_user.id
    username = message.from_user.username
    first_name = message.from_user.first_name
    last_name = message.from_user.last_name
    
    # Добавляем пользователя в БД
    db.add_user(user_id, username, first_name, last_name)
    db.update_user_activity(user_id)
    
    stats = db.get_user_stats(user_id)
    
    # Приветствие для админов
    if user_id in ADMINS:
        await message.answer(
            f"👑 Добро пожаловать, Администратор!\n\n"
            f"⭐ Ваш баланс: {stats['stars'] if stats else 0} ⭐\n"
            f"🆔 Ваш ID: {user_id}\n\n"
            f"Используйте админ-панель для управления:",
            reply_markup=admin_keyboard()
        )
    else:
        await message.answer(
            f"🎉 Добро пожаловать в BezdarMoney Casino!\n\n"
            f"⭐ Ваш баланс: {stats['stars'] if stats else 0} ⭐\n\n"
            f"✨ Пополняйте баланс через Telegram Stars\n"
            f"🎮 Играйте на нашем сайте\n"
            f"💸 Выводите звёзды обратно в Telegram\n\n"
            f"🎮 Ссылка на игры: {SITE_URL}",
            reply_markup=main_menu_keyboard()
        )

@dp.message(Command("admin"))
async def admin_command(message: Message):
    user_id = message.from_user.id
    
    if user_id in ADMINS:
        await message.answer(
            "👑 Панель администратора",
            reply_markup=admin_keyboard()
        )
    else:
        await message.answer("⛔ У вас нет прав администратора.")

# ===================== ПОПОЛНЕНИЕ ЗВЁЗДАМИ =====================
@dp.callback_query(F.data == "deposit_stars")
async def deposit_stars_menu(callback: CallbackQuery):
    await callback.message.edit_text(
        "✨ Выберите сумму для пополнения:\n\n"
        "1 звезда = 1 звезда Telegram ⭐\n\n"
        "После оплаты звёзды автоматически поступят на ваш баланс",
        reply_markup=deposit_stars_keyboard()
    )
    await callback.answer()

@dp.callback_query(F.data.startswith("deposit_"))
async def handle_deposit(callback: CallbackQuery):
    user_id = callback.from_user.id
    data = callback.data
    
    # Определяем количество звезд
    if data == "deposit_20":
        stars_amount = 20
    elif data == "deposit_50":
        stars_amount = 50
    elif data == "deposit_100":
        stars_amount = 100
    elif data == "deposit_200":
        stars_amount = 200
    elif data == "deposit_500":
        stars_amount = 500
    elif data == "deposit_1000":
        stars_amount = 1000
    else:
        stars_amount = 20
    
    # Создаем цены в звездах
    prices = [LabeledPrice(label="Telegram Stars", amount=stars_amount)]
    
    try:
        await callback.message.answer_invoice(
            title=f"Пополнение баланса на {stars_amount} ⭐",
            description=f"После оплаты {stars_amount} звёзд будут зачислены на ваш игровой баланс",
            prices=prices,
            provider_token="",  # Для Telegram Stars оставляем пустым
            payload=f"stars_deposit_{user_id}_{stars_amount}",
            currency="XTR",  # Код валюты для Telegram Stars
            reply_markup=payment_keyboard(stars_amount),
        )
    except Exception as e:
        await callback.message.answer(f"❌ Ошибка при создании счета: {str(e)}")
    
    await callback.answer()

@dp.pre_checkout_query()
async def pre_checkout_handler(pre_checkout_query: PreCheckoutQuery):
    # Всегда подтверждаем предоплату
    await pre_checkout_query.answer(ok=True)

@dp.message(F.successful_payment)
async def success_payment_handler(message: Message):
    user_id = message.from_user.id
    payment_info = message.successful_payment
    
    # Получаем количество звезд из payload
    payload_parts = payment_info.invoice_payload.split('_')
    if len(payload_parts) >= 4:
        stars_amount = int(payload_parts[3])  # Количество звезд
    else:
        stars_amount = payment_info.total_amount  # Уже в звездах
    
    # Обновляем баланс в звездах
    db.update_stars_balance(user_id, stars_amount)
    db.add_transaction(
        user_id=user_id,
        transaction_type='deposit_stars',
        stars=stars_amount,
        description=f'Пополнение через Telegram Stars ({stars_amount} ⭐)',
        telegram_payment_id=payment_info.telegram_payment_charge_id
    )
    
    stats = db.get_user_stats(user_id)
    
    await message.answer(
        f"✅ Успешное пополнение!\n\n"
        f"⭐ Зачислено: {stars_amount} ⭐\n"
        f"💰 Текущий баланс: {stats['stars'] if stats else stars_amount} ⭐\n\n"
        f"🎮 Теперь вы можете играть на сайте:\n{SITE_URL}\n\n"
        f"💸 Выводите звёзды через меню бота",
        reply_markup=main_menu_keyboard()
    )

# ===================== ВЫВОД ЗВЁЗД =====================
@dp.callback_query(F.data == "withdraw_stars")
async def withdraw_stars_menu(callback: CallbackQuery):
    user_id = callback.from_user.id
    stats = db.get_user_stats(user_id)
    
    await callback.message.edit_text(
        f"💸 Вывод Telegram Stars\n\n"
        f"⭐ Ваш баланс: {stats['stars']} ⭐\n"
        f"📋 Минимальная сумма вывода: 20 ⭐\n\n"
        f"Выберите сумму для вывода:",
        reply_markup=withdrawal_keyboard()
    )
    await callback.answer()

@dp.callback_query(F.data.startswith("withdraw_"))
async def handle_withdrawal(callback: CallbackQuery):
    user_id = callback.from_user.id
    stats = db.get_user_stats(user_id)
    data = callback.data
    
    # Определяем сумму вывода
    if data == "withdraw_20":
        stars_amount = 20
    elif data == "withdraw_50":
        stars_amount = 50
    elif data == "withdraw_100":
        stars_amount = 100
    elif data == "withdraw_all":
        stars_amount = stats['stars']
    else:
        stars_amount = 20
    
    # Проверки
    if stars_amount < 20:
        await callback.message.edit_text(
            f"❌ Минимальная сумма вывода: 20 ⭐",
            reply_markup=main_menu_keyboard()
        )
        return
    
    if stats['stars'] < stars_amount:
        await callback.message.edit_text(
            f"❌ Недостаточно звёзд\n"
            f"Ваш баланс: {stats['stars']} ⭐\n"
            f"Запрошено: {stars_amount} ⭐",
            reply_markup=main_menu_keyboard()
        )
        return
    
    # Создаем заявку на вывод
    request_id = db.create_withdrawal_request(user_id, stars_amount)
    
    # Резервируем звезды (снимаем с баланса)
    db.update_stars_balance(user_id, -stars_amount)
    db.add_transaction(
        user_id=user_id,
        transaction_type='withdrawal_stars',
        stars=stars_amount,
        description=f'Заявка на вывод #{request_id}'
    )
    
    # Уведомляем админов
    for admin_id in ADMINS:
        try:
            await bot.send_message(
                admin_id,
                f"🔄 Новая заявка на вывод!\n\n"
                f"👤 Пользователь: @{callback.from_user.username or 'No username'}\n"
                f"🆔 ID: {user_id}\n"
                f"⭐ Сумма: {stars_amount} ⭐\n"
                f"📋 Номер заявки: #{request_id}\n\n"
                f"Для одобрения: /approve {request_id}\n"
                f"Для отказа: /reject {request_id}"
            )
        except:
            pass
    
    await callback.message.edit_text(
        f"✅ Заявка на вывод создана!\n\n"
        f"📋 Номер заявки: #{request_id}\n"
        f"⭐ Сумма: {stars_amount} ⭐\n"
        f"⏳ Статус: Ожидает подтверждения\n\n"
        f"Администратор рассмотрит вашу заявку в течение 24 часов.\n"
        f"После одобрения звёзды будут переведены на ваш Telegram аккаунт.",
        reply_markup=main_menu_keyboard()
    )
    await callback.answer()

# ===================== АДМИН-ПАНЕЛЬ =====================
@dp.callback_query(F.data == "admin_stats")
async def admin_stats_handler(callback: CallbackQuery):
    user_id = callback.from_user.id
    
    if user_id not in ADMINS:
        await callback.answer("⛔ Нет доступа")
        return
    
    stats = db.get_total_stats()
    pending_withdrawals = len(db.get_pending_withdrawals())
    
    message_text = (
        "📊 Общая статистика:\n\n"
        f"👥 Всего пользователей: {stats['total_users']}\n"
        f"⭐ Всего звёзд в системе: {stats['total_stars']} ⭐\n"
        f"📈 Всего пополнено: {stats['total_deposited_stars']} ⭐\n"
        f"📉 Всего выведено: {stats['total_withdrawn_stars']} ⭐\n"
        f"⏳ Заявок на вывод: {pending_withdrawals}\n"
    )
    
    await callback.message.edit_text(message_text, reply_markup=admin_keyboard())
    await callback.answer()

@dp.callback_query(F.data == "admin_withdrawals")
async def admin_withdrawals_handler(callback: CallbackQuery):
    user_id = callback.from_user.id
    
    if user_id not in ADMINS:
        await callback.answer("⛔ Нет доступа")
        return
    
    withdrawals = db.get_pending_withdrawals()
    
    if not withdrawals:
        text = "✅ Нет pending заявок на вывод"
    else:
        text = "⏳ Заявки на вывод:\n\n"
        for w in withdrawals:
            text += f"📋 #{w[0]}\n👤 @{w[8] or w[9] or w[2]}\n⭐ {w[3]} ⭐\n⏰ {w[7]}\n\n"
    
    await callback.message.edit_text(text, reply_markup=admin_keyboard())
    await callback.answer()

@dp.message(Command("approve"))
async def approve_withdrawal(message: Message):
    user_id = message.from_user.id
    
    if user_id not in ADMINS:
        await message.answer("⛔ Нет доступа")
        return
    
    try:
        request_id = int(message.text.split()[1])
        
        # Здесь должна быть логика перевода звезд пользователю
        # Через Telegram Bot API можно перевести stars пользователю
        # Но для этого нужны специальные права бота
        
        db.update_withdrawal_status(request_id, "approved", user_id)
        
        await message.answer(f"✅ Заявка #{request_id} одобрена\n\n"
                           f"Не забудьте перевести звёзды пользователю через @BotFather")
        
    except (IndexError, ValueError):
        await message.answer("Использование: /approve request_id")

@dp.message(Command("reject"))
async def reject_withdrawal(message: Message):
    user_id = message.from_user.id
    
    if user_id not in ADMINS:
        await message.answer("⛔ Нет доступа")
        return
    
    try:
        request_id = int(message.text.split()[1])
        
        # Возвращаем звезды пользователю
        withdrawal = db.get_pending_withdrawals()
        for w in withdrawal:
            if w[0] == request_id:
                db.update_stars_balance(w[2], w[3])  # Возвращаем звезды
                break
        
        db.update_withdrawal_status(request_id, "rejected", user_id)
        
        await message.answer(f"❌ Заявка #{request_id} отклонена\n"
                           f"Звёзды возвращены на баланс пользователя")
        
    except (IndexError, ValueError):
        await message.answer("Использование: /reject request_id")

@dp.message(Command("addstars"))
async def add_stars_command(message: Message):
    user_id = message.from_user.id
    
    if user_id not in ADMINS:
        await message.answer("⛔ Нет доступа")
        return
    
    try:
        parts = message.text.split()
        if len(parts) != 3:
            await message.answer("Использование: /addstars user_id количество_звезд")
            return
        
        target_user_id = int(parts[1])
        stars_amount = int(parts[2])
        
        if stars_amount <= 0:
            await message.answer("Количество звезд должно быть положительным")
            return
        
        db.update_stars_balance(target_user_id, stars_amount)
        db.add_transaction(
            user_id=target_user_id,
            transaction_type='admin_add_stars',
            stars=stars_amount,
            description=f'Админское пополнение от {user_id}'
        )
        db.log_admin_action(
            admin_id=user_id,
            action='add_stars',
            target_user_id=target_user_id,
            details={'stars': stars_amount}
        )
        
        await message.answer(f"✅ Пользователю {target_user_id} добавлено {stars_amount} ⭐")
        
        # Уведомляем пользователя
        try:
            await bot.send_message(
                target_user_id,
                f"✨ Администратор пополнил ваш баланс!\n\n"
                f"⭐ Добавлено: {stars_amount} ⭐\n"
                f"💰 Новый баланс: {db.get_user_stats(target_user_id)['stars']} ⭐"
            )
        except:
            pass
            
    except ValueError:
        await message.answer("Ошибка: проверьте правильность ввода данных")

@dp.message(Command("removestars"))
async def remove_stars_command(message: Message):
    user_id = message.from_user.id
    
    if user_id not in ADMINS:
        await message.answer("⛔ Нет доступа")
        return
    
    try:
        parts = message.text.split()
        if len(parts) != 3:
            await message.answer("Использование: /removestars user_id количество_звезд")
            return
        
        target_user_id = int(parts[1])
        stars_amount = int(parts[2])
        
        if stars_amount <= 0:
            await message.answer("Количество звезд должно быть положительным")
            return
        
        user_stats = db.get_user_stats(target_user_id)
        if not user_stats:
            await message.answer("Пользователь не найден")
            return
        
        if user_stats['stars'] < stars_amount:
            await message.answer(f"У пользователя недостаточно звёзд. Баланс: {user_stats['stars']} ⭐")
            return
        
        db.update_stars_balance(target_user_id, -stars_amount)
        db.add_transaction(
            user_id=target_user_id,
            transaction_type='admin_remove_stars',
            stars=stars_amount,
            description=f'Админское снятие от {user_id}'
        )
        db.log_admin_action(
            admin_id=user_id,
            action='remove_stars',
            target_user_id=target_user_id,
            details={'stars': stars_amount}
        )
        
        await message.answer(f"✅ У пользователя {target_user_id} снято {stars_amount} ⭐")
        
    except ValueError:
        await message.answer("Ошибка: проверьте правильность ввода данных")

@dp.callback_query(F.data == "admin_top")
async def admin_top_handler(callback: CallbackQuery):
    user_id = callback.from_user.id
    
    if user_id not in ADMINS:
        await callback.answer("⛔ Нет доступа")
        return
    
    users = db.get_all_users()
    
    text = "🏆 Топ пользователей по звёздам:\n\n"
    for i, user in enumerate(users[:10], 1):
        username = f"@{user[1]}" if user[1] else f"ID: {user[0]}"
        text += f"{i}. {username}: {user[4]} ⭐\n"
    
    await callback.message.edit_text(text, reply_markup=admin_keyboard())
    await callback.answer()

# ===================== ПОЛЬЗОВАТЕЛЬСКИЕ КОМАНДЫ =====================
@dp.callback_query(F.data == "stats")
async def user_stats_handler(callback: CallbackQuery):
    user_id = callback.from_user.id
    stats = db.get_user_stats(user_id)
    
    if stats:
        message_text = (
            "📊 Ваша статистика:\n\n"
            f"⭐ Баланс: {stats['stars']} ⭐\n"
            f"📈 Всего пополнено: {stats['deposits_total_stars']} ⭐\n"
            f"🔄 Количество пополнений: {stats['deposits_count']}\n"
            f"💸 Всего выведено: {stats['total_withdrawn_stars']} ⭐\n"
            f"🎮 Сыграно игр: {stats['games_played']}\n"
            f"📅 Дата регистрации: {stats['registration_date']}\n\n"
            f"🎮 Играйте здесь: {SITE_URL}"
        )
    else:
        message_text = "Статистика не найдена"
    
    await callback.message.edit_text(message_text, reply_markup=main_menu_keyboard())
    await callback.answer()

@dp.callback_query(F.data == "main_menu")
async def main_menu_handler(callback: CallbackQuery):
    user_id = callback.from_user.id
    
    if user_id in ADMINS:
        await callback.message.edit_text(
            "👑 Панель администратора",
            reply_markup=admin_keyboard()
        )
    else:
        stats = db.get_user_stats(user_id)
        await callback.message.edit_text(
            f"🎮 Главное меню\n\n"
            f"⭐ Ваш баланс: {stats['stars'] if stats else 0} ⭐\n"
            f"🎮 Ссылка на игры: {SITE_URL}",
            reply_markup=main_menu_keyboard()
        )
    await callback.answer()

# ===================== ЗАПУСК БОТА =====================
async def main():
    print("🤖 Бот запущен!")
    print(f"👑 Админы: {ADMINS}")
    print(f"🎮 Сайт: {SITE_URL}")
    
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
