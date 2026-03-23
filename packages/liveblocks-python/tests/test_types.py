from __future__ import annotations

import io

from liveblocks.types import UNSET, File, Unset


class TestUnset:
    def test_bool_returns_false(self):
        assert bool(Unset()) is False

    def test_unset_singleton_is_falsy(self):
        assert not UNSET


class TestFile:
    def test_to_tuple(self):
        payload = io.BytesIO(b"hello")
        f = File(payload=payload, file_name="test.txt", mime_type="text/plain")

        result = f.to_tuple()

        assert result == ("test.txt", payload, "text/plain")

    def test_to_tuple_with_defaults(self):
        payload = io.BytesIO(b"data")
        f = File(payload=payload)

        result = f.to_tuple()

        assert result == (None, payload, None)
