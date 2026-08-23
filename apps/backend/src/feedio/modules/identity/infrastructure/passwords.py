from pwdlib import PasswordHash
from pwdlib.exceptions import PwdlibError


class Argon2PasswordManager:
    def __init__(self) -> None:
        self._password_hash = PasswordHash.recommended()

    def hash(self, password: str) -> str:
        return self._password_hash.hash(password)

    def verify(self, password: str, password_hash: str) -> bool:
        try:
            return self._password_hash.verify(password, password_hash)
        except PwdlibError:
            return False
