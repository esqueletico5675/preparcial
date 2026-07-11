import os
from contextlib import asynccontextmanager
from typing import Annotated

from dotenv import load_dotenv
from fastapi import FastAPI, Depends
from sqlmodel import Session, create_engine, SQLModel

load_dotenv()
neon_db = os.getenv("DATABASE_URL_NEON")
engine = create_engine(neon_db)


@asynccontextmanager
async def create_all_tables(app: FastAPI):
    # Importar aqui (y no arriba del archivo) para evitar imports circulares,
    # ya que estos modulos a su vez importan cosas de db.py
    from models.models import VehicleId
    from models.owner import Ownerid
    from models.producto import ProductoId
    from models.servicio import ServicioId, ServicioProductoId
    from models.factura import FacturaId

    print("Creando tablas...")
    SQLModel.metadata.create_all(engine)
    print("Tablas creadas!")
    yield


def get_session() -> Session:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


