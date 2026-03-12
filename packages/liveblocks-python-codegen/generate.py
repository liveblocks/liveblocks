#!/usr/bin/env python3
"""Generate the Liveblocks Python SDK, README.md, and README.mdx."""

import json
import sys
from pathlib import Path

from openapi_python_client import Project
from openapi_python_client.config import Config, ConfigFile, MetaType
from openapi_python_client.parser import GeneratorData
from openapi_python_client.parser.errors import GeneratorError

CODEGEN_DIR = Path(__file__).parent.resolve()
SDK_DIR = (CODEGEN_DIR / "../liveblocks-python").resolve()
SPEC = (CODEGEN_DIR / "../../docs/references/v2.openapi.json").resolve()


def main() -> None:
    if not SPEC.exists():
        print(f"OpenAPI spec not found: {SPEC}", file=sys.stderr)
        sys.exit(1)

    config_file = ConfigFile.load_from_path(CODEGEN_DIR / "config.yaml")
    config = Config.from_sources(
        config_file=config_file,
        meta_type=MetaType.UV,
        document_source=SPEC,
        file_encoding="utf-8",
        overwrite=True,
        output_path=SDK_DIR,
    )

    data_dict = json.loads(SPEC.read_bytes())
    openapi = GeneratorData.from_dict(data_dict, config=config)
    if isinstance(openapi, GeneratorError):
        print(f"Failed to parse OpenAPI: {openapi.header} — {openapi.detail}", file=sys.stderr)
        sys.exit(1)

    project = Project(
        openapi=openapi,
        config=config,
        custom_template_path=CODEGEN_DIR / "templates",
    )

    errors = project.build()
    for error in errors:
        print(f"  {error.level.name}: {error.header}: {error.detail}")

    mdx_template = project.env.get_template("README.mdx.jinja")
    mdx_path = SDK_DIR / "README.mdx"
    mdx_path.write_text(
        mdx_template.render(meta=config.meta_type),
        encoding="utf-8",
    )
    print(f"Generated {mdx_path}")


if __name__ == "__main__":
    main()
