import pytest


class TestConstructorValidation:
    def test_rejects_invalid_prefix(self, client_cls):
        with pytest.raises(ValueError, match="must start with 'sk_'"):
            client_cls(secret="pk_abc123")

    def test_rejects_invalid_chars(self, client_cls):
        with pytest.raises(ValueError, match="Invalid chars"):
            client_cls(secret="sk_abc 123!")

    def test_accepts_valid_secret(self, client_cls):
        client = client_cls(secret="sk_valid-key_123")
        assert client._client.base_url == "https://api.liveblocks.io"

    def test_accepts_custom_base_url(self, client_cls):
        client = client_cls(secret="sk_test", base_url="https://custom.example.com")
        assert str(client._client.base_url) == "https://custom.example.com"

    def test_sets_auth_header(self, client_cls):
        client = client_cls(secret="sk_my_secret")
        assert client._client.headers["Authorization"] == "Bearer sk_my_secret"
