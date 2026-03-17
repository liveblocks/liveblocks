"""Contains some shared types for properties"""

from collections.abc import Mapping
from typing import IO, BinaryIO, Literal

from attrs import define


class Unset:
    def __bool__(self) -> Literal[False]:
        return False


UNSET: Unset = Unset()

# The types that `httpx.Client(files=)` can accept, copied from that library.
FileContent = IO[bytes] | bytes | str
FileTypes = (
    # (filename, file (or bytes), content_type)
    tuple[str | None, FileContent, str | None]
    # (filename, file (or bytes), content_type, headers)
    | tuple[str | None, FileContent, str | None, Mapping[str, str]]
)


@define
class File:
    """Contains information for file uploads"""

    payload: BinaryIO
    file_name: str | None = None
    mime_type: str | None = None

    def to_tuple(self) -> FileTypes:
        """Return a tuple representation that httpx will accept for multipart/form-data"""
        return self.file_name, self.payload, self.mime_type


__all__ = ["UNSET", "File", "FileTypes", "Unset"]
