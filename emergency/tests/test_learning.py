from app.auth_service import AuthService
from app.learning_service import LearningNotFound, LearningService, LearningValidationError


def seed_user(user_id: str) -> None:
    AuthService().upsert_user(
        user_id=user_id,
        username=f"learning-{user_id}",
        email=f"{user_id}@example.test",
        role="user",
    )


def test_content_learning_and_assessment_flow() -> None:
    learning = LearningService()
    seed_user("learning-user-1")

    learning.upsert_category(category_id="learning-category-1", name="Core", slug="core")
    learning.upsert_course(
        course_id="learning-course-1",
        category_id="learning-category-1",
        title="Emergency Python",
        slug="emergency-python",
        status="published",
        level="beginner",
        duration_minutes=120,
    )
    learning.upsert_section(section_id="learning-section-1", course_id="learning-course-1", title="Basics")
    learning.upsert_lesson(
        lesson_id="learning-lesson-1",
        section_id="learning-section-1",
        title="Variables",
        body="Learn variables",
        duration_minutes=30,
        is_preview=True,
    )
    learning.upsert_section(section_id="learning-section-1", course_id="learning-course-1", title="Basics updated")
    learning.upsert_lesson(
        lesson_id="learning-lesson-1",
        section_id="learning-section-1",
        title="Variables updated",
        body="Learn variables",
        duration_minutes=30,
        is_preview=True,
    )
    course = learning.get_course("learning-course-1")
    assert course["title"] == "Emergency Python"
    assert course["sections"][0]["title"] == "Basics updated"
    assert course["sections"][0]["lessons"][0]["title"] == "Variables updated"
    assert [item["id"] for item in learning.list_courses()] == ["learning-course-1"]

    learning.upsert_enrollment(
        enrollment_id="learning-enrollment-1",
        user_id="learning-user-1",
        course_id="learning-course-1",
    )
    learning.upsert_lesson_progress(
        progress_id="learning-progress-1",
        user_id="learning-user-1",
        lesson_id="learning-lesson-1",
        status="completed",
        progress_percent=100,
    )
    learning.upsert_study_plan(plan_id="learning-plan-1", user_id="learning-user-1", title="Finish basics")
    learning.record_learning_event(
        event_id="learning-event-1",
        user_id="learning-user-1",
        course_id="learning-course-1",
        lesson_id="learning-lesson-1",
        event_type="lesson_completed",
    )
    overview = learning.get_learning_overview("learning-user-1")
    assert overview["enrollments"][0]["progressPercent"] == 100
    assert overview["progress"][0]["status"] == "completed"
    assert overview["studyPlans"][0]["title"] == "Finish basics"

    learning.upsert_assessment(
        assessment_id="learning-assessment-1",
        course_id="learning-course-1",
        title="Python checkpoint",
        kind="quiz",
    )
    learning.upsert_question(
        question_id="learning-question-1",
        assessment_id="learning-assessment-1",
        prompt="What is a variable?",
        points=2,
    )
    learning.upsert_option(
        option_id="learning-option-correct",
        question_id="learning-question-1",
        text="A named value",
        is_correct=True,
    )
    learning.upsert_option(
        option_id="learning-option-wrong",
        question_id="learning-question-1",
        text="A database table",
        is_correct=False,
    )
    safe_assessment = learning.get_assessment("learning-assessment-1")
    assert "isCorrect" not in safe_assessment["questions"][0]["options"][0]
    answer_key = learning.get_assessment("learning-assessment-1", include_answers=True)
    assert answer_key["questions"][0]["options"][0]["isCorrect"] is True

    attempt = learning.start_attempt(
        attempt_id="learning-attempt-1",
        assessment_id="learning-assessment-1",
        user_id="learning-user-1",
    )
    assert attempt["status"] == "in_progress"
    answered = learning.submit_response(
        response_id="learning-response-1",
        attempt_id="learning-attempt-1",
        question_id="learning-question-1",
        user_id="learning-user-1",
        option_id="learning-option-correct",
    )
    assert answered["responses"][0]["isCorrect"] == 1
    completed = learning.complete_attempt(attempt_id="learning-attempt-1", user_id="learning-user-1")
    assert completed["status"] == "completed"
    assert completed["score"] == 2


def test_invalid_learning_relationships_are_rejected() -> None:
    learning = LearningService()
    seed_user("learning-user-2")
    try:
        learning.upsert_section(section_id="missing-section", course_id="missing-course", title="Missing")
    except LearningNotFound as error:
        assert str(error) == "course_not_found"
    else:
        raise AssertionError("section accepted a missing course")

    learning.upsert_assessment(assessment_id="learning-assessment-2", title="Assessment")
    learning.upsert_question(
        question_id="learning-question-2",
        assessment_id="learning-assessment-2",
        prompt="Pick one",
    )
    learning.start_attempt(
        attempt_id="learning-attempt-2",
        assessment_id="learning-assessment-2",
        user_id="learning-user-2",
    )
    learning.submit_response(
        response_id="learning-response-2",
        attempt_id="learning-attempt-2",
        question_id="learning-question-2",
        user_id="learning-user-2",
        answer_text="typed answer",
    )
    learning.complete_attempt(attempt_id="learning-attempt-2", user_id="learning-user-2")
    try:
        learning.submit_response(
            response_id="learning-response-3",
            attempt_id="learning-attempt-2",
            question_id="learning-question-2",
            user_id="learning-user-2",
            answer_text="late answer",
        )
    except LearningValidationError as error:
        assert str(error) == "attempt_already_completed"
    else:
        raise AssertionError("completed attempt accepted another response")
