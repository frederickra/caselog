# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start dev server (open in Expo Go by scanning the QR code)
npx expo start --clear

# Type-check without building
npx tsc --noEmit

# Platform-specific dev servers
npx expo start --ios
npx expo start --android
```

There are no tests. TypeScript (`tsc --noEmit`) is the primary correctness check.

When installing new Expo SDK packages always use `npx expo install <package>` instead of `npm install` so the compatible version is resolved automatically. For non-Expo packages use `npm install --legacy-peer-deps`.

## Architecture

### Routing — Expo Router (file-based)

```
app/
  _layout.tsx          # Root Stack: renders (tabs) + edit/[id] as a modal
  (tabs)/
    _layout.tsx        # Tab bar: Dashboard | New Case | Case Log
    index.tsx          # Dashboard — stats aggregated by period
    entry.tsx          # New Case form
    log.tsx            # Case Log — search, filter, export
  edit/[id].tsx        # Edit/delete an existing case (modal)
```

`package.json` sets `"main": "expo-router/entry"` and `app.json` has `"scheme": "caselog"` — both required for Expo Router to work.

### Data layer — `lib/`

**`lib/types.ts`** — single source of truth for all interfaces. Key distinction:
- `CaseRecord` — the DB row shape (booleans stored as `0`/`1` integers, numeric fields as `number`)
- `CaseFormValues` — the form state shape (booleans as `boolean`, numeric fields as `string` for TextInput compatibility)

**`lib/database.ts`** — all SQLite access via `expo-sqlite`. The DB is a module-level singleton opened lazily on first call to `getDb()`. Schema creation, `ALTER TABLE` migrations, and backfills all run inside `getDb()` on first open — there is no separate migration runner. When adding a new column, add it to both the `CREATE TABLE` statement and the migrations array (the `try/catch` swallows the duplicate-column error on fresh installs).

Computed fields saved to the DB (not entered by the user):
- `total_time` — minutes between `start_time` and `end_time`
- `total_units` — `base_value + time_units + modifiers + procedure_units`
- `work_units` — `base_value + time_units + adjusted_units`
- `net_work_units` — `work_units - split_units` when `is_split=1`, else `= work_units`

The Dashboard always aggregates `SUM(net_work_units)` — this is the accurate running total that accounts for split cases.

**`lib/export.ts`** — Excel export via SheetJS (`xlsx`). Uses `expo-file-system/legacy` (the `/legacy` subpath is required for `writeAsStringAsync`/`cacheDirectory`/`EncodingType` in expo-file-system v19+). Generates a base64-encoded `.xlsx`, writes it to the cache directory, then opens the native share sheet via `expo-sharing`.

### Shared component — `components/CaseForm.tsx`

`CaseForm` is used for both create (`entry.tsx`) and edit (`edit/[id].tsx`). It owns all form state internally via `useState`. It receives `initialValues` — for new cases this is the `defaultValues()` object from `entry.tsx`; for edits this is the output of `recordToFormValues(record)` from `database.ts`.

The entry screen forces a full remount of `CaseForm` after each save by incrementing a `key` prop — this is how the form clears between cases.

Auto-computed values displayed as read-only info boxes (never entered manually):
- **Total Time** — from start/end time pickers
- **Time Units** — auto-suggested as `minutes / 15`, user-editable
- **Total Units** — `base + time + modifiers + procedure`
- **Total Work Units** — `base + time + reimbursed_modifiers`
- **Split Case Total Work Units** — only shown when the Split Case toggle is on; equals `Total Work Units - Their Units`

### Static option lists (defined in `CaseForm.tsx`)
- `LOCATIONS`: `['SF', 'HC', 'FSC', 'Forte']`
- `ANESTHETIC_TYPES`: General, MAC, Regional, Spinal, Epidural, Sedation, Combined
- `ASA_STATUSES`: 1–6 plus emergency variants (1E–5E)

### Styling conventions

No styling library — all `StyleSheet.create`. Color palette used throughout:
- Primary blue: `#1d4ed8`
- Background: `#f8fafc`
- Card/surface: `#ffffff`
- Border: `#e2e8f0`
- Muted text: `#64748b`
- Split case accent: `#065f46` (dark green)
