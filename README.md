# Racks4L Beats

Самостоятельный модульный проект музыкального магазина: нативный HTML/CSS/ES Modules, Cloudflare Worker REST API, D1 (SQLite) и Supabase Storage для файлов.

> **Статус:** стартовый проект с рабочей базовой архитектурой и основными API/интерфейсами. Перед публичным коммерческим запуском обязательно заполните секреты, примените миграции, настройте Telegram Login и проведите тесты на своём Cloudflare/Supabase-проекте. Реальные платежи не подключены: оплата подтверждается администратором вручную. Не добавляйте реальные секреты в Git.

## Структура

- `frontend/` — главная, каталог, фильтры, кастомный плеер, формы входа/регистрации, кабинет.
- `admin/` — интерфейс администрирования.
- `backend/` — Cloudflare Worker REST API.
- `migrations/` — схема D1.
- `tests/` — базовые проверки контракта API.
- `config/brand.js` — параметры бренда для фронтенда.

## Требования

- Node.js 20+
- аккаунт Cloudflare с Workers и D1
- проект Supabase с Storage buckets
- Telegram bot (только если включаете Telegram-интеграцию)

## Локальный просмотр фронтенда

Можно открыть `frontend/index.html` для просмотра статической оболочки, но API-запросы будут работать только после запуска Worker и настройки URL. Для полноценной локальной разработки используйте Wrangler:

```bash
cd backend
npm install
npx wrangler dev
```

Worker отдаёт API по `/api/v1/*`; статические файлы для production публикуйте через Cloudflare Pages, направив `/api/*` на Worker (Pages Functions/Worker route согласно выбранной конфигурации).

## Настройка Cloudflare D1

1. Создайте базу D1 в Cloudflare Dashboard.
2. В `backend/wrangler.toml` замените `database_id` на настоящий ID базы.
3. Из корня репозитория выполните:

```bash
npx wrangler d1 execute racks4l-beats-db --remote --file=migrations/0001_initial.sql
```

Для локальной базы используйте `--local`. Не применяйте одну и ту же миграцию повторно вручную после изменения схемы; новые изменения добавляйте отдельными файлами миграций.

## Настройка Supabase Storage

Создайте buckets:

- `previews` — публичный, только MP3 демо.
- `covers` — публичный, обложки/аватары.
- `private-audio` — **private**, WAV.
- `stems` — **private**, ZIP со STEMS.

В Cloudflare Worker Secrets задайте `SUPABASE_URL` и `SUPABASE_SECRET_KEY` (service role/secret key). Этот ключ должен находиться только в Worker Secrets. Никогда не помещайте его в frontend. Доступ к приватным объектам выдаётся сервером только после проверки пользователя и оплаченной покупки; подписанные ссылки имеют короткий срок действия.

## Секреты и переменные Worker

В `backend/wrangler.toml` находятся только несекретные bindings. Добавьте секреты командами из каталога `backend`:

```bash
npx wrangler secret put SESSION_SECRET
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SECRET_KEY
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_BOT_USERNAME
npx wrangler secret put TELEGRAM_LOGIN_BOT_TOKEN
npx wrangler secret put ADMIN_TELEGRAM_IDS
```

`SESSION_SECRET` должен быть длинной случайной строкой (не менее 32 байт). `ADMIN_TELEGRAM_IDS` — список числовых Telegram ID через запятую. Не используйте значения-заглушки в production.

Для первого администратора предусмотрен безопасный bootstrap: после применения миграции назначьте `role='admin'` конкретному пользователю через D1 Dashboard/SQL, либо реализуйте отдельный одноразовый bootstrap-процесс. Не делайте публичный endpoint, который позволяет самому назначить себе администратора.

## Telegram Login

API содержит серверную проверку Telegram Login hash по официальному алгоритму. В интерфейсе оставлена точка подключения виджета. Настройте домен бота через BotFather и используйте официальный Telegram Login Widget, передавая callback в `POST /api/v1/auth/telegram`. Включайте только после проверки домена и токена. Бот-уведомления о заказах можно подключить через `TELEGRAM_BOT_TOKEN`; токен хранится только в Worker Secrets.

## Публикация через GitHub Desktop и Cloudflare

1. Распакуйте ZIP.
2. Создайте GitHub repository и добавьте папку проекта через GitHub Desktop.
3. Загрузите репозиторий (`Commit` → `Push origin`).
4. В Cloudflare Pages подключите репозиторий. Укажите root directory `frontend`, build command оставьте пустой, output directory — `.` (в папке есть `index.html` и `admin/`). Для Worker API отдельно разверните `backend` через Wrangler и настройте route `/api/*` на домене Pages либо используйте Pages Functions/Worker route.
5. Создайте D1, замените `database_id`, примените SQL-миграции.
6. Создайте buckets Supabase и добавьте secrets Worker.
7. Укажите API base URL в `frontend/js/api.js` (по умолчанию относительный `/api/v1`).
8. Проверьте CORS/домены, cookies, Telegram Login, загрузку файлов и защищённое скачивание.
9. Проведите тестовый заказ и проверьте, что повторное подтверждение оплаты не создаёт дублей.

## Безопасность и ограничения

- Пароли хешируются PBKDF2-HMAC-SHA-256 через Web Crypto с уникальной солью; для deployment с требованиями к Argon2id замените механизм на Argon2id в подходящей серверной среде.
- Сессии хранятся в D1, cookie HttpOnly/Secure/SameSite=Lax.
- Есть базовые лимиты запросов, CSRF-токен для изменяющих запросов, серверная проверка роли и владельца заказа.
- Ручное подтверждение оплаты не заменяет проверку реального поступления денег.
- API загрузки файлов предусматривает серверную проверку прав и типов, но прямую загрузку больших файлов следует дополнительно настроить под ограничения выбранного тарифа/инфраструктуры Supabase.
- Автоматические тесты в `tests/` — smoke-проверки, а не полноценный аудит безопасности. До реального запуска нужен end-to-end прогон и проверка настроек окружения.
