# Racks4L Beats — запуск без командной строки

## 1. Supabase (supabase.com)
1. Создайте проект. **SQL Editor** → вставьте содержимое `supabase.sql` → **Run** (создаст таблицы и бакеты `media` и `masters`).
2. **Project Settings → API**: скопируйте `Project URL` и ключ `service_role` (секретный!).

## 2. GitHub
Создайте репозиторий → **Add file → Upload files** → перетащите содержимое папки (папки `public` и `functions` должны лежать в корне) → Commit.

## 3. Cloudflare Pages
**Workers & Pages → Create → Pages → Connect to Git** → выберите репозиторий. Build command — пусто, output directory — `public`.
**Settings → Variables and Secrets** (добавьте как Secret):
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `SESSION_SECRET` — любая длинная случайная строка
- `ADMIN_LOGIN` — логин администратора (зарегистрируйтесь с ним на сайте СРАЗУ после запуска) и/или `ADMIN_TELEGRAM_ID` — ваш числовой Telegram ID
- `BOT_TOKEN`, `BOT_USERNAME` (без @) — бот от @BotFather; там же `/setdomain` → домен сайта
- `TG_SECRET` — случайная строка из латиницы/цифр
- `PAY_DETAILS` — реквизиты для оплаты (показываются покупателю)
Сделайте Retry deployment.

## 4. Webhook бота (кнопка «Деньги пришли» в Telegram)
Откройте в браузере (подставьте свои значения):
`https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://ВАШ-ДОМЕН/api/tg&secret_token=<TG_SECRET>`
Напишите боту /start. Подтверждать оплату можно и в админке → «Заказы».

Лимит файла в Supabase Free — 50 МБ (Storage → Settings).
