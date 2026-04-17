# Follow-ups

Known issues to fix later. Each item: severity, location, problem, suggested fix.

## High

### isPastMonth timezone inconsistency
- **Where**: `server/api/budget/months/[id]/plan.put.ts:24-36` (local time), `server/services/budget/months.ts:20-22` (UTC), `shared/utils/budget/month-helpers.ts` (local time)
- **Problem**: Same predicate is computed in two timezones across client/server. On a month boundary a user in UTC+N can see the UI allow editing while the server returns 400 `CANNOT_PLAN_PAST_MONTH` (or vice-versa).
- **Fix**: Promote a single `isPastMonth(year, month)` to `shared/utils/budget/month-helpers.ts` using a consistent timezone (UTC is safest because the server runs on UTC). Reuse it everywhere; delete the local copies in `plan.put.ts`, `Month.vue`, etc.

### Overwrite import wipes plan when JSON is from old export
- **Where**: `server/services/budget/import-export.ts` — the line that does `importMonth.plannedBalanceChange ?? null` then unconditionally writes it to an existing month under `overwrite` strategy.
- **Problem**: An old JSON file (exported before the planning feature) has no `plannedBalanceChange`. On import-with-overwrite, the existing month's saved plan is wiped to `NULL`.
- **Fix**: Only update `plannedBalanceChange` if the field is explicitly present in the import: check `'plannedBalanceChange' in importMonth` before adding the update statement.

### PlanModal loses kopecks silently
- **Where**: `app/components/budget/PlanModal.vue` — `step="any"` on the input combined with `Math.round(value)` before save.
- **Problem**: User types `100.55`, it's silently rounded to `101`. No feedback.
- **Fix**: Use `step="1"` + `inputmode="numeric"` so the browser disallows fractional input, OR show an inline hint that values are stored as whole units.

### isCurrentMonth/isPastMonth captured once on mount
- **Where**: `app/components/budget/Month.vue` — `isCurrentMonthValue`/`isPastMonthValue` computed in `onMounted`.
- **Problem**: In a long-lived session crossing midnight on the last day of the month, the values become stale. Plan editability and styling won't update.
- **Fix**: Convert to `computed` with a `Date.now()`-derived dependency (e.g., a reactive "now" updated by an interval), or simply re-evaluate via `computed` and accept that re-render only happens on reactivity triggers (acceptable for our case because data refreshes regularly).

## Medium

### Mutations in reduce accumulators
- **Where**: `shared/utils/budget/budget-calculations.ts` (~line 170-224), `app/components/BudgetScreen.vue:237-244`. Roughly 12 sites total.
- **Problem**: Direct mutations like `acc[year] = [...]`, `acc.totalIncome += x`, `acc.count++` violate the project immutability rule.
- **Fix**: Return a new object each iteration: `return { ...acc, totalIncome: acc.totalIncome + x }`. For nested year maps, use `{ ...acc, [year]: [...(acc[year] ?? []), value] }`.

### push/splice in useBudgetColumnsSync
- **Where**: `app/composables/budget/useBudgetColumnsSync.ts` — three sites using `.push(...)`/`.splice(...)`.
- **Problem**: Style guide forbids `push`/`splice`.
- **Fix**: `registeredRows.value = [...registeredRows.value, el]` and `.filter()` for removal.

### Set.add mutation in budget store
- **Where**: `app/stores/budget/budget.ts` — `loadedYears.value.add(year)`.
- **Problem**: Mutates a `Set` in-place.
- **Fix**: `loadedYears.value = new Set([...loadedYears.value, year])`.

### isPastMonth duplication
- **Where**: Defined or re-implemented in `shared/utils/budget/month-helpers.ts`, `server/api/budget/months/[id]/plan.put.ts`, `app/stores/budget/budget.ts` (local in `getRollingAverageExpenses`).
- **Problem**: Three implementations drift apart (already drifted on timezone — see High above).
- **Fix**: Single shared helper, imported everywhere.

### currencyRatesModal.monthId typing
- **Where**: `app/stores/budget/modals.ts` — `currencyRatesModal.monthId: number | null`. IDs are UUID strings.
- **Problem**: Pre-existing bug. `Number(uuid) → NaN` in `Month.vue:206`. (Our new `planModal.monthId: string | null` is correct.)
- **Fix**: Change type to `string | null` and audit call sites for `Number()` casts.

### exchangeRates in import is parsed but ignored
- **Where**: `shared/types/export-import.ts` — `exchangeRates` is in the import schema.
- **Where**: `server/services/budget/import-export.ts` — importer never reads it.
- **Problem**: Dead field; misleading.
- **Fix**: Either drop it from the schema (only export uses it), or actually persist it on import.

## Low

### Dynamic import of notifications service in hot paths
- **Where**: `server/api/budget/months/[id]/plan.put.ts`, `server/api/budget/entries.post.ts`, others.
- **Problem**: `await import('~~/server/services/notifications')` inside the handler. Adds latency on every write.
- **Fix**: Static top-level import.

### groupEntriesByMonthId uses for..of + map.set
- **Where**: `server/services/budget/months.ts` — `groupEntriesByMonthId` helper.
- **Fix**: Rewrite as `entries.reduce((map, e) => map.set(e.monthId, [...(map.get(e.monthId) ?? []), e]), new Map())`.

### PlanModal autofocus unreliable
- **Where**: `app/components/budget/PlanModal.vue` — relies on `autofocus` attribute through a transition.
- **Fix**: `await nextTick(); inputRef.value?.focus()`.

### Year `:key` includes isPlanningMode
- **Where**: `app/components/budget/Year.vue` — key on `BudgetMonth` includes `budgetStore.isPlanningMode`.
- **Problem**: Toggling planning mode remounts every month component (heavy).
- **Fix**: Drop from key once column-sync handles toggle internally (already does via watch).

### Audit fields for plannedBalanceChange
- Optional: add `plannedBalanceChangeUpdatedAt`/`...UpdatedBy` so shared-budget viewers can see who changed the plan.
