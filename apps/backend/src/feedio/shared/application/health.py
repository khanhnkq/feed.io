from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True, slots=True)
class DependencyStatus:
    name: str
    healthy: bool
    latency_seconds: float


@dataclass(frozen=True, slots=True)
class HealthReport:
    dependencies: tuple[DependencyStatus, ...]

    @property
    def ready(self) -> bool:
        return all(dependency.healthy for dependency in self.dependencies)


class DependencyChecker(Protocol):
    async def check(self) -> HealthReport: ...
