#!/usr/bin/env python3
"""
Render README.mdx from templates/README.mdx.jinja using the same Jinja context
as the openapi-python-client generator. Run from the package root (e.g. as a
post_hook after generation). Requires: uv run --with openapi-python-client@0.28.2 python generate_readme_mdx.py
"""

from pathlib import Path

# Paths relative to package root (cwd when run as post_hook)
PACKAGE_ROOT = Path.cwd()
SPEC_PATH = PACKAGE_ROOT / ".." / ".." / "docs" / "references" / "v2.openapi.json"
CONFIG_PATH = PACKAGE_ROOT / "config.yaml"
TEMPLATES_PATH = PACKAGE_ROOT / "templates"
OUTPUT_PATH = PACKAGE_ROOT / "README.mdx"


def main() -> None:
    import json

    from openapi_python_client import Project
    from openapi_python_client.config import Config, ConfigFile, MetaType
    from openapi_python_client.parser import GeneratorData

    spec_path = SPEC_PATH.resolve()
    if not spec_path.exists():
        raise SystemExit(f"OpenAPI spec not found: {spec_path}")

    config_file = ConfigFile.load_from_path(path=CONFIG_PATH.resolve())
    config = Config.from_sources(
        config_file,
        MetaType.UV,
        document_source=spec_path,
        file_encoding="utf-8",
        overwrite=True,
        output_path=PACKAGE_ROOT.resolve(),
    )

    data_dict = json.loads(spec_path.read_bytes().decode())
    from openapi_python_client.parser.errors import GeneratorError

    openapi = GeneratorData.from_dict(data_dict, config=config)
    if isinstance(openapi, GeneratorError):
        raise SystemExit(f"Failed to parse OpenAPI: {openapi.header} - {openapi.detail}")

    project = Project(
        openapi=openapi,
        config=config,
        custom_template_path=TEMPLATES_PATH.resolve(),
    )

    template = project.env.get_template("README.mdx.jinja")
    OUTPUT_PATH.write_text(
        template.render(meta=config.meta_type),
        encoding=config.file_encoding,
    )
    print(f"Generated {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
