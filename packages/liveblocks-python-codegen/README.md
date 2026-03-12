# liveblocks-python-codegen

Code generator for the [Liveblocks Python SDK](../liveblocks-python/). Uses
[openapi-python-client](https://github.com/openapi-generators/openapi-python-client)
as a library to parse the OpenAPI spec and generate the SDK source code, along
with two README variants:

- `README.md` — standard Markdown (for PyPI / GitHub)
- `README.mdx` — rich MDX with components like `<PropertiesList>` (for the docs site)

Both are rendered from Jinja templates in `templates/` using the same parsed
OpenAPI context, so they never drift apart.

## Prerequisites

- [uv](https://docs.astral.sh/uv/) (manages the Python environment and dependencies automatically)

## Usage

From this directory:

```bash
uv run python generate.py
```

This will:

1. Parse `docs/references/v2.openapi.json`
2. Generate the full SDK into `../liveblocks-python/`
3. Run `ruff` to lint and format the generated Python code
4. Render `README.mdx` into `../liveblocks-python/`

The first run installs dependencies (pinned in `pyproject.toml`) into a local
`.venv`. Subsequent runs reuse the cached environment.

## Project structure

```
liveblocks-python-codegen/
├── pyproject.toml      # Pins openapi-python-client version
├── config.yaml         # Generator config (package name, post-hooks)
├── generate.py         # Single entry point
└── templates/          # Jinja templates for all generated files
    ├── README.md.jinja
    ├── README.mdx.jinja
    ├── client.py.jinja
    ├── _shared.jinja
    └── ...
```

## Updating the generator version

Change the pinned version in `pyproject.toml`:

```toml
dependencies = [
    "openapi-python-client==0.28.2",
]
```

Then delete `uv.lock` and re-run `uv run python generate.py` to regenerate
with the new version.
