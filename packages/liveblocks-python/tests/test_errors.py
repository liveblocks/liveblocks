from __future__ import annotations

from unittest.mock import PropertyMock, patch

import httpx

from liveblocks.errors import LiveblocksError

FALLBACK = "An error happened without an error message"


class TestFromResponse:
    def test_response_read_exception_uses_fallback(self):
        response = httpx.Response(500, content=b"body")
        with patch.object(type(response), "text", new_callable=PropertyMock, side_effect=Exception("read boom")):
            err = LiveblocksError.from_response(response)

        assert str(err) == FALLBACK
        assert err.status == 500

    def test_non_dict_json_uses_raw_text_as_message(self):
        response = httpx.Response(400, text='"just a string"')
        err = LiveblocksError.from_response(response)

        assert str(err) == '"just a string"'
        assert err.status == 400
        assert err.details is None

    def test_unparseable_json_uses_raw_text_as_message(self):
        response = httpx.Response(502, text="not json at all")
        err = LiveblocksError.from_response(response)

        assert str(err) == "not json at all"
        assert err.status == 502
        assert err.details is None

    def test_missing_message_key_uses_fallback(self):
        response = httpx.Response(503, json={"error": "oops"})
        err = LiveblocksError.from_response(response)

        assert str(err) == FALLBACK
        assert err.status == 503

    def test_only_suggestion_no_docs(self):
        response = httpx.Response(400, json={"message": "Bad", "suggestion": "Try again"})
        err = LiveblocksError.from_response(response)

        assert err.details == "Suggestion: Try again"

    def test_only_docs_no_suggestion(self):
        response = httpx.Response(400, json={"message": "Bad", "docs": "https://example.com"})
        err = LiveblocksError.from_response(response)

        assert err.details == "See also: https://example.com"

    def test_no_suggestion_and_no_docs_gives_none_details(self):
        response = httpx.Response(400, json={"message": "Bad"})
        err = LiveblocksError.from_response(response)

        assert err.details is None
