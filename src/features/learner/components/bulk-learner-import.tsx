"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/services/api/api-client";
import { normalizeApiError } from "@/services/api/api-error";

const headers = ["admission_no", "first_name", "middle_name", "last_name", "gender", "date_of_birth", "mode_of_study", "assessment_no", "upi", "kemis_no",
  "guardian_first_name", "guardian_last_name", "guardian_phone", "guardian_relationship", "guardian_email",
  "emergency_first_name", "emergency_last_name", "emergency_phone", "emergency_relationship", "emergency_email",
] as const;
type LearnerRow = { row: number } & Record<(typeof headers)[number], string>;
type ClassChoice = { id: string; label: string };
const endpoint = "/teacher/class-teacher/bulk-admission";

async function readWorkbook(file: File): Promise<LearnerRow[]> {
  if (!file.name.toLowerCase().endsWith(".xlsx") || file.size > 2 * 1024 * 1024) {
    throw new Error("Choose an Excel .xlsx file no larger than 2 MB.");
  }
  const { default: readExcelFile } = await import("read-excel-file/browser");
  const sheets = await readExcelFile(file);
  const data = sheets.find(sheet => sheet.sheet === "Learners")?.data ?? [];
  const [headerRow, ...learnerRows] = data;
  if (!headerRow || headers.some((header, index) => headerRow[index] !== header)
    || headerRow.slice(headers.length).some(value => value !== null)) {
    throw new Error("Use the ShuleOS template and keep the Learners sheet and column headings.");
  }

  const rows: LearnerRow[] = [];
  learnerRows.forEach((cells, index) => {
    const number = index + 2;
    if (cells.slice(headers.length).some(value => value !== null)) throw new Error(`Row ${number} contains extra columns.`);
    const fields = headers.map((header, index) => {
      const value = cells[index];
      if (value instanceof Date && header === "date_of_birth") return value.toISOString().slice(0, 10);
      if (value == null) return "";
      if (typeof value !== "string" && typeof value !== "number") {
        throw new Error(`Row ${number}: enter a plain value in ${header}.`);
      }
      return String(value).trim();
    });
    if (fields.every(value => !value)) return;
    if (rows.length >= 500) throw new Error("Use at most 500 learners per workbook.");
    rows.push({ row: number, ...Object.fromEntries(headers.map((header, index) => [header, fields[index]])) } as LearnerRow);
  });
  if (!rows.length) throw new Error("The Learners sheet has no learner rows.");
  return rows;
}

export function BulkLearnerImport({ classes, isCurrentSchool }: {
  classes: ClassChoice[];
  isCurrentSchool: () => boolean;
}) {
  const [batch, setBatch] = useState<{ stream_id: string; rows: LearnerRow[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const submitting = useRef(false);
  const form = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !isCurrentSchool()) return;
    const fields = new FormData(event.currentTarget);
    submitting.current = true;
    setBusy(true);
    setErrors([]);
    setNotice("");
    try {
      const file = fields.get("workbook");
      const stream_id = String(fields.get("stream_id"));
      if (!batch && !(file instanceof File && file.size > 0)) throw new Error("Choose a completed Excel workbook.");
      const payload = batch ?? { stream_id, rows: await readWorkbook(file as File) };
      if (!isCurrentSchool()) return;
      if (!classes.some(choice => choice.id === payload.stream_id)) throw new Error("Choose one of your assigned classes.");
      const { data } = await apiClient.post(endpoint, { ...payload, preview: !batch });
      if (!isCurrentSchool()) return;
      if (data.success !== true || data.data?.count !== payload.rows.length) throw new Error("The import response could not be confirmed.");
      if (batch) {
        setNotice(`${data.data.count} learners admitted to ${classes.find(choice => choice.id === payload.stream_id)?.label}.`);
        setBatch(null);
        form.current?.reset();
      } else {
        setBatch(payload);
      }
    } catch (error) {
      if (!isCurrentSchool()) return;
      setBatch(null);
      const failure = normalizeApiError(error);
      const messages = Object.entries(failure.validationErrors).flatMap(([field, values]) => {
        const row = /^row_(\d+)\./.exec(field)?.[1];
        return values.map(value => row ? `Row ${row}: ${value}` : value);
      });
      setErrors(messages.length ? messages : [failure.message]);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return <section className="mb-5 space-y-3 rounded-md border p-4">
    <h3 className="font-semibold">Import learners from Excel</h3>
    <form ref={form} className="space-y-3" onSubmit={submit}>
      <fieldset disabled={busy || batch !== null} className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">Class
          <select name="stream_id" required defaultValue={classes.length === 1 ? classes[0].id : ""} className="rounded-md border bg-background p-2">
            <option value="">Select your class</option>
            {classes.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1">Excel workbook<Input name="workbook" type="file" accept=".xlsx" required /></label>
      </fieldset>
      {batch && <div className="space-y-2">
        <p role="status">Ready to admit {batch.rows.length} learners to {classes.find(choice => choice.id === batch.stream_id)?.label}.</p>
        <ul aria-label="Learners to import" className="max-h-56 list-disc overflow-auto pl-6">
          {batch.rows.map(row => <li key={row.row}>{row.admission_no} · {row.first_name} {row.last_name}</li>)}
        </ul>
      </div>}
      {errors.length > 0 && <ul role="alert" className="max-h-56 list-disc overflow-auto pl-6 text-destructive">
        {errors.map((error, index) => <li key={index}>{error}</li>)}
      </ul>}
      {notice && <p role="status">{notice}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !classes.length}>{busy ? "Processing…" : batch ? "Confirm import" : "Validate and preview"}</Button>
        {batch && <Button type="button" variant="outline" disabled={busy} onClick={() => setBatch(null)}>Back</Button>}
      </div>
    </form>
  </section>;
}
