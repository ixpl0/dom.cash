# Задание: Создать бойлерплейт nuxt-cf-starter из dom.cash

## Контекст

Проект `dom.cash` — это full-stack приложение для трекинга личного бюджета на Nuxt 4 + Cloudflare Workers + D1. Нужно извлечь из него универсальный бойлерплейт `nuxt-cf-starter`, убрав бизнес-логику бюджета, но сохранив все переиспользуемые фичи.

## Цель

Создать новый репозиторий `D:\projects\life\nuxt-cf-starter\` с модульной архитектурой, который можно:
1. Клонировать через `degit user/nuxt-cf-starter my-app`
2. Удалить ненужные модули (папки с маркерами)
3. Сразу начать разработку нового приложения

---

## Архитектура

### Core (обязательный минимум)
- Аутентификация (email/password + sessions в HTTP-only cookies)
- Темы (DaisyUI, 9 тем + auto mode)
- i18n (en/ru, no_prefix стратегия)
- Базовые UI компоненты (Dialog, Logo, ThemePicker, LanguagePicker)
- Middleware аутентификации
- Drizzle ORM + D1

### Modules (опциональные, можно удалить)
Каждый модуль маркируется комментарием в начале файла:
```typescript
// @module: <module-name>
// Remove this file if you don't need <feature> support
```

| Модуль | Описание | Файлы для удаления |
|--------|----------|-------------------|
| `oauth` | Google OAuth | `server/api/auth/google-*.ts` |
| `currencies` | 164+ валют, форматирование | `CurrencyPicker.vue`, `useCurrencies.ts`, `currencies.ts`, `currency-formatter.ts`, `i18n/locales/currencies/` |
| `toasts` | Toast уведомления | `useToast.ts`, `AppToast.vue` |
| `sse-notifications` | Real-time SSE | `server/api/notifications/`, `useNotifications.ts`, `server/services/notifications.ts` |
| `email-verification` | Верификация email по коду | `send-code.post.ts`, `verify-code.post.ts`, таблица `email_verification_codes` |
| `password-reset` | Сброс пароля | `forgot-password.post.ts`, `reset-password.post.ts` |

---

## Структура файлов

```
nuxt-cf-starter/
├── app/
│   ├── components/
│   │   ├── AppToast.vue                    # @module: toasts
│   │   └── ui/
│   │       ├── Dialog.vue                  # core
│   │       ├── Logo.vue                    # core
│   │       ├── ThemePicker.vue             # core
│   │       ├── LanguagePicker.vue          # core
│   │       ├── ConfirmationModal.vue       # core
│   │       └── CurrencyPicker.vue          # @module: currencies
│   ├── composables/
│   │   ├── useAuth.ts                      # core
│   │   ├── useAuthState.ts                 # core
│   │   ├── useTheme.ts                     # core
│   │   ├── useConfirmation.ts              # core
│   │   ├── useServerError.ts               # core
│   │   ├── useUser.ts                      # core
│   │   ├── useToast.ts                     # @module: toasts
│   │   ├── useCurrencies.ts                # @module: currencies
│   │   ├── useRecentCurrencies.ts          # @module: currencies
│   │   └── useNotifications.ts             # @module: sse-notifications
│   ├── pages/
│   │   ├── index.vue                       # Landing page с демо
│   │   ├── auth.vue                        # Login/Register
│   │   └── dashboard.vue                   # Пример protected page
│   ├── layouts/
│   │   └── default.vue
│   ├── middleware/
│   │   └── auth.global.ts
│   ├── stores/
│   │   └── modals.ts                       # Базовый store для модалей
│   └── utils/
│       ├── cookies.ts
│       ├── favicon.ts
│       ├── constants.ts
│       └── theme-migration.ts
│
├── server/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── index.post.ts               # core: login
│   │   │   ├── me.get.ts                   # core: get user
│   │   │   ├── logout.post.ts              # core: logout
│   │   │   ├── register.post.ts            # core: register (без верификации)
│   │   │   ├── google-config.get.ts        # @module: oauth
│   │   │   ├── google-redirect.post.ts     # @module: oauth
│   │   │   ├── send-code.post.ts           # @module: email-verification
│   │   │   ├── verify-code.post.ts         # @module: email-verification
│   │   │   ├── forgot-password.post.ts     # @module: password-reset
│   │   │   └── reset-password.post.ts      # @module: password-reset
│   │   ├── user/
│   │   │   └── currency.put.ts             # @module: currencies
│   │   └── notifications/                  # @module: sse-notifications
│   │       ├── events.get.ts
│   │       ├── subscribe/
│   │       └── unsubscribe/
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── services/
│   │   ├── users.ts
│   │   └── notifications.ts                # @module: sse-notifications
│   └── utils/
│       ├── auth.ts
│       ├── db.ts
│       └── parseBody.ts
│
├── shared/
│   ├── schemas/
│   │   └── auth.ts
│   ├── types/
│   │   ├── user.ts
│   │   └── i18n.ts                         # @module: toasts (для типов уведомлений)
│   └── utils/
│       ├── currencies.ts                   # @module: currencies
│       └── currency-formatter.ts           # @module: currencies
│
├── i18n/
│   ├── config.ts
│   └── locales/
│       ├── en.ts
│       ├── ru.ts
│       └── currencies/                     # @module: currencies
│           ├── en.ts
│           └── ru.ts
│
├── migrations/
│   └── 0001_initial.sql
│
├── nuxt.config.ts
├── wrangler.toml
├── tailwind.config.ts
├── eslint.config.mjs
├── tsconfig.json
├── package.json
├── pnpm-lock.yaml
├── .gitignore
├── .env.example
├── README.md
└── MODULES.md
```

---

## Пошаговый план выполнения

### Этап 1: Инициализация проекта

1. Создать папку `D:\projects\life\nuxt-cf-starter\`
2. Инициализировать git: `git init`
3. Скопировать и адаптировать конфиги из dom.cash:
   - `package.json` — убрать budget-специфичные зависимости, обновить name/description
   - `nuxt.config.ts` — убрать budget-специфичные настройки
   - `wrangler.toml` — шаблонизировать имена (заменить на `my-app-test`, `my-app-prod`)
   - `tsconfig.json` — скопировать как есть
   - `eslint.config.mjs` — скопировать как есть
   - `tailwind.config.ts` — скопировать как есть
   - `.gitignore` — скопировать как есть
4. Создать `.env.example` с переменными:
   ```
   NUXT_SESSION_SECRET=your-secret-key-min-32-chars
   GOOGLE_CLIENT_ID=optional-for-oauth
   GOOGLE_CLIENT_SECRET=optional-for-oauth
   RESEND_API_KEY=optional-for-email
   ```

### Этап 2: Core — База данных

1. Создать `server/db/schema.ts` с таблицами:
   - `user` (id, username, password_hash, google_id, main_currency, email_verified, is_admin, created_at, last_activity_at)
   - `session` (id, user_id, token_hash, expires_at, created_at)
   - `email_verification_codes` (для модуля email-verification)
2. Создать `server/db/index.ts` — экспорт drizzle instance
3. Создать `migrations/0001_initial.sql` — SQL миграция

### Этап 3: Core — Серверные утилиты

1. Скопировать из dom.cash:
   - `server/utils/auth.ts` (hashPassword, verifyPassword, createSession, etc.)
   - `server/utils/db.ts` (getDb helper)
   - `server/utils/parseBody.ts` (Zod validation)
2. Создать `server/middleware/auth.ts`

### Этап 4: Core — Auth API

Скопировать и адаптировать:
1. `server/api/auth/index.post.ts` — login
2. `server/api/auth/me.get.ts` — get current user
3. `server/api/auth/logout.post.ts` — logout
4. `server/api/auth/register.post.ts` — создать упрощённую версию (без email verification в core)

### Этап 5: Core — Shared

1. Создать `shared/schemas/auth.ts` — Zod schemas для auth
2. Создать `shared/types/user.ts` — типы пользователя

### Этап 6: Core — App composables

Скопировать из dom.cash:
1. `app/composables/useAuth.ts`
2. `app/composables/useAuthState.ts`
3. `app/composables/useTheme.ts`
4. `app/composables/useConfirmation.ts`
5. `app/composables/useServerError.ts`
6. `app/composables/useUser.ts`

### Этап 7: Core — App utils

Скопировать:
1. `app/utils/cookies.ts`
2. `app/utils/favicon.ts`
3. `app/utils/constants.ts`
4. `app/utils/theme-migration.ts`

### Этап 8: Core — UI компоненты

Скопировать:
1. `app/components/ui/Dialog.vue`
2. `app/components/ui/Logo.vue` — создать generic версию
3. `app/components/ui/ThemePicker.vue`
4. `app/components/ui/LanguagePicker.vue`
5. `app/components/ui/ConfirmationModal.vue`

### Этап 9: Core — i18n

1. Создать `i18n/config.ts`
2. Создать `i18n/locales/en.ts` — базовые переводы (auth, themes, common)
3. Создать `i18n/locales/ru.ts`

### Этап 10: Core — Pages и Layout

1. Создать `app/layouts/default.vue` — базовый layout с header
2. Создать `app/pages/index.vue` — landing page с демо компонентов
3. Создать `app/pages/auth.vue` — страница логина/регистрации
4. Создать `app/pages/dashboard.vue` — пример protected страницы
5. Создать `app/middleware/auth.global.ts`

### Этап 11: Core — Stores

1. Создать `app/stores/modals.ts` — базовый store для управления модалями

### Этап 12: Module — OAuth (Google)

Скопировать с маркером `// @module: oauth`:
1. `server/api/auth/google-config.get.ts`
2. `server/api/auth/google-redirect.post.ts`
3. Добавить google_id в схему user

### Этап 13: Module — Currencies

Скопировать с маркером `// @module: currencies`:
1. `shared/utils/currencies.ts`
2. `shared/utils/currency-formatter.ts`
3. `app/composables/useCurrencies.ts`
4. `app/composables/useRecentCurrencies.ts`
5. `app/components/ui/CurrencyPicker.vue`
6. `i18n/locales/currencies/en.ts`
7. `i18n/locales/currencies/ru.ts`
8. `server/api/user/currency.put.ts`

### Этап 14: Module — Toasts

Скопировать с маркером `// @module: toasts`:
1. `app/composables/useToast.ts`
2. `app/components/AppToast.vue`
3. `shared/types/i18n.ts` (типы уведомлений)

### Этап 15: Module — SSE Notifications

Скопировать с маркером `// @module: sse-notifications`:
1. `server/api/notifications/events.get.ts`
2. `server/api/notifications/subscribe/[username].post.ts`
3. `server/api/notifications/unsubscribe/[username].post.ts`
4. `server/services/notifications.ts`
5. `app/composables/useNotifications.ts`

### Этап 16: Module — Email Verification

Скопировать с маркером `// @module: email-verification`:
1. `server/api/auth/send-code.post.ts`
2. `server/api/auth/verify-code.post.ts`
3. Таблица `email_verification_codes` в schema.ts

