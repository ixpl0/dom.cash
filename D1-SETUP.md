# Настройка Cloudflare D1 Database

Проект настроен для работы **только через D1** - как локально, так и в продакшне.

## Важно!

- **Больше нет db.sqlite** - всё работает через D1 binding
- Локально: wrangler эмулирует D1 через SQLite в `.wrangler/state/v3/d1/`
- В продакшне: тот же код работает с настоящей облачной D1
- Код всегда обращается к базе через `event.context.cloudflare.env.DB`

## Первоначальная настройка

### 1. Создать D1 базу данных в Cloudflare

```bash
# Создать базу (если ещё не создана)
wrangler d1 create doma-budget-db
```

Скопируйте `database_id` из вывода и обновите `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "doma-budget-db"
database_id = "ваш-database-id"  # <-- вставьте сюда
```

### 2. Применить миграции

```bash
# Сгенерировать миграции из схемы
pnpm run db:generate

# Применить к локальной D1 (создаст SQLite в .wrangler/state)
wrangler d1 migrations apply doma-budget-db --local

# Применить к облачной D1 (опционально)
wrangler d1 migrations apply doma-budget-db
```

## Разработка

### Локальная разработка с D1

```bash
# 1. Собрать проект
pnpm run build

# 2. Запустить с локальной D1 (SQLite в .wrangler/state)
pnpm run dev:d1

# Приложение доступно на http://localhost:3000
```

### Тестирование с облачной D1

```bash
# 1. Собрать проект  
pnpm run build

# 2. Запустить с облачной D1
pnpm run dev:d1:remote
```

## Как это работает

1. **Всегда через D1 binding**: Код использует `useDatabase(event)` который берёт D1 из контекста
2. **Локально (`--local`)**: Wrangler создаёт SQLite в `.wrangler/state/v3/d1/`
3. **Без `--local`**: Работает с настоящей облачной D1

## Команды

```bash
# Разработка
pnpm run build         # Собрать проект
pnpm run dev:d1        # Локальная D1 (оффлайн)
pnpm run dev:d1:remote # Облачная D1

# Миграции
pnpm run db:generate   # Создать SQL миграции из schema.ts
wrangler d1 migrations apply doma-budget-db --local  # Применить локально
wrangler d1 migrations apply doma-budget-db          # Применить в облаке

# D1 Studio (просмотр базы)
wrangler d1 execute doma-budget-db --local --command "SELECT * FROM user"
```

## Деплой в продакшн

```bash
# 1. Собрать
pnpm run build

# 2. Деплой на Cloudflare Pages
wrangler pages deploy dist
```

## Решение проблем

### "D1 database not found in context"
- Убедитесь что запускаете через `pnpm run dev:d1`, а не `pnpm run dev`
- Проверьте что в `wrangler.toml` указан правильный binding `DB`

### База пустая после миграций
- Проверьте что миграции применились: `wrangler d1 migrations list doma-budget-db --local`
- Посмотрите что в базе: `wrangler d1 execute doma-budget-db --local --command "SELECT name FROM sqlite_master WHERE type='table'"`

### Изменения в схеме не применяются
1. `pnpm run db:generate` - создать новые миграции
2. `wrangler d1 migrations apply doma-budget-db --local` - применить
3. Перезапустите dev сервер