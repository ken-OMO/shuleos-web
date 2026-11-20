import test from "node:test";
import assert from "node:assert/strict";
import { teacherAssignmentLabel } from "../../src/features/teacher/services/teacher-assignment-label.ts";

test("teacher assignment labels use nested Laravel relation names", () => {
  for (const school of ["Alpha", "Beta"]) {
    assert.equal(teacherAssignmentLabel({
      learning_area: { learning_area_name: `Demo ${school} Mathematics` },
      grade: { grade_name: `Demo ${school} Grade` },
      stream: { stream_name: `Demo ${school} Stream` },
    }), `Demo ${school} Mathematics - Demo ${school} Grade - Demo ${school} Stream`);
  }
});

test("teacher assignment labels support flat fields and absent streams", () => {
  assert.equal(teacherAssignmentLabel({
    learning_area_name: " Mathematics ",
    grade_name: "Grade 6",
    stream: null,
  }), "Mathematics - Grade 6");
});

test("teacher assignment labels reject malformed names without inventing data", () => {
  for (const value of [null, [], {}, {
    learning_area: { learning_area_name: " " },
    learning_area_name: 42,
    grade: { grade_name: "Grade 6" },
  }]) {
    assert.equal(teacherAssignmentLabel(value), null);
  }
});
