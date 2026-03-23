from __future__ import annotations

import json
from typing import Any

import httpx


class LiveblocksError(Exception):
    def __init__(self, message: str, status: int, details: str | None = None):
        super().__init__(message)
        self.status = status
        self.details = details

    def __str__(self) -> str:
        msg = f"{self.args[0]} (status {self.status})"
        if self.details:
            msg += f"\n{self.details}"
        return msg

    @classmethod
    def from_response(cls, response: httpx.Response) -> LiveblocksError:
        FALLBACK = "An error happened without an error message"
        try:
            response.read()
            text = response.text
        except Exception:
            text = FALLBACK

        obj: dict[str, Any]
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                obj = parsed
            else:
                obj = {"message": text}
        except Exception:
            obj = {"message": text}

        message = str(obj.get("message") or FALLBACK)

        parts: list[str] = []
        if obj.get("suggestion") is not None:
            parts.append(f"Suggestion: {obj['suggestion']}")
        if obj.get("docs") is not None:
            parts.append(f"See also: {obj['docs']}")

        details = "\n".join(parts) or None
        return cls(message, response.status_code, details)


__all__ = ["LiveblocksError"]
