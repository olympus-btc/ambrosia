"""End-to-end tests for the NWC (Nostr Wallet Connect) Lightning backend.

Boots a second, independent Ambrosia instance with --nwc-uri instead of
--phoenixd-url and confirms the real HTTP routing layer behaves correctly
under it.
"""

import logging

import pytest

from ambrosia.api_utils import assert_status_code
from ambrosia.auth_utils import DEFAULT_TEST_USER, login_user
from ambrosia.http_client import AmbrosiaHttpClient
from ambrosia.test_server import AmbrosiaTestServer

logger = logging.getLogger(__name__)

NWC_SERVER_PORT = 9165
NWC_SERVER_SSL_PORT = 9455
NWC_SERVER_DATADIR = "/tmp/ambrosia-test-data-nwc"
WALLET_PASSWORD = "password123"

# Real secp256k1 pubkey (openssl ecparam -name secp256k1) — parsed synchronously as a BIP-340 x-only point at server startup, so arbitrary hex here can crash the boot.
NWC_URI = (
    "nostr+walletconnect://"
    "7bf8c2495f3342c80e0cbdd0d306e19d0c44762c773195289c3a77d76bf70bdb"
    "?relay=ws://127.0.0.1:19999"
    "&secret=ef99a279c64d8f63f87103577ad699aef0e83253925cfad4446b4f254eba7652"
)
NWC_EXTRA_ARGS = (
    f"--nwc-uri={NWC_URI} "
    f"--ssl-bind-port={NWC_SERVER_SSL_PORT} "
    "--phoenixd-password=test-password "
    "--phoenixd-webhook-secret=test-webhook-secret"
)


@pytest.fixture(scope="module")
def nwc_server():
    """Boots a second Ambrosia instance configured with --nwc-uri."""
    server = AmbrosiaTestServer(
        port=NWC_SERVER_PORT,
        extra_args=NWC_EXTRA_ARGS,
        datadir=NWC_SERVER_DATADIR,
    )
    server.start_server()
    yield server
    server.stop_server()


@pytest.fixture
async def nwc_wallet_client(nwc_server: AmbrosiaTestServer):
    """Authenticated admin client, with wallet access unlocked, for the NWC server."""
    async with AmbrosiaHttpClient(nwc_server.server_url) as client:
        setup_response = await client.post(
            "/initial-setup",
            json={
                "businessType": "store",
                "userName": DEFAULT_TEST_USER["name"],
                "userPassword": WALLET_PASSWORD,
                "userPin": DEFAULT_TEST_USER["pin"],
                "businessName": "Test Store (NWC)",
                "businessAddress": "123 Test St",
                "businessPhone": "1234567890",
                "businessEmail": "test-nwc@example.com",
                "businessCurrency": "USD",
                "timezone": "America/Mexico_City",
            },
        )
        if setup_response.status_code not in (201, 409):
            pytest.fail(
                f"Initial setup on the NWC server failed with "
                f"{setup_response.status_code}: {setup_response.text}"
            )

        await login_user(client)

        wallet_auth_response = await client.post(
            "/wallet/auth", json={"password": WALLET_PASSWORD}
        )
        assert_status_code(
            wallet_auth_response, 200, "Failed to authenticate wallet access"
        )

        yield client


class TestNwcBackend:
    """Confirms the real HTTP routing layer behaves correctly under NWC."""

    @pytest.mark.asyncio
    async def test_getinfo_fails_when_the_relay_is_unreachable(
        self, nwc_wallet_client: AmbrosiaHttpClient
    ):
        """Unlike closeChannel below, getNodeInfo needs a live NIP-47 round-trip, so this 503 is the correct outcome here, not a bug."""
        response = await nwc_wallet_client.get("/wallet/getinfo")

        assert_status_code(response, 503, "Expected the NWC relay to be unreachable")
        assert response.json()["code"] == "nwc_connection_failed"
        logger.info("✓ /wallet/getinfo fails with the NWC-specific connection error")

    @pytest.mark.asyncio
    async def test_close_channel_returns_unsupported_operation(
        self, nwc_wallet_client: AmbrosiaHttpClient
    ):
        response = await nwc_wallet_client.post(
            "/wallet/closechannel",
            json={
                "channelId": "not-a-real-channel",
                "address": "bcrt1qnotarealaddress",
                "feerateSatByte": 1,
            },
        )

        assert_status_code(response, 501, "closeChannel should be rejected under NWC")
        assert response.json()["code"] == "unsupported_operation"
        logger.info("✓ closeChannel is rejected as unsupported under NWC")
