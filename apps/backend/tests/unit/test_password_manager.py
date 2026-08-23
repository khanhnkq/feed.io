from feedio.modules.identity.infrastructure.passwords import Argon2PasswordManager


def test_password_manager_hashes_and_verifies_password() -> None:
    manager = Argon2PasswordManager()
    password_hash = manager.hash("correct horse battery staple")

    assert password_hash != "correct horse battery staple"
    assert manager.verify("correct horse battery staple", password_hash) is True
    assert manager.verify("wrong password", password_hash) is False


def test_migrated_unknown_hash_is_rejected_without_crashing() -> None:
    manager = Argon2PasswordManager()

    assert manager.verify("anything", "migration-disabled-no-password") is False
