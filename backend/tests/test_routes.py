import os
import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock

# Force authentication bypass for testing
os.environ["BYPASS_AUTH"] = "true"
os.environ["CLERK_JWKS_URL"] = "http://mock-clerk"

from app.main import app
from app.db import get_session
from app.models import User, ScrollSession

@pytest.mark.asyncio
async def test_health_check():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_scroll_upsert_new_user_and_session():
    mock_session = AsyncMock()
    
    # 1. First execute call: SELECT User -> returns None (user needs creation)
    mock_user_result = MagicMock()
    mock_user_result.scalar_one_or_none.return_value = None
    
    # 2. Second execute call: SELECT ScrollSession -> returns None (new session)
    mock_session_result = MagicMock()
    mock_session_result.scalar_one_or_none.return_value = None
    
    # Sequence the database execute mocks
    mock_session.execute.side_effect = [mock_user_result, mock_session_result]
    
    # Inject mock session dependency
    app.dependency_overrides[get_session] = lambda: mock_session
    
    payload = {
        "session_id": str(uuid.uuid4()),
        "site": "youtube.com",
        "duration_seconds": 300,
        "distance_cm": 45000,
        "date": "2026-06-05"
    }
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/v1/scroll", 
            json=payload, 
            headers={"Authorization": "Bearer test_user_id"}
        )
        
    assert response.status_code == 201
    
    # Assert DB add and commit calls
    assert mock_session.add.call_count == 2
    assert mock_session.commit.call_count == 2
    
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_scroll_upsert_existing_session():
    mock_session = AsyncMock()
    
    # 1. First execute call: SELECT User -> returns existing User
    mock_user = User(id=uuid.uuid4(), clerk_user_id="test_user_id")
    mock_user_result = MagicMock()
    mock_user_result.scalar_one_or_none.return_value = mock_user
    
    # 2. Second execute call: SELECT ScrollSession -> returns existing session
    mock_session_id = uuid.uuid4()
    mock_existing_session = ScrollSession(
        id=uuid.uuid4(),
        user_id=mock_user.id,
        session_id=mock_session_id,
        site="youtube.com",
        duration_seconds=100,
        distance_cm=10000,
        date="2026-06-05"
    )
    mock_session_result = MagicMock()
    mock_session_result.scalar_one_or_none.return_value = mock_existing_session
    
    mock_session.execute.side_effect = [mock_user_result, mock_session_result]
    app.dependency_overrides[get_session] = lambda: mock_session
    
    payload = {
        "session_id": str(mock_session_id),
        "site": "youtube.com",
        "duration_seconds": 300,
        "distance_cm": 45000,
        "date": "2026-06-05"
    }
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/v1/scroll", 
            json=payload, 
            headers={"Authorization": "Bearer test_user_id"}
        )
        
    assert response.status_code == 201
    
    # Should update existing session values and call add/commit
    assert mock_existing_session.duration_seconds == 300
    assert mock_existing_session.distance_cm == 45000
    assert mock_session.add.call_count == 1
    assert mock_session.commit.call_count == 1
    
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_metrics_no_user():
    mock_session = AsyncMock()
    
    # Mock User not found
    mock_user_result = MagicMock()
    mock_user_result.scalar_one_or_none.return_value = None
    mock_session.execute.return_value = mock_user_result
    
    app.dependency_overrides[get_session] = lambda: mock_session
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/v1/metrics?from=2026-06-01&to=2026-06-07", 
            headers={"Authorization": "Bearer test_user_id"}
        )
        
    assert response.status_code == 200
    res = response.json()
    assert res["from"] == "2026-06-01"
    assert res["to"] == "2026-06-07"
    assert res["data"] == {}
    assert res["totals"] == {"distance_m": 0.0, "duration_min": 0.0}
    
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_metrics_retrieval_and_aggregation():
    mock_session = AsyncMock()
    
    # 1. SELECT User -> returns User
    mock_user = User(id=uuid.uuid4(), clerk_user_id="test_user_id")
    mock_user_result = MagicMock()
    mock_user_result.scalar_one_or_none.return_value = mock_user
    
    # 2. SELECT Aggregated Scroll Sessions -> returns mock rows
    mock_rows = [
        ("youtube.com", "2026-06-01", 12050, 2040),
        ("twitter.com", "2026-06-02", 7500, 1200)
    ]
    mock_metrics_result = MagicMock()
    mock_metrics_result.all.return_value = mock_rows
    
    mock_session.execute.side_effect = [mock_user_result, mock_metrics_result]
    app.dependency_overrides[get_session] = lambda: mock_session
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.get(
            "/v1/metrics?from=2026-06-01&to=2026-06-07", 
            headers={"Authorization": "Bearer test_user_id"}
        )
        
    assert response.status_code == 200
    res = response.json()
    
    assert res["from"] == "2026-06-01"
    assert res["to"] == "2026-06-07"
    
    assert res["data"]["youtube.com"] == [{"date": "2026-06-01", "distance_m": 120.5, "duration_min": 34.0}]
    assert res["data"]["twitter.com"] == [{"date": "2026-06-02", "distance_m": 75.0, "duration_min": 20.0}]
    
    assert res["totals"] == {"distance_m": 195.5, "duration_min": 54.0}
    
    app.dependency_overrides.clear()