### Этап 17: Module — Password Reset

Скопировать с маркером `// @module: password-reset`:
1. `server/api/auth/forgot-password.post.ts`
2. `server/api/auth/reset-password.post.ts`

### Этап 18: Документация

1. Создать `README.md`:
   - Описание проекта
   - Quick start (degit, pnpm i, настройка .env, миграции)
   - Структура проекта
   - Список фич
   - Команды
   - Деплой на Cloudflare

2. Создать `MODULES.md`:
   - Описание каждого модуля
   - Инструкции по удалению каждого модуля
   - Зависимости между модулями

### Этап 19: Финализация

1. Запустить `pnpm i`
2. Запустить `pnpm typecheck` — исправить ошибки типов
3. Запустить `pnpm lint:fix`
4. Проверить что приложение запускается: `pnpm run dev`
5. Проверить базовые сценарии:
   - Регистрация
   - Логин
   - Смена темы
   - Смена языка
6. Создать первый коммит

---

## Что НЕ копировать из dom.cash

- `app/components/budget/` — вся папка
- `app/stores/budget.ts`
- `app/stores/preferences.ts` (budget-specific)
- `server/api/budget/` — вся папка
- `server/services/entries.ts`
- `server/services/months.ts`
- `server/services/import-export.ts`
- `server/services/sharing.ts`
- `shared/types/budget.ts`
- `shared/types/export-import.ts`
- `shared/schemas/budget.ts`
- `shared/utils/budget.ts`
- `shared/utils/budget-calculations.ts`
- `shared/utils/entry-strategies.ts`
- `shared/utils/month-helpers.ts`
- Таблицы в БД: `month`, `entry`, `budget_share`, `currency` (курсы обмена)
- Миграции кроме 0001 (initial)
- `app/composables/useBudgetColumnsSync.ts`
- `app/composables/useChartConfig.ts`
- `app/composables/useChartTheme.ts`
- `app/composables/useEntryForm.ts`
- `app/composables/useMonthNames.ts` (можно оставить как utility)
- `app/composables/useOutdatedBanner.ts`
- `app/composables/useUnsavedChanges.ts` (можно оставить как generic)
- `tests/` — вся папка (тесты специфичны для budget)
- `playwright.config.ts`

---

## Важные адаптации

### Logo.vue
Создать generic версию с props:
```vue
<script setup lang="ts">
defineProps<{
  size?: 'sm' | 'md' | 'lg'
  text?: string
}>()
</script>
```

### wrangler.toml
Шаблонизировать:
```toml
name = "my-app"
# Change these values for your project
[[d1_databases]]
binding = "DB"
database_name = "my-app-db"
database_id = "YOUR_DATABASE_ID"
```

### package.json
```json
{
  "name": "nuxt-cf-starter",
  "version": "1.0.0",
  "description": "Nuxt 4 + Cloudflare Workers + D1 starter template",
  "private": true
}
```

### nuxt.config.ts
Убрать специфичные security headers для budget, оставить generic CSP.

---

## Проверочный чеклист

После завершения убедиться:
- [ ] `pnpm i` проходит без ошибок
- [ ] `pnpm typecheck` проходит
- [ ] `pnpm lint` проходит
- [ ] `pnpm run dev` запускает приложение
- [ ] Можно зарегистрироваться
- [ ] Можно залогиниться
- [ ] Темы переключаются
- [ ] Язык переключается
- [ ] Protected страница требует авторизации
- [ ] Каждый модуль имеет маркер `// @module:`
- [ ] README.md содержит все инструкции
- [ ] MODULES.md описывает как удалить каждый модуль
