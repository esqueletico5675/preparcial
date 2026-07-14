import os
from contextlib import asynccontextmanager
from typing import Annotated

from dotenv import load_dotenv
from fastapi import FastAPI, Depends
from sqlmodel import Session, create_engine, SQLModel
from sqlalchemy import text

load_dotenv()
neon_db = os.getenv("DATABASE_URL_NEON")
engine = create_engine(
    neon_db,
    pool_pre_ping=True,
    pool_recycle=300,
)


@asynccontextmanager
async def create_all_tables(app: FastAPI):
    from models.models import VehicleId
    from models.owner import Ownerid
    from models.Producto import ProductoId
    from models.Servicio import ServicioId, ServicioProductoId
    from models.Factura import FacturaId
    from models.Usuario import UsuarioId
    from models.Empresa import EmpresaId

    print("Creando tablas...")
    SQLModel.metadata.create_all(engine)
    print("Tablas creadas!")

    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TABLE servicio_producto "
            "ADD COLUMN IF NOT EXISTS aplica_iva BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        connection.execute(text(
            "ALTER TABLE vehicleid "
            "ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE"
        ))
    print("Migración de aplica_iva y active (vehiculos) verificada!")

    yield


def get_session() -> Session:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]