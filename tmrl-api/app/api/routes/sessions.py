from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_api_token
from app.schemas.session import SessionsResponse, TrainingSessionCreate, TrainingSessionOut, TrainingSessionPatch
from app.services.session_service import SessionService

router = APIRouter()


@router.get("/sessions", response_model=SessionsResponse)
def list_sessions(db: Session = Depends(get_db)) -> SessionsResponse:
    return SessionService(db).list_sessions()


@router.post("/sessions", response_model=TrainingSessionOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_api_token)])
def create_session(payload: TrainingSessionCreate, db: Session = Depends(get_db)) -> TrainingSessionOut:
    return SessionService(db).create_session(payload)


@router.patch("/sessions/{session_id}", response_model=TrainingSessionOut, dependencies=[Depends(require_api_token)])
def update_session(session_id: str, payload: TrainingSessionPatch, db: Session = Depends(get_db)) -> TrainingSessionOut:
    return SessionService(db).update_session(session_id, payload)
