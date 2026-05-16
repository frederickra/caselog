import * as SQLite from 'expo-sqlite';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import type { CaseRecord, CaseFormValues, DashboardStats, Period, SortOption } from './types';

let db: SQLite.SQLiteDatabase;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('caselog.db');
    db.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS cases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        ticket_number TEXT DEFAULT '',
        surgeon TEXT DEFAULT '',
        diagnosis TEXT DEFAULT '',
        procedure_name TEXT DEFAULT '',
        is_add_on INTEGER DEFAULT 0,
        location TEXT DEFAULT '',
        anesthetic_type TEXT DEFAULT '',
        start_time TEXT DEFAULT '',
        end_time TEXT DEFAULT '',
        asa_code TEXT DEFAULT '',
        asa_billing_code TEXT DEFAULT '',
        base_value REAL DEFAULT 0,
        total_time REAL DEFAULT 0,
        time_units REAL DEFAULT 0,
        modifiers REAL DEFAULT 0,
        procedure_units REAL DEFAULT 0,
        total_units REAL DEFAULT 0,
        adjusted_units REAL DEFAULT 0,
        work_units REAL DEFAULT 0,
        is_split INTEGER DEFAULT 0,
        split_provider TEXT DEFAULT '',
        split_units REAL DEFAULT 0,
        net_work_units REAL DEFAULT 0,
        insurance_company TEXT DEFAULT '',
        notes TEXT DEFAULT '',
        remote_id TEXT DEFAULT NULL,
        synced INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_cases_date ON cases(date);
    `);
    const migrations = [
      `ALTER TABLE cases ADD COLUMN asa_billing_code TEXT DEFAULT ''`,
      `ALTER TABLE cases ADD COLUMN work_units REAL DEFAULT 0`,
      `ALTER TABLE cases ADD COLUMN is_split INTEGER DEFAULT 0`,
      `ALTER TABLE cases ADD COLUMN split_provider TEXT DEFAULT ''`,
      `ALTER TABLE cases ADD COLUMN split_units REAL DEFAULT 0`,
      `ALTER TABLE cases ADD COLUMN net_work_units REAL DEFAULT 0`,
      `ALTER TABLE cases ADD COLUMN remote_id TEXT DEFAULT NULL`,
      `ALTER TABLE cases ADD COLUMN synced INTEGER DEFAULT 0`,
    ];
    for (const sql of migrations) {
      try { db.execSync(sql); } catch {}
    }
    db.execSync(`UPDATE cases SET net_work_units = work_units WHERE is_split = 0 AND net_work_units = 0 AND work_units > 0`);
  }
  return db;
}

export function initDatabase(): void { getDb(); }

function minutesBetween(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : 0;
}

function formToParams(v: CaseFormValues) {
  const startStr = format(v.start_time, 'HH:mm');
  const endStr = format(v.end_time, 'HH:mm');
  const base = parseFloat(v.base_value) || 0;
  const timeU = parseFloat(v.time_units) || 0;
  const mods = parseFloat(v.modifiers) || 0;
  const procU = parseFloat(v.procedure_units) || 0;
  const adjU = parseFloat(v.adjusted_units) || 0;
  const splitU = parseFloat(v.split_units) || 0;
  const totalUnits = base + timeU + mods + procU;
  const workUnits = base + timeU + adjU;
  const netWorkUnits = v.is_split ? workUnits - splitU : workUnits;
  return [
    format(v.date, 'yyyy-MM-dd'),
    v.ticket_number,
    v.surgeon,
    v.is_add_on ? 1 : 0,
    v.location,
    v.anesthetic_type,
    startStr,
    endStr,
    v.asa_code,
    v.asa_billing_code,
    base,
    minutesBetween(startStr, endStr),
    timeU,
    mods,
    procU,
    totalUnits,
    adjU,
    workUnits,
    v.is_split ? 1 : 0,
    v.split_provider,
    splitU,
    netWorkUnits,
    v.notes,
  ] as const;
}

export function insertCase(values: CaseFormValues): number {
  const d = getDb();
  const params = formToParams(values);
  const result = d.runSync(
    `INSERT INTO cases (
      date, ticket_number, surgeon,
      is_add_on, location, anesthetic_type, start_time, end_time,
      asa_code, asa_billing_code, base_value, total_time, time_units,
      modifiers, procedure_units, total_units, adjusted_units, work_units,
      is_split, split_provider, split_units, net_work_units,
      notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ...params,
  );
  return result.lastInsertRowId;
}

