from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from feedio.bootstrap.config import get_settings


def create_engine() -> AsyncEngine:
    url = get_settings().database_url
    kwargs: dict[str, object] = {
        "pool_pre_ping": True,
        "pool_recycle": 280,  # Recycle before Neon's 5-min idle timeout (300s)
    }
    if "sqlite" not in url:
        kwargs["pool_size"] = 10
        kwargs["max_overflow"] = 20
    return create_async_engine(url, **kwargs)


engine = create_engine()
session_factory = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        yield session


SessionDependency = Annotated[AsyncSession, Depends(get_session)]
