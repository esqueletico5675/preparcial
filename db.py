import os
from contextlib import asynccontextmanager
from typing import Annotated

from dotenv import load_dotenv
from fastapi import FastAPI, Depends
from sqlmodel import Session, create_engine, SQLModel
from sqlalchemy import text

load_dotenv()
neon_db = os.getenv("DATABASE_URL_NEON")
engine = create_engine(neon_db)


@asynccontextmanager
async def create_all_tables(app: FastAPI):
    # Importar aqui (y no arriba del archivo) para evitar imports circulares,
    # ya que estos modulos a su vez importan cosas de db.py
    from models.models import VehicleId
    from models.owner import Ownerid
    from models.Producto import ProductoId
    from models.Servicio import ServicioId, ServicioProductoId
    from models.Factura import FacturaId
    from models.Usuario import UsuarioId

    print("Creando tablas...")
    SQLModel.metadata.create_all(engine)
    print("Tablas creadas!")

    # Migración simple: si la tabla servicio_producto ya existía antes de
    # agregar el campo aplica_iva, create_all no la modifica (solo crea
    # tablas nuevas). Este ALTER TABLE es seguro para volver a ejecutar
    # cada vez que arranca la app, porque IF NOT EXISTS evita el error si
    # la columna ya está creada.
    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TABLE servicio_producto "
            "ADD COLUMN IF NOT EXISTS aplica_iva BOOLEAN NOT NULL DEFAULT FALSE"
        ))
    print("Migración de aplica_iva verificada!")

    yield


def get_session() -> Session:
    with Session(engine) as session:
        yield session


SessionDep = Annotated[Session, Depends(get_session)]