export function updateCase(id: number, values: CaseFormValues): void {
  const d = getDb();
  const params = formToParams(values);
  d.runSync(
    `UPDATE cases SET
      date=?, ticket_number=?, surgeon=?,
      is_add_on=?, location=?, anesthetic_type=?, start_time=?, end_time=?,
      asa_code=?, asa_billing_code=?, base_value=?, total_time=?, time_units=?,
      modifiers=?, procedure_units=?, total_units=?, adjusted_units=?, work_units=?,
      is_split=?, split_provider=?, split_units=?, net_work_units=?,
      notes=?
    WHERE id=?`,
    ...params,
    id,
  );
}

export function deleteCase(id: number): void {
  getDb().runSync('DELETE FROM cases WHERE id=?', id);
}

export function getCaseById(id: number): CaseRecord | null {
  return getDb().getFirstSync<CaseRecord>('SELECT * FROM cases WHERE id=?', id) ?? null;
}

export function getCases(opts: {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
  sortBy?: SortOption;
} = {}): CaseRecord[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (opts.search) {
    conditions.push('(ticket_number LIKE ? OR surgeon LIKE ? OR asa_billing_code LIKE ?)');
    const q = `%${opts.search}%`;
    params.push(q, q, q);
  }
  if (opts.dateFrom) { conditions.push('date >= ?'); params.push(opts.dateFrom); }
  if (opts.dateTo) { conditions.push('date <= ?'); params.push(opts.dateTo); }
  if (opts.location) { conditions.push('location = ?'); params.push(opts.location); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const order =
    opts.sortBy === 'date_asc' ? 'ORDER BY date ASC, start_time ASC' :
    opts.sortBy === 'units_desc' ? 'ORDER BY net_work_units DESC, date DESC' :
    'ORDER BY date DESC, start_time DESC';

  return getDb().getAllSync<CaseRecord>(`SELECT * FROM cases ${where} ${order}`, ...params);
}

function periodRange(period: Period): { from: string; to: string } {
  const now = new Date();
  let from: Date, to: Date;
  switch (period) {
    case 'day':   from = startOfDay(now);   to = endOfDay(now);   break;
    case 'week':  from = startOfWeek(now, { weekStartsOn: 0 }); to = endOfWeek(now, { weekStartsOn: 0 }); break;
    case 'month': from = startOfMonth(now); to = endOfMonth(now); break;
    case 'year':  from = startOfYear(now);  to = endOfYear(now);  break;
  }
  return { from: format(from, 'yyyy-MM-dd'), to: format(to, 'yyyy-MM-dd') };
}

export function getDashboardStats(period: Period): DashboardStats {
  const { from, to } = periodRange(period);
  const row = getDb().getFirstSync<{
    cases: number; totalUnits: number; workUnits: number;
    totalMinutes: number; daysWorked: number;
  }>(
    `SELECT COUNT(*) as cases,
      COALESCE(SUM(total_units),0) as totalUnits,
      COALESCE(SUM(net_work_units),0) as workUnits,
      COALESCE(SUM(total_time),0) as totalMinutes,
      COUNT(DISTINCT date) as daysWorked
    FROM cases WHERE date >= ? AND date <= ?`,
    from, to,
  );
  const cases = row?.cases ?? 0;
  const totalUnits = row?.totalUnits ?? 0;
  const workUnits = row?.workUnits ?? 0;
  const totalHours = (row?.totalMinutes ?? 0) / 60;
  const daysWorked = row?.daysWorked ?? 0;
  return {
    cases, totalUnits, workUnits, totalHours, daysWorked,
    unitsPerHour: totalHours > 0 ? workUnits / totalHours : 0,
    unitsPerDay: daysWorked > 0 ? workUnits / daysWorked : 0,
    unitsPerCase: cases > 0 ? workUnits / cases : 0,
  };
}

export function recordToFormValues(r: CaseRecord): CaseFormValues {
  const baseDate = r.date ? new Date(r.date + 'T00:00:00') : new Date();
  const parseTime = (t: string): Date => {
    if (!t) return new Date();
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  };
  return {
    date: baseDate,
    ticket_number: r.ticket_number ?? '',
    surgeon: r.surgeon ?? '',
    is_add_on: r.is_add_on === 1,
    location: r.location ?? '',
    anesthetic_type: r.anesthetic_type ?? '',
    start_time: parseTime(r.start_time),
    end_time: parseTime(r.end_time),
    asa_code: r.asa_code ?? '',
    asa_billing_code: r.asa_billing_code ?? '',
    base_value: r.base_value ? String(r.base_value) : '',
    time_units: r.time_units ? String(r.time_units) : '',
    modifiers: r.modifiers ? String(r.modifiers) : '',
    procedure_units: r.procedure_units ? String(r.procedure_units) : '',
    adjusted_units: r.adjusted_units ? String(r.adjusted_units) : '',
    is_split: r.is_split === 1,
    split_provider: r.split_provider ?? '',
    split_units: r.split_units ? String(r.split_units) : '',
    notes: r.notes ?? '',
  };
}
