"""Content, learning, and assessment services for the emergency backend."""
from __future__ import annotations

import json
import time
from typing import Any

from .db import connect


class LearningError(Exception):
    """Base error for expected learning-domain failures."""


class LearningNotFound(LearningError):
    pass


class LearningValidationError(LearningError):
    pass


def _now() -> int:
    return int(time.time())


def _dump(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _load(value: str | None, default: Any) -> Any:
    if not value:
        return default
    try:
        return json.loads(value)
    except (TypeError, ValueError, json.JSONDecodeError):
        return default


class LearningService:
    """Idempotent snapshot import and learner-facing domain operations."""

    def upsert_category(
        self,
        *,
        category_id: str,
        name: str,
        slug: str,
        description: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        now = _now()
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_content_categories
                    (id, name, slug, description, metadata_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name, slug=excluded.slug,
                    description=excluded.description, metadata_json=excluded.metadata_json,
                    updated_at=excluded.updated_at
                """,
                (category_id, name, slug, description, _dump(metadata or {}), now, now),
            )

    def upsert_course(
        self,
        *,
        course_id: str,
        title: str,
        slug: str,
        category_id: str | None = None,
        summary: str | None = None,
        description: str | None = None,
        status: str = "draft",
        level: str | None = None,
        duration_minutes: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        now = _now()
        with connect() as connection:
            connection.execute(
                """
                INSERT INTO emergency_courses
                    (id, category_id, title, slug, summary, description, status,
                     level, duration_minutes, metadata_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    category_id=excluded.category_id, title=excluded.title,
                    slug=excluded.slug, summary=excluded.summary,
                    description=excluded.description, status=excluded.status,
                    level=excluded.level, duration_minutes=excluded.duration_minutes,
                    metadata_json=excluded.metadata_json, updated_at=excluded.updated_at
                """,
                (course_id, category_id, title, slug, summary, description, status,
                 level, duration_minutes, _dump(metadata or {}), now, now),
            )

    def upsert_section(
        self,
        *,
        section_id: str,
        course_id: str,
        title: str,
        position: int = 0,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        now = _now()
        with connect() as connection:
            self._require(connection, "emergency_courses", course_id, "course_not_found")
            connection.execute(
                """
                INSERT INTO emergency_course_sections
                    (id, course_id, title, position, metadata_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    course_id=excluded.course_id, title=excluded.title,
                    position=excluded.position, metadata_json=excluded.metadata_json,
                    updated_at=excluded.updated_at
                """,
                (section_id, course_id, title, position, _dump(metadata or {}), now, now),
            )

    def upsert_lesson(
        self,
        *,
        lesson_id: str,
        section_id: str,
        title: str,
        content_type: str = "lesson",
        body: str | None = None,
        duration_minutes: int | None = None,
        position: int = 0,
        is_preview: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        now = _now()
        with connect() as connection:
            self._require(connection, "emergency_course_sections", section_id, "section_not_found")
            connection.execute(
                """
                INSERT INTO emergency_lessons
                    (id, section_id, title, content_type, body, duration_minutes,
                     position, is_preview, metadata_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    section_id=excluded.section_id, title=excluded.title,
                    content_type=excluded.content_type, body=excluded.body,
                    duration_minutes=excluded.duration_minutes, position=excluded.position,
                    is_preview=excluded.is_preview, metadata_json=excluded.metadata_json,
                    updated_at=excluded.updated_at
                """,
                (lesson_id, section_id, title, content_type, body, duration_minutes,
                 position, int(is_preview), _dump(metadata or {}), now, now),
            )

    def upsert_enrollment(
        self,
        *,
        enrollment_id: str,
        user_id: str,
        course_id: str,
        status: str = "active",
        progress_percent: float = 0,
        enrolled_at: int | None = None,
        completed_at: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        now = _now()
        with connect() as connection:
            self._require(connection, "emergency_users", user_id, "user_not_found")
            self._require(connection, "emergency_courses", course_id, "course_not_found")
            connection.execute(
                """
                INSERT INTO emergency_enrollments
                    (id, user_id, course_id, status, progress_percent, enrolled_at,
                     completed_at, metadata_json, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, course_id) DO UPDATE SET
                    status=excluded.status, progress_percent=excluded.progress_percent,
                    completed_at=excluded.completed_at, metadata_json=excluded.metadata_json,
                    updated_at=excluded.updated_at
                """,
                (enrollment_id, user_id, course_id, status, progress_percent,
                 enrolled_at or now, completed_at, _dump(metadata or {}), now),
            )

    def upsert_lesson_progress(
        self,
        *,
        progress_id: str,
        user_id: str,
        lesson_id: str,
        enrollment_id: str | None = None,
        status: str = "in_progress",
        progress_percent: float = 0,
        last_position: int | None = None,
        completed_at: int | None = None,
    ) -> None:
        now = _now()
        with connect() as connection:
            self._require(connection, "emergency_users", user_id, "user_not_found")
            self._require(connection, "emergency_lessons", lesson_id, "lesson_not_found")
            connection.execute(
                """
                INSERT INTO emergency_lesson_progress
                    (id, user_id, lesson_id, enrollment_id, status, progress_percent,
                     last_position, completed_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, lesson_id) DO UPDATE SET
                    enrollment_id=excluded.enrollment_id, status=excluded.status,
                    progress_percent=excluded.progress_percent,
                    last_position=excluded.last_position,
                    completed_at=excluded.completed_at, updated_at=excluded.updated_at
                """,
                (progress_id, user_id, lesson_id, enrollment_id, status,
                 progress_percent, last_position, completed_at, now),
            )
            self._refresh_course_progress(connection, user_id, lesson_id)

    def upsert_study_plan(
        self,
        *,
        plan_id: str,
        user_id: str,
        title: str,
        status: str = "active",
        metadata: dict[str, Any] | None = None,
    ) -> None:
        now = _now()
        with connect() as connection:
            self._require(connection, "emergency_users", user_id, "user_not_found")
            connection.execute(
                """
                INSERT INTO emergency_study_plans
                    (id, user_id, title, status, metadata_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    user_id=excluded.user_id, title=excluded.title, status=excluded.status,
                    metadata_json=excluded.metadata_json, updated_at=excluded.updated_at
                """,
                (plan_id, user_id, title, status, _dump(metadata or {}), now, now),
            )

    def record_learning_event(
        self,
        *,
        event_id: str,
        user_id: str,
        event_type: str,
        course_id: str | None = None,
        lesson_id: str | None = None,
        payload: dict[str, Any] | None = None,
        occurred_at: int | None = None,
    ) -> None:
        with connect() as connection:
            self._require(connection, "emergency_users", user_id, "user_not_found")
            connection.execute(
                """
                INSERT INTO emergency_learning_events
                    (id, user_id, course_id, lesson_id, event_type, payload_json, occurred_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    user_id=excluded.user_id, course_id=excluded.course_id,
                    lesson_id=excluded.lesson_id, event_type=excluded.event_type,
                    payload_json=excluded.payload_json, occurred_at=excluded.occurred_at
                """,
                (event_id, user_id, course_id, lesson_id, event_type,
                 _dump(payload or {}), occurred_at or _now()),
            )

    def upsert_assessment(
        self,
        *,
        assessment_id: str,
        title: str,
        course_id: str | None = None,
        description: str | None = None,
        kind: str = "quiz",
        time_limit_minutes: int | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        now = _now()
        with connect() as connection:
            if course_id:
                self._require(connection, "emergency_courses", course_id, "course_not_found")
            connection.execute(
                """
                INSERT INTO emergency_assessments
                    (id, course_id, title, description, kind, time_limit_minutes,
                     metadata_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    course_id=excluded.course_id, title=excluded.title,
                    description=excluded.description, kind=excluded.kind,
                    time_limit_minutes=excluded.time_limit_minutes,
                    metadata_json=excluded.metadata_json, updated_at=excluded.updated_at
                """,
                (assessment_id, course_id, title, description, kind,
                 time_limit_minutes, _dump(metadata or {}), now, now),
            )

    def upsert_question(
        self,
        *,
        question_id: str,
        assessment_id: str,
        prompt: str,
        kind: str = "single_choice",
        points: float = 1,
        position: int = 0,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        with connect() as connection:
            self._require(connection, "emergency_assessments", assessment_id, "assessment_not_found")
            connection.execute(
                """
                INSERT INTO emergency_assessment_questions
                    (id, assessment_id, prompt, kind, points, position, metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    assessment_id=excluded.assessment_id, prompt=excluded.prompt,
                    kind=excluded.kind, points=excluded.points,
                    position=excluded.position, metadata_json=excluded.metadata_json
                """,
                (question_id, assessment_id, prompt, kind, points, position, _dump(metadata or {})),
            )

    def upsert_option(
        self,
        *,
        option_id: str,
        question_id: str,
        text: str,
        is_correct: bool = False,
        position: int = 0,
    ) -> None:
        with connect() as connection:
            self._require(connection, "emergency_assessment_questions", question_id, "question_not_found")
            connection.execute(
                """
                INSERT INTO emergency_assessment_options
                    (id, question_id, text, is_correct, position)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    question_id=excluded.question_id, text=excluded.text,
                    is_correct=excluded.is_correct, position=excluded.position
                """,
                (option_id, question_id, text, int(is_correct), position),
            )

    def list_courses(self, *, public_only: bool = True) -> list[dict[str, Any]]:
        where = "WHERE status = 'published'" if public_only else ""
        with connect() as connection:
            rows = connection.execute(
                f"SELECT * FROM emergency_courses {where} ORDER BY updated_at DESC, title"
            ).fetchall()
        return [self._course_row(row) for row in rows]

    def get_course(self, course_id: str) -> dict[str, Any]:
        with connect() as connection:
            row = connection.execute("SELECT * FROM emergency_courses WHERE id = ?", (course_id,)).fetchone()
            if row is None:
                raise LearningNotFound("course_not_found")
            sections = connection.execute(
                "SELECT * FROM emergency_course_sections WHERE course_id = ? ORDER BY position, id",
                (course_id,),
            ).fetchall()
            result = self._course_row(row)
            result["sections"] = []
            for section in sections:
                section_value = {
                    "id": section["id"], "title": section["title"],
                    "position": section["position"], "metadata": _load(section["metadata_json"], {}),
                    "lessons": [],
                }
                lessons = connection.execute(
                    "SELECT * FROM emergency_lessons WHERE section_id = ? ORDER BY position, id",
                    (section["id"],),
                ).fetchall()
                section_value["lessons"] = [self._lesson_row(lesson) for lesson in lessons]
                result["sections"].append(section_value)
        return result

    def get_learning_overview(self, user_id: str) -> dict[str, Any]:
        with connect() as connection:
            enrollments = connection.execute(
                """
                SELECT e.*, c.title AS course_title, c.slug AS course_slug
                FROM emergency_enrollments e JOIN emergency_courses c ON c.id = e.course_id
                WHERE e.user_id = ? ORDER BY e.updated_at DESC
                """,
                (user_id,),
            ).fetchall()
            progress = connection.execute(
                """
                SELECT p.*, l.title AS lesson_title, s.course_id
                FROM emergency_lesson_progress p
                JOIN emergency_lessons l ON l.id = p.lesson_id
                JOIN emergency_course_sections s ON s.id = l.section_id
                WHERE p.user_id = ? ORDER BY p.updated_at DESC
                """,
                (user_id,),
            ).fetchall()
            plans = connection.execute(
                "SELECT * FROM emergency_study_plans WHERE user_id = ? ORDER BY updated_at DESC",
                (user_id,),
            ).fetchall()
        return {
            "enrollments": [self._enrollment_row(row) for row in enrollments],
            "progress": [self._progress_row(row) for row in progress],
            "studyPlans": [
                {"id": row["id"], "title": row["title"], "status": row["status"],
                 "metadata": _load(row["metadata_json"], {}), "updatedAt": row["updated_at"]}
                for row in plans
            ],
        }

    def get_assessment(self, assessment_id: str, *, include_answers: bool = False) -> dict[str, Any]:
        with connect() as connection:
            row = connection.execute("SELECT * FROM emergency_assessments WHERE id = ?", (assessment_id,)).fetchone()
            if row is None:
                raise LearningNotFound("assessment_not_found")
            questions = connection.execute(
                "SELECT * FROM emergency_assessment_questions WHERE assessment_id = ? ORDER BY position, id",
                (assessment_id,),
            ).fetchall()
            result = {
                "id": row["id"], "courseId": row["course_id"], "title": row["title"],
                "description": row["description"], "kind": row["kind"],
                "timeLimitMinutes": row["time_limit_minutes"],
                "metadata": _load(row["metadata_json"], {}), "questions": [],
            }
            for question in questions:
                options = connection.execute(
                    "SELECT * FROM emergency_assessment_options WHERE question_id = ? ORDER BY position, id",
                    (question["id"],),
                ).fetchall()
                option_values = [
                    {"id": option["id"], "text": option["text"], "position": option["position"]}
                    for option in options
                ]
                if include_answers:
                    for option, source in zip(option_values, options):
                        option["isCorrect"] = bool(source["is_correct"])
                result["questions"].append({
                    "id": question["id"], "prompt": question["prompt"], "kind": question["kind"],
                    "points": question["points"], "position": question["position"],
                    "metadata": _load(question["metadata_json"], {}), "options": option_values,
                })
        return result

    def start_attempt(self, *, attempt_id: str, assessment_id: str, user_id: str) -> dict[str, Any]:
        now = _now()
        with connect() as connection:
            self._require(connection, "emergency_assessments", assessment_id, "assessment_not_found")
            self._require(connection, "emergency_users", user_id, "user_not_found")
            connection.execute(
                """
                INSERT INTO emergency_assessment_attempts
                    (id, assessment_id, user_id, status, started_at, metadata_json)
                VALUES (?, ?, ?, 'in_progress', ?, '{}')
                ON CONFLICT(id) DO UPDATE SET assessment_id=excluded.assessment_id,
                    user_id=excluded.user_id, status='in_progress', completed_at=NULL
                """,
                (attempt_id, assessment_id, user_id, now),
            )
        return self.get_attempt(attempt_id, user_id)

    def submit_response(
        self,
        *,
        response_id: str,
        attempt_id: str,
        question_id: str,
        user_id: str,
        option_id: str | None = None,
        answer_text: str | None = None,
    ) -> dict[str, Any]:
        now = _now()
        with connect() as connection:
            attempt = connection.execute(
                "SELECT * FROM emergency_assessment_attempts WHERE id = ? AND user_id = ?",
                (attempt_id, user_id),
            ).fetchone()
            if attempt is None:
                raise LearningNotFound("attempt_not_found")
            if attempt["status"] != "in_progress":
                raise LearningValidationError("attempt_already_completed")
            question = connection.execute(
                "SELECT * FROM emergency_assessment_questions WHERE id = ? AND assessment_id = ?",
                (question_id, attempt["assessment_id"]),
            ).fetchone()
            if question is None:
                raise LearningValidationError("question_not_in_assessment")
            correct: bool | None = None
            if option_id:
                option = connection.execute(
                    "SELECT is_correct FROM emergency_assessment_options WHERE id = ? AND question_id = ?",
                    (option_id, question_id),
                ).fetchone()
                if option is None:
                    raise LearningValidationError("option_not_in_question")
                correct = bool(option["is_correct"])
            connection.execute(
                """
                INSERT INTO emergency_assessment_responses
                    (id, attempt_id, question_id, option_id, answer_text, is_correct,
                     score, answered_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(attempt_id, question_id) DO UPDATE SET
                    option_id=excluded.option_id, answer_text=excluded.answer_text,
                    is_correct=excluded.is_correct, score=excluded.score,
                    answered_at=excluded.answered_at
                """,
                (response_id, attempt_id, question_id, option_id, answer_text,
                 int(correct) if correct is not None else None,
                 question["points"] if correct else 0 if correct is not None else None, now),
            )
        return self.get_attempt(attempt_id, user_id)

    def complete_attempt(self, *, attempt_id: str, user_id: str) -> dict[str, Any]:
        now = _now()
        with connect() as connection:
            attempt = connection.execute(
                "SELECT id FROM emergency_assessment_attempts WHERE id = ? AND user_id = ?",
                (attempt_id, user_id),
            ).fetchone()
            if attempt is None:
                raise LearningNotFound("attempt_not_found")
            score = connection.execute(
                "SELECT COALESCE(SUM(score), 0) FROM emergency_assessment_responses WHERE attempt_id = ?",
                (attempt_id,),
            ).fetchone()[0]
            connection.execute(
                "UPDATE emergency_assessment_attempts SET status = 'completed', score = ?, completed_at = ? WHERE id = ?",
                (score, now, attempt_id),
            )
        return self.get_attempt(attempt_id, user_id)

    def get_attempt(self, attempt_id: str, user_id: str) -> dict[str, Any]:
        with connect() as connection:
            row = connection.execute(
                "SELECT * FROM emergency_assessment_attempts WHERE id = ? AND user_id = ?",
                (attempt_id, user_id),
            ).fetchone()
            if row is None:
                raise LearningNotFound("attempt_not_found")
            responses = connection.execute(
                "SELECT * FROM emergency_assessment_responses WHERE attempt_id = ? ORDER BY answered_at",
                (attempt_id,),
            ).fetchall()
        return {
            "id": row["id"], "assessmentId": row["assessment_id"], "status": row["status"],
            "score": row["score"], "startedAt": row["started_at"],
            "completedAt": row["completed_at"], "metadata": _load(row["metadata_json"], {}),
            "responses": [
                {"id": item["id"], "questionId": item["question_id"], "optionId": item["option_id"],
                 "answerText": item["answer_text"], "isCorrect": item["is_correct"],
                 "score": item["score"], "answeredAt": item["answered_at"]}
                for item in responses
            ],
        }

    @staticmethod
    def _require(connection: Any, table: str, record_id: str, error: str) -> None:
        if connection.execute(f"SELECT 1 FROM {table} WHERE id = ?", (record_id,)).fetchone() is None:
            raise LearningNotFound(error)

    @staticmethod
    def _refresh_course_progress(connection: Any, user_id: str, lesson_id: str) -> None:
        row = connection.execute(
            """
            SELECT e.id, AVG(COALESCE(p.progress_percent, 0)) AS average_progress,
                   SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) AS completed_count,
                   COUNT(l.id) AS lesson_count
            FROM emergency_enrollments e
            JOIN emergency_course_sections s ON s.course_id = e.course_id
            JOIN emergency_lessons l ON l.section_id = s.id
            LEFT JOIN emergency_lesson_progress p ON p.lesson_id = l.id AND p.user_id = e.user_id
            WHERE e.user_id = ? AND e.course_id = (
                SELECT source_section.course_id
                FROM emergency_course_sections source_section
                JOIN emergency_lessons source_lesson ON source_lesson.section_id = source_section.id
                WHERE source_lesson.id = ?
            )
            GROUP BY e.id
            """,
            (user_id, lesson_id),
        ).fetchone()
        if row is not None:
            average = float(row["average_progress"] or 0)
            connection.execute(
                "UPDATE emergency_enrollments SET progress_percent = ?, updated_at = ? WHERE id = ?",
                (min(100.0, average), _now(), row["id"]),
            )

    @staticmethod
    def _course_row(row: Any) -> dict[str, Any]:
        return {
            "id": row["id"], "categoryId": row["category_id"], "title": row["title"],
            "slug": row["slug"], "summary": row["summary"], "description": row["description"],
            "status": row["status"], "level": row["level"],
            "durationMinutes": row["duration_minutes"], "metadata": _load(row["metadata_json"], {}),
            "createdAt": row["created_at"], "updatedAt": row["updated_at"],
        }

    @staticmethod
    def _lesson_row(row: Any) -> dict[str, Any]:
        return {
            "id": row["id"], "sectionId": row["section_id"], "title": row["title"],
            "contentType": row["content_type"], "body": row["body"],
            "durationMinutes": row["duration_minutes"], "position": row["position"],
            "isPreview": bool(row["is_preview"]), "metadata": _load(row["metadata_json"], {}),
        }

    @staticmethod
    def _enrollment_row(row: Any) -> dict[str, Any]:
        return {
            "id": row["id"], "userId": row["user_id"], "courseId": row["course_id"],
            "courseTitle": row["course_title"], "courseSlug": row["course_slug"],
            "status": row["status"], "progressPercent": row["progress_percent"],
            "enrolledAt": row["enrolled_at"], "completedAt": row["completed_at"],
            "metadata": _load(row["metadata_json"], {}), "updatedAt": row["updated_at"],
        }

    @staticmethod
    def _progress_row(row: Any) -> dict[str, Any]:
        return {
            "id": row["id"], "userId": row["user_id"], "lessonId": row["lesson_id"],
            "lessonTitle": row["lesson_title"], "courseId": row["course_id"],
            "enrollmentId": row["enrollment_id"], "status": row["status"],
            "progressPercent": row["progress_percent"], "lastPosition": row["last_position"],
            "completedAt": row["completed_at"], "updatedAt": row["updated_at"],
        }
