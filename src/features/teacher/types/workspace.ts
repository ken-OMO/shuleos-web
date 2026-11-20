export interface TeacherTask {
  task_type: string;
  title: string;
  priority: string;
  entity_reference: string | null;
  status: string;
  deep_link: string | null;
  [key: string]: unknown;
}

export interface TeacherTimetableEntry {
  id: string;
  day_of_week: number;
  period_id: string | null;
  grade_id: string | null;
  stream_id: string | null;
  learning_area_id: string | null;
  room_id: string | null;
  substitution_id: string | null;
  substitution_date: string | null;
}

export interface TeacherAssignment {
  id: string;
  learner_count?: number;
  [key: string]: unknown;
}
