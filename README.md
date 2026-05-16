# CaseLog

A mobile app for anesthesiologists to log and track daily case data, billing units, and productivity metrics. Built with Expo and React Native.

## Features

- **Case entry** — log all details for each anesthesia case: surgeon, procedure, diagnosis, location, anesthetic type, ASA status, timing, and full billing breakdown
- **Billing calculations** — auto-computes total time, time units (min ÷ 15), total units, work units, and net work units
- **Split case support** — toggle a split case to record the other provider and their units; the dashboard uses net work units for all totals
- **Case log** — searchable and filterable by date range, location, surgeon, ticket number, 5-digit ASA code, and procedure; sortable by date or units
- **Dashboard** — period selector (Today / Week / Month / Year) with stats: cases, days worked, total units, total work units, units/day, units/case, total hours, units/hour
- **Excel export** — exports the current filtered case list as a `.xlsx` file via the native share sheet
- **Fully offline** — all data stored locally in SQLite; no account or internet connection required

## Tech Stack

| | |
|---|---|
| Framework | Expo SDK 54 / React Native 0.81 |
| Navigation | Expo Router v6 (file-based tabs + stack) |
| Database | expo-sqlite v16 (synchronous API) |
| Export | SheetJS (xlsx) + expo-file-system + expo-sharing |
| Language | TypeScript (strict mode) |

## Getting Started

**Prerequisites:** Node.js, and the [Expo Go](https://expo.dev/go) app on your iOS or Android device.

```bash
cd my-app
npm install
npx expo start --clear
```

Scan the QR code with Expo Go (iOS: Camera app; Android: Expo Go app).

For iOS Simulator: press `i` after the dev server starts (requires Xcode).  
For Android emulator: press `a` (requires Android Studio).

## Project Structure

```
app/
  _layout.tsx          # Root stack layout
  (tabs)/
    index.tsx          # Dashboard
    entry.tsx          # New case form
    log.tsx            # Case log, search, filter, export
  edit/[id].tsx        # Edit / delete a case (modal)
lib/
  types.ts             # TypeScript interfaces (CaseRecord, CaseFormValues, etc.)
  database.ts          # SQLite singleton, schema, migrations, all queries
  export.ts            # Excel export via SheetJS
components/
  CaseForm.tsx         # Shared create/edit form (19 fields, all billing computations)
  CaseListItem.tsx     # Case row in the log list
  StatCard.tsx         # Stat display card for the dashboard
```

## Billing Fields

| Field | Description |
|---|---|
| Base Value | Units assigned to the procedure |
| Time Units | Auto-suggested as total minutes ÷ 15 |
| Modifiers | Numeric modifier unit adjustment |
| Procedure Units | Additional procedure units |
| **Total Units** | Base + Time + Modifiers + Procedure (auto-computed) |
| Reimbursed Modifiers | Actual reimbursed amount after payer adjustments |
| **Work Units** | Base + Time + Reimbursed Modifiers (auto-computed) |
| Split Units | Units allocated to the other provider (split cases only) |
| **Net Work Units** | Work Units − Split Units (auto-computed; used in all dashboard totals) |
