import json
from pathlib import Path

from feedio.entrypoints.api import create_app


def main() -> None:
    output = Path(__file__).parents[1] / "apps" / "backend" / "openapi.json"
    output.write_text(json.dumps(create_app().openapi(), indent=2) + "\n")
    print(f"OpenAPI written to {output}")


if __name__ == "__main__":
    main()
