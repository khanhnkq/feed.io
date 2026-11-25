import asyncio

from pwdlib import PasswordHash
from pwdlib.exceptions import PwdlibError


class Argon2PasswordManager:
    """Argon2id password hasher offloaded to worker threads and bounded by Semaphore(2)."""

    def __init__(self, max_concurrency: int = 2) -> None:
        self._password_hash = PasswordHash.recommended()
        self._max_concurrency = max(1, max_concurrency)
        self._semaphore: asyncio.Semaphore | None = None
        self._semaphore_loop: asyncio.AbstractEventLoop | None = None

    def _get_semaphore(self) -> asyncio.Semaphore:
        loop = asyncio.get_running_loop()
        if self._semaphore is None or self._semaphore_loop is not loop:
            self._semaphore = asyncio.Semaphore(self._max_concurrency)
            self._semaphore_loop = loop
        return self._semaphore

    def hash(self, password: str) -> str:
        return self._password_hash.hash(password)

    def verify(self, password: str, password_hash: str) -> bool:
        try:
            return self._password_hash.verify(password, password_hash)
        except PwdlibError:
            return False

    async def hash_async(self, password: str) -> str:
        async with self._get_semaphore():
            return await asyncio.to_thread(self.hash, password)

    async def verify_async(self, password: str, password_hash: str) -> bool:
        async with self._get_semaphore():
            return await asyncio.to_thread(self.verify, password, password_hash)
