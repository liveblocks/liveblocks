import pytest

from liveblocks_api_client.client import Liveblocks


class TestConstructorValidation:
    def test_rejects_empty_user_id(self):
        client = Liveblocks(secret="sk_testingtesting")
        with pytest.raises(ValueError, match="Invalid value for 'user_id'"):
            client.prepare_session("")
