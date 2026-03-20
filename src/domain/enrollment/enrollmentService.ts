// ============================================================
// BUSINESS LOGIC — Enrollment Service
// This is where all 4 business rules are enforced.
// enroll()            — creates a new enrollment
// cancelEnrollment()  — cancels an active enrollment
//
// This file knows about domain rules.
// It does NOT know about email, alerts, or databases.
// ============================================================

import { Student } from "../student/student.js"
import { Course } from "../course/course.js"
import { Enrollment } from "./enrollment.js"
import { createEnrollment } from "./factories.js"
import { Credits } from "../student/types.js"
import { MAX_CREDITS_PER_SEMESTER } from "../student/factories.js"
import { notify } from "../../infrastructure/observers/observer.js"

// ============================================================
// enroll() — STATE CHANGE #1
// Business rules enforced:
//   Rule 1 — Capacity: course must have available seats
//   Rule 2 — Credit Limit: student max 18 credits/semester
//   Rule 3 — Uniqueness: no duplicate enrollment
// Emits: StudentEnrolledEvent
// Emits: CourseCapacityWarningEvent (if course >= 80% full)
// Emits: CourseFullEvent (if course is now 100% full)
// Returns: updated Student, updated Course, new Enrollment
// ============================================================
export function enroll(
  student: Student,
  course: Course,
  semester: string,
  existingEnrollments: Enrollment[]
): { student: Student; course: Course; enrollment: Enrollment } {

  // --- Rule 1: Capacity check ---
  if (course.enrolledCount >= course.capacity) {
    throw new Error(
      `Enrollment failed: Course ${course.code} is full. ` +
      `Capacity: ${course.capacity}, Enrolled: ${course.enrolledCount}`
    )
  }

  // --- Rule 2: Credit limit check ---
  const newTotalCredits = student.enrolledCredits + course.credits
  if (newTotalCredits > MAX_CREDITS_PER_SEMESTER) {
    throw new Error(
      `Enrollment failed: Student ${student.id} would exceed the credit limit. ` +
      `Current: ${student.enrolledCredits}, Course credits: ${course.credits}, ` +
      `Max allowed: ${MAX_CREDITS_PER_SEMESTER}`
    )
  }

  // --- Rule 3: Uniqueness check ---
  const semesterObj = semester
  const isDuplicate = existingEnrollments.some(
    (e) =>
      e.studentId === student.id &&
      e.courseCode === course.code &&
      e.semester === semesterObj &&
      e.status === "active"
  )
  if (isDuplicate) {
    throw new Error(
      `Enrollment failed: Student ${student.id} is already enrolled in ` +
      `${course.code} for ${semester}`
    )
  }

  // --- All rules passed — create the enrollment ---
  const enrollment = createEnrollment(student.id, course.code, semester)

  // --- Update student credits (immutable — return new object) ---
  const updatedStudent: Student = {
    ...student,
    enrolledCredits: newTotalCredits as Credits,
  }

  // --- Update course enrolled count (immutable — return new object) ---
  const updatedCourse: Course = {
    ...course,
    enrolledCount: course.enrolledCount + 1,
  }

  // --- Emit StudentEnrolled event ---
  notify({
    type: "StudentEnrolled",
    enrollmentId: enrollment.id,
    studentId: student.id,
    studentEmail: student.email,
    courseCode: course.code,
    semester: enrollment.semester,
  })

  // --- Emit CourseCapacityWarning if course >= 80% full ---
  const percentFull = Math.round(
    (updatedCourse.enrolledCount / updatedCourse.capacity) * 100
  )
  if (percentFull >= 80 && updatedCourse.enrolledCount < updatedCourse.capacity) {
    notify({
      type: "CourseCapacityWarning",
      courseCode: course.code,
      enrolledCount: updatedCourse.enrolledCount,
      capacity: updatedCourse.capacity,
      percentFull,
    })
  }

  // --- Emit CourseFull if course is now 100% full ---
  if (updatedCourse.enrolledCount >= updatedCourse.capacity) {
    notify({
      type: "CourseFull",
      courseCode: course.code,
      capacity: updatedCourse.capacity,
    })
  }

  return {
    student: updatedStudent,
    course: updatedCourse,
    enrollment,
  }
}

// ============================================================
// cancelEnrollment() — STATE CHANGE #2
// Business rules enforced:
//   Rule 4 — Only active enrollments can be cancelled
// Emits: EnrollmentCancelledEvent
// Returns: updated Enrollment with status "cancelled"
// ============================================================
export function cancelEnrollment(
  enrollment: Enrollment,
  student: Student
): { enrollment: Enrollment; student: Student } {

  // --- Rule 4: Only active enrollments can be cancelled ---
  if (enrollment.status !== "active") {
    throw new Error(
      `Cancellation failed: Enrollment ${enrollment.id} is already cancelled`
    )
  }

  // --- Update enrollment status (immutable — return new object) ---
  const cancelledEnrollment: Enrollment = {
    ...enrollment,
    status: "cancelled",
  }

  // --- Emit EnrollmentCancelled event ---
  notify({
    type: "EnrollmentCancelled",
    enrollmentId: enrollment.id,
    studentId: student.id,
    studentEmail: student.email,
    courseCode: enrollment.courseCode,
  })

  return {
    enrollment: cancelledEnrollment,
    student,
  }
}