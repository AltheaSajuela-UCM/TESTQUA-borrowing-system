from datetime import datetime

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import logic
from database import Base, engine, get_db

Base.metadata.create_all(bind=engine)  # creates tables automatically

app = FastAPI(title="Webventory")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class BorrowRequest(BaseModel):
    userIdNumber: str
    itemId: int
    expectedReturnDate: datetime


@app.get("/api/admin/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    return logic.get_dashboard_metrics(db)


@app.post("/api/admin/borrow", status_code=201)
def create_borrow_request(payload: BorrowRequest, db: Session = Depends(get_db)):
    try:
        tx = logic.process_borrow(db, payload.userIdNumber, payload.itemId, payload.expectedReturnDate)
        return tx.to_dict()
    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})