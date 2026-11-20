type RecordValue = Record<string, unknown>;

const record = (value: unknown): RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as RecordValue
    : {};

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

export function teacherAssignmentLabel(value: unknown): string | null {
  const item = record(value);
  const area = text(record(item.learning_area).learning_area_name)
    ?? text(item.learning_area_name);
  if (!area) return null;

  const grade = text(record(item.grade).grade_name) ?? text(item.grade_name);
  const stream = text(record(item.stream).stream_name) ?? text(item.stream_name);

  return [area, grade, stream]
    .filter((part): part is string => part !== null)
    .join(" - ");
}
