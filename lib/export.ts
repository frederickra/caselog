import * as XLSX from 'xlsx';
import { writeAsStringAsync, cacheDirectory, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { format, parseISO } from 'date-fns';
import type { CaseRecord } from './types';

function fmtDate(d: string): string {
  try { return format(parseISO(d), 'MM/dd/yyyy'); } catch { return d ?? ''; }
}

function yn(v: number): string { return v === 1 ? 'Yes' : 'No'; }

export async function exportCasesToExcel(cases: CaseRecord[]): Promise<void> {
  const rows = cases.map(c => ({
    'Date': fmtDate(c.date),
    'Ticket #': c.ticket_number,
    'Surgeon': c.surgeon,
    'Diagnosis': c.diagnosis,
    'Procedure': c.procedure_name,
    'Add-on': yn(c.is_add_on),
    'Location': c.location,
    'Anesthetic Type': c.anesthetic_type,
    'ASA Status': c.asa_code,
    'ASA Code (5-digit)': c.asa_billing_code,
    'Start Time': c.start_time,
    'End Time': c.end_time,
    'Total Time (min)': c.total_time,
    'Base Value': c.base_value,
    'Time Units': c.time_units,
    'Modifiers': c.modifiers,
    'Procedure Units': c.procedure_units,
    'Total Units': c.total_units,
    'Reimbursed Modifiers': c.adjusted_units,
    'Work Units': c.work_units,
    'Split Case': yn(c.is_split),
    'Split Provider': c.split_provider,
    'Split Units': c.split_units,
    'Net Work Units': c.net_work_units,
    'Insurance Company': c.insurance_company,
    'Notes': c.notes,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = [
    { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 26 }, { wch: 30 },
    { wch: 8 },  { wch: 8 },  { wch: 16 }, { wch: 11 }, { wch: 16 },
    { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 11 }, { wch: 11 },
    { wch: 10 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 12 },
    { wch: 11 }, { wch: 22 }, { wch: 12 }, { wch: 15 }, { wch: 22 },
    { wch: 32 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Case Log');

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const fileName = `case-log-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  const filePath = `${cacheDirectory}${fileName}`;

  await writeAsStringAsync(filePath, base64, {
    encoding: EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing not available on this device');

  await Sharing.shareAsync(filePath, {
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    dialogTitle: 'Export Case Log',
    UTI: 'com.microsoft.excel.xlsx',
  });
}
