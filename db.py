import os
from dotenv import load_dotenv
from sqlmodel import Session, create_engine, SQLModel
from fastapi import FastAPI, Depends
from typing import Annotated

load_dotenv()
neon_db = os.getenv("DATABASE_URL_NEON")
engine = create_engine(neon_db)

def create_all_tables(app: FastAPI):
    if os.getenv("ENV") == "DEV":
        SQLModel.metadata.create_all(engine)
    yield

def get_session()->Session:
    with Session(engine) as session:
        yield session

sessionDep = Annotated[Session,Depends(get_session)]


