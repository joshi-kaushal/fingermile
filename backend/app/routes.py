import uuid
from datetime import date as datetime_date
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db import get_session
from app.auth import get_current_user_id
from app.models import User, ScrollSession, ScrollSessionCreate, MetricsResponse, DailyMetric

router = APIRouter(prefix="/v1")

@router.post("/scroll", status_code=status.HTTP_201_CREATED)
async def upsert_scroll_session(
    payload: ScrollSessionCreate,
    clerk_user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    # 1. Get or create User
    user_stmt = select(User).where(User.clerk_user_id == clerk_user_id)
    user_result = await session.execute(user_stmt)
    user = user_result.scalar_one_or_none()
    
    if not user:
        user = User(clerk_user_id=clerk_user_id)
        session.add(user)
        await session.commit()
        await session.refresh(user)
        
    # 2. Check for existing ScrollSession by session_id (idempotency key)
    session_stmt = select(ScrollSession).where(ScrollSession.session_id == payload.session_id)
    session_result = await session.execute(session_stmt)
    db_session = session_result.scalar_one_or_none()
    
    if db_session:
        # If it exists, update duration, distance, date and site with latest cumulative client values
        db_session.duration_seconds = payload.duration_seconds
        db_session.distance_cm = payload.distance_cm
        db_session.site = payload.site
        db_session.date = payload.date
        session.add(db_session)
    else:
        # If it does not exist, insert new ScrollSession
        db_session = ScrollSession(
            user_id=user.id,
            session_id=payload.session_id,
            site=payload.site,
            duration_seconds=payload.duration_seconds,
            distance_cm=payload.distance_cm,
            date=payload.date
        )
        session.add(db_session)
        
    await session.commit()
    return None


@router.get("/metrics")
async def get_metrics(
    from_date: datetime_date = Query(..., alias="from"),
    to_date: datetime_date = Query(..., alias="to"),
    site: Optional[str] = Query(None),
    clerk_user_id: str = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_session)
):
    # 1. Retrieve User
    user_stmt = select(User).where(User.clerk_user_id == clerk_user_id)
    user_result = await session.execute(user_stmt)
    user = user_result.scalar_one_or_none()
    
    # If user doesn't exist, they have no sessions recorded
    if not user:
        return {
            "from": from_date,
            "to": to_date,
            "data": {},
            "totals": {
                "distance_m": 0.0,
                "duration_min": 0.0
            }
        }
        
    # 2. Parse site filter if provided
    sites_filter = []
    if site:
        sites_filter = [s.strip() for s in site.split(",") if s.strip()]
        
    # 3. Build group query to aggregate daily metrics per site
    query = (
        select(
            ScrollSession.site,
            ScrollSession.date,
            func.sum(ScrollSession.distance_cm).label("total_distance_cm"),
            func.sum(ScrollSession.duration_seconds).label("total_duration_seconds")
        )
        .where(ScrollSession.user_id == user.id)
        .where(ScrollSession.date >= from_date)
        .where(ScrollSession.date <= to_date)
    )
    
    if sites_filter:
        query = query.where(ScrollSession.site.in_(sites_filter))
        
    query = query.group_by(ScrollSession.site, ScrollSession.date).order_by(ScrollSession.date)
    
    result = await session.execute(query)
    rows = result.all()
    
    # 4. Formulate the response structure
    data = {}
    total_distance_cm = 0
    total_duration_seconds = 0
    
    for row in rows:
        site_name = row[0]
        date_key = row[1]
        dist_cm = row[2] or 0
        dur_sec = row[3] or 0
        
        # Accumulate totals
        total_distance_cm += dist_cm
        total_duration_seconds += dur_sec
        
        # Convert values to meters and minutes for front-end rendering
        dist_m = round(dist_cm / 100.0, 1)
        dur_min = round(dur_sec / 60.0, 1)
        
        if site_name not in data:
            data[site_name] = []
            
        data[site_name].append({
            "date": date_key,
            "distance_m": dist_m,
            "duration_min": dur_min
        })
        
    response_payload = {
        "from": from_date,
        "to": to_date,
        "data": data,
        "totals": {
            "distance_m": round(total_distance_cm / 100.0, 1),
            "duration_min": round(total_duration_seconds / 60.0, 1)
        }
    }
    
    return response_payload
