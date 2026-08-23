# System overview

```mermaid
flowchart LR
    Browser --> Nginx
    Nginx --> Web[Next.js]
    Web --> API[FastAPI]
    Browser -->|multipart| Garage
    API --> PostgreSQL
    API --> RabbitMQ
    API --> Valkey
    RabbitMQ --> Worker[Celery + FFmpeg]
    Worker --> Garage
    Keycloak --> Web
    Keycloak --> API
```

## Dependency rules

- Domain code is framework-free.
- Application code orchestrates use cases through small ports.
- Infrastructure implements I/O ports.
- Presentation translates HTTP and WebSocket messages.
- Composition roots are the only place that binds concrete adapters.
- Frontend routes compose feature modules; React components never call Axios directly.
