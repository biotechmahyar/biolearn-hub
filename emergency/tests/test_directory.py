from app.auth_service import AuthenticatedUser
from app.directory_service import DirectoryNotFound, DirectoryPermissionDenied, UserDirectoryService


def seed_user(service: UserDirectoryService, user_id: str, role: str = "user") -> None:
    from app.auth_service import AuthService

    AuthService().upsert_user(
        user_id=user_id,
        username=f"user-{user_id}",
        email=f"{user_id}@example.test",
        role=role,
    )


def test_profile_and_role_import_are_idempotent() -> None:
    directory = UserDirectoryService()
    seed_user(directory, "directory-user-1")
    directory.upsert_profile(
        user_id="directory-user-1",
        display_name="Ali Emergency",
        university="Genova University",
        skills=["python", "security"],
        metadata={"source": "snapshot"},
        telegram_id="telegram-1",
    )
    directory.upsert_profile(
        user_id="directory-user-1",
        display_name="Ali Updated",
        skills=["python"],
        metadata={"source": "snapshot"},
        telegram_id="telegram-1",
    )
    profile = directory.get_profile("directory-user-1")
    assert profile is not None
    assert profile["displayName"] == "Ali Updated"
    assert profile["telegramId"] == "telegram-1"
    assert profile["skills"] == ["python"]

    directory.upsert_role(
        role_id="directory-role-user",
        name="learner",
        description="Learner access",
        permissions=["courses.read"],
        panel_access={"learning": True},
    )
    directory.upsert_role(
        role_id="directory-role-user",
        name="learner",
        description="Learner access updated",
        permissions=["courses.read", "profile.read"],
    )
    directory.assign_role(
        assignment_id="directory-assignment-1",
        user_id="directory-user-1",
        role_id="directory-role-user",
    )
    directory.assign_role(
        assignment_id="directory-assignment-1",
        user_id="directory-user-1",
        role_id="directory-role-user",
    )
    roles = directory.get_user_roles("directory-user-1")
    assert len(roles) == 1
    assert roles[0]["name"] == "learner"
    assert roles[0]["permissions"] == ["courses.read", "profile.read"]
    assert directory.get_user("directory-user-1")["role"] == "learner"


def test_profile_update_listing_and_authorization() -> None:
    directory = UserDirectoryService()
    seed_user(directory, "directory-user-2")
    updated = directory.update_own_profile(
        "directory-user-2",
        {"display_name": "First", "skills": ["typescript"]},
    )
    assert updated["displayName"] == "First"
    updated = directory.update_own_profile("directory-user-2", {"bio": "Emergency operator"})
    assert updated["displayName"] == "First"
    assert updated["bio"] == "Emergency operator"

    users = directory.list_users(search="directory-user-2")
    assert [item["id"] for item in users] == ["directory-user-2"]
    assert directory.get_profile("directory-user-2")["skills"] == ["typescript"]

    try:
        directory.require_admin(AuthenticatedUser("directory-user-2", "user", "u@example.test", "user", "active"))
    except DirectoryPermissionDenied as error:
        assert str(error) == "admin_required"
    else:
        raise AssertionError("regular user was accepted as admin")

    try:
        directory.upsert_profile(user_id="missing-user", display_name="missing")
    except DirectoryNotFound as error:
        assert str(error) == "user_not_found"
    else:
        raise AssertionError("profile was created for a missing user")
