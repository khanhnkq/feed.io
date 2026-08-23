from feedio.shared.application.health import DependencyStatus, HealthReport


class FakeDependencyChecker:
    def __init__(self, healthy: bool = True) -> None:
        self._healthy = healthy

    async def check(self) -> HealthReport:
        return HealthReport(
            (
                DependencyStatus("postgres", self._healthy, 0.001),
                DependencyStatus("valkey", self._healthy, 0.002),
                DependencyStatus("rabbitmq", self._healthy, 0.003),
                DependencyStatus("garage", self._healthy, 0.004),
            )
        )
