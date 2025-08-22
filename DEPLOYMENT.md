# Деплой и окружения

## Workflow от разработки до продакшна

### 1. Локальная разработка
```bash
pnpm run dev           # Разработка с D1 эмуляцией
```

### 2. Работа с миграциями
```bash
pnpm run db:generate   # Генерация SQL миграций из схемы
pnpm run db:migrate    # Применение миграций локально
```

### 3. Продакшн сборка
```bash
pnpm run build         # Сборка проекта для деплоя
```

### 4. Деплой в тестовое окружение
```bash
pnpm run db:migrate:test    # Применить миграции на тестовую базу
pnpm run deploy:test        # Деплой в тестовое окружение (включает build)
```

### 5. Деплой в продакшн
```bash
pnpm run db:migrate:prod   # Применить миграции на продакшн базу
pnpm run deploy:prod       # Деплой в продакшн (включает build)
```

## Структура окружений

| Окружение | База данных | URL | Команда деплоя |
|-----------|-------------|-----|----------------|
| Локальная разработка | D1 (эмуляция) | localhost:3000 | `pnpm run dev` |
| Тест | D1 `dom-test` | dom-cash-test.workers.dev | `pnpm run deploy:test` |
| Продакшн | D1 `dom-prod` | dom-cash.workers.dev | `pnpm run deploy:prod` |

## Первоначальная настройка

### 1. Создайте базы данных D1

```bash
# Создать тестовую базу
wrangler d1 create dom-test

# Создать продакшн базу
wrangler d1 create dom-prod
```

### 2. Обновите wrangler.toml

После создания баз, замените `YOUR_TEST_DATABASE_ID` и `YOUR_PROD_DATABASE_ID` в `wrangler.toml` на реальные ID.

## Все доступные команды

### Основные
- `dev` - локальная разработка с D1 эмуляцией
- `build` - сборка проекта для деплоя

### База данных
- `db:generate` - генерация миграций
- `db:migrate` - применение миграций локально
- `db:migrate:test` - применение миграций на тестовую базу
- `db:migrate:prod` - применение миграций на продакшн
- `db:studio` - GUI для работы с базой
- `db:backup` - создание бэкапа

### Деплой
- `deploy` - деплой в тестовое окружение (dom-cash-test.workers.dev)
- `deploy:test` - деплой в тестовое окружение (dom-cash-test.workers.dev)
- `deploy:prod` - деплой в продакшн (dom-cash.workers.dev)

### Вспомогательные
- `typecheck` - проверка типов
- `lint` - проверка кода
- `test` - запуск тестов