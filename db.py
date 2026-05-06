import os
from pathlib import Path
from dotenv import load_dotenv
from sqlmodel import Session, create_engine, SQLModel
from fastapi import FastAPI, Depends
from typing import Annotated

load_dotenv()
neon_db = os.getenv("DATABASE_URL_NEON")
print("DB URL;", neon_db)
engine = create_engine(neon_db)

def create_all_tables(app: FastAPI):
    from models.models import Motorbase, Motorid
    from models.owner import Owner, Ownerid
    print("Creando tablas...")
    SQLModel.metadata.create_all(engine)
    print("Tablas creadas!")
    yield

def get_session() -> Session:
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]


