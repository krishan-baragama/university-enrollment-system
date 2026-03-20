# Domain: University Enrollment System

## What is this domain about?

A university system where students can enroll in courses each semester.
The system must enforce academic rules to prevent overcrowding, credit overload, and duplicate enrollments.

---

## Core Entities

### 1. Student
A Student represents a university student. They can enroll in multiple courses per semester up to a credit limit.

| Field             | Description                                        |
|-------------------|----------------------------------------------------|
| `id`              | Unique identifier — format: `STU` + 6 digits       |
| `name`            | Full name of the student                           |
| `email`           | Valid university email address                     |
| `enrolledCredits` | Total credits enrolled this semester (max 18)      |

### 2. Course
A Course represents a university class that students can enroll in.

| Field            | Description                                         |
|------------------|-----------------------------------------------------|
| `code`           | Unique course code — format: 2–4 letters + 3 digits |
| `name`           | Full name of the course                             |
| `credits`        | Credit value — must be one of: 1, 2, 3, 4, 6       |
| `capacity`       | Maximum number of students allowed (1–200)          |
| `enrolledCount`  | Current number of enrolled students                 |

### 3. Enrollment
An Enrollment represents the link between a Student and a Course for a specific semester.

| Field        | Description                                              |
|--------------|----------------------------------------------------------|
| `id`         | Unique identifier — format: `ENR-` + uuid                |
| `studentId`  | Reference to the Student                                 |
| `courseCode` | Reference to the Course                                  |
| `semester`   | The semester — format: Fall/Spring/Summer + YYYY         |
| `status`     | Current status — either `active` or `cancelled`          |

---

## Value Objects (Branded Types)

These are validated values — they can never be created with invalid data.

| Type           | Format                        | Example          | Why it exists                           |
|----------------|-------------------------------|------------------|-----------------------------------------|
| `StudentId`    | `STU` + 6 digits              | `STU123456`      | Prevents using any random string as ID  |
| `CourseCode`   | 2–4 letters + 3 digits        | `CS101`          | Enforces valid course code format       |
| `Email`        | Valid email format            | `alice@epita.fr` | Prevents invalid emails entering system |
| `Credits`      | One of: 1, 2, 3, 4, 6        | `3`              | Only valid credit values allowed        |
| `Semester`     | `Fall/Spring/Summer` + `YYYY` | `Fall2024`       | Prevents invalid semester strings       |
| `EnrollmentId` | `ENR-` + uuid                 | `ENR-abc123`     | Unique enrollment identifier            |

---

## Business Rules (the laws of this domain)

These rules are always true. The system enforces them — not the UI, not the database.

### Rule 1 — Capacity Rule
A course cannot exceed its maximum capacity.
> "If a course has 30 seats and 30 students are already enrolled, no more enrollments are allowed."

### Rule 2 — Credit Limit Rule
A student cannot enroll in more than 18 credits per semester.
> "If a student already has 16 credits this semester, they can only enroll in a 1 or 2 credit course."

### Rule 3 — Uniqueness Rule
A student cannot enroll in the same course in the same semester twice.
> "If Alice is already enrolled in CS101 for Fall2024, she cannot enroll again."

### Rule 4 — Cancellation Rule
Only active enrollments can be cancelled.
> "You cannot cancel an enrollment that is already cancelled."

---

## State Changes (what can happen)

### `enroll(student, course, semester, enrollments)`
- Creates a new Enrollment
- Must pass all 4 business rules
- Triggers: `StudentEnrolledEvent`
- If course reaches 80% capacity → also triggers: `CourseCapacityWarningEvent`
- If course becomes full → also triggers: `CourseFullEvent`

### `cancelEnrollment(enrollment)`
- Changes enrollment status from `active` to `cancelled`
- Must be currently active (Rule 4)
- Triggers: `EnrollmentCancelledEvent`

---

## Domain Events (things that happened, past tense)

| Event                        | When it fires                           |
|------------------------------|-----------------------------------------|
| `StudentEnrolledEvent`       | After every successful enrollment       |
| `CourseCapacityWarningEvent` | When course reaches 80% of capacity     |
| `CourseFullEvent`            | When course reaches 100% of capacity    |
| `EnrollmentCancelledEvent`   | After a successful cancellation         |

---

## Observer Reactions (side effects — NOT part of the domain)

### Email Notification Observer
- Listens for: `StudentEnrolledEvent`, `EnrollmentCancelledEvent`
- Mock output: `"📧 Email sent to [student]: You are enrolled in [course]"`

### Capacity Alert Observer
- Listens for: `CourseCapacityWarningEvent`, `CourseFullEvent`
- Mock output: `"⚠️ ALERT: Course [code] is 80% full"` or `"🚫 Course [code] is now FULL"`

### Audit Log Observer
- Listens for: all events
- Mock output: `"📋 LOG: [timestamp] [event details]"`

---

## What CAN'T happen (impossible states)

- Student enrolls beyond 18 credits → **blocked by Rule 2**
- Course exceeds capacity → **blocked by Rule 1**
- Duplicate enrollment same semester → **blocked by Rule 3**
- Cancel already cancelled enrollment → **blocked by Rule 4**
- Invalid StudentId format → **blocked by smart constructor**
- Invalid CourseCode format → **blocked by smart constructor**
- Credits value not in {1,2,3,4,6} → **blocked by smart constructor**

---

## Summary in one sentence

> A university enrollment system tracks students, courses, and enrollments — enforcing credit limits, capacity rules, and uniqueness constraints — while emitting events so that notifications and audit logs can react without the domain ever knowing those systems exist.