import pytest
import respx

from liveblocks.client import AsyncLiveblocks, Liveblocks


@pytest.fixture(params=[Liveblocks, AsyncLiveblocks], ids=["sync", "async"])
def client_cls(request):
    return request.param


@pytest.fixture
def sync_client():
    return Liveblocks(secret="sk_test_fake_key")


@pytest.fixture
def async_client():
    return AsyncLiveblocks(secret="sk_test_fake_key")


@pytest.fixture
def mock_api():
    with respx.mock(base_url="https://api.liveblocks.io") as respx_mock:
        yield respx_mock
