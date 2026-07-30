---
name: python-project-constructor
description: These instructions are for initializing a Python project.
---

# Python Project Constructor

When creating a new Python project, follow these rules:

## File Structure

project/
├── src/                  # <-- all importable code lives here
│   ├── core/             # Business logic, reusable across services
│   ├── api/              # FastAPI (or Flask, gRPC) endpoints
│   ├── data/             # ETL helpers, dataset loaders
│   ├── models/           # ML/DL model classes + training loops
│   ├── utils/            # Tiny helpers: logging, timers, etc.
│   └── config/           # Pydantic or YAML-backed settings
├── tests/                # Pytest lives here (optional)
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── notebooks/            # Exploratory Jupyter work
├── docs/                 # Sphinx or Markdown guides (optional)
│   ├── api/
│   ├── usage/
│   └── development/
├── conf/                 # Runtime configs (local, test, prod)
├── scripts/              # One-off CLI helpers, CI hooks
├── .github/workflows/    # CI/CD pipelines (optional)
├── Dockerfile & docker-compose.yml
├── Makefile              # `make test`, `make lint`, etc. (optional)
└── requirements/         # base.txt, dev.txt, prod.txt

## Package and Project Manager

- Use `uv` as package and project manager
- Use `ruff` as linter and formatter
- Configure LSP, add the following content into `pyproject.toml`
  ```
  [tool.pyright]
  venvPath = "."
  venv = ".venv"
  ```
