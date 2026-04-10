# liveblocks-python-codegen

Code generator for the [Liveblocks Python SDK](../liveblocks-python/). Uses
[openapi-python-client](https://github.com/openapi-generators/openapi-python-client)
as a library to parse the OpenAPI spec and generate the SDK source code, along
with two README variants:

- `README.md` — standard Markdown (for PyPI / GitHub)
- `README.mdx` — rich MDX with components like `<PropertiesList>` (for the docs
  site)

Both are rendered from Jinja templates in `templates/` using the same parsed
OpenAPI context, so they never drift apart.

## Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (manages the Python environment and
  dependencies automatically)

## Usage

From this directory:

```bash
uv run python generate.py
```

This will:

1. Parse `../../docs/references/v2.openapi.json`
2. Generate the full SDK (models, client, endpoints, `README.md`) into
   `../liveblocks-python/`
3. Run `ruff` to lint and format the generated Python code (configured as
   post-hooks in `config.yaml`)
4. Render `README.mdx` into `../liveblocks-python/`

The first run installs dependencies (pinned in `pyproject.toml`) into a local
`.venv`. Subsequent runs reuse the cached environment.

## Project structure

```
liveblocks-python-codegen/
├── pyproject.toml               # Pins openapi-python-client version
├── config.yaml                  # Generator config (package name, post-hooks)
├── generate.py                  # Single entry point
└── templates/                   # Jinja templates for all generated files
    ├── _shared.jinja            # Shared macros used across templates
    ├── README.md.jinja          # PyPI / GitHub README
    ├── README.mdx.jinja         # Docs-site README (rendered separately)
    ├── client.py.jinja          # LiveblocksClient class
    ├── endpoint_module.py.jinja # One file per API endpoint group
    ├── endpoint_macros.py.jinja # Shared endpoint helpers
    ├── model.py.jinja           # Pydantic model per schema
    ├── types.py.jinja           # Shared type definitions
    ├── errors.py.jinja          # Exception classes
    ├── pyproject_uv.toml.jinja  # Generated SDK pyproject.toml
    └── ...                      # Init files, enums, ruff config, etc.
```

## Editing templates

All output files are driven by Jinja templates in `templates/`. To change the
generated SDK:

1. Edit the relevant `.jinja` template.
2. Re-run `uv run python generate.py` to regenerate.
3. Review the diff in `../liveblocks-python/`.

Templates receive the parsed OpenAPI data as context — see the
[openapi-python-client custom templates docs](https://github.com/openapi-generators/openapi-python-client?tab=readme-ov-file#custom-templates)
for the available variables.

## Updating the generator version

```bash
uv add openapi-python-client==<new-version>
uv run python generate.py
```
