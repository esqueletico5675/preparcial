from datetime import date
from sqlmodel import SQLModel, Field


# Estados posibles de un servicio (usar como referencia, no como Enum estricto
# para no romper compatibilidad si luego migras a un Enum real)
class ServicioEstado:
    PENDIENTE = "pendiente"
    EN_PROCESO = "en_proceso"
    COMPLETADO = "completado"
    FACTURADO = "facturado"


# Tipo de cada item dentro de un servicio/cotización
class ItemTipo:
    MANO_OBRA = "mano_obra"
    REPUESTO = "repuesto"


class ServicioBase(SQLModel):
    vehicleid: int = Field(foreign_key="vehicleid.id")
    description: str = Field(min_length=3, max_length=500)
    # Se deja este campo por compatibilidad con la base de datos existente,
    # pero YA NO SE USA: la mano de obra ahora es un item más dentro de
    # servicio_producto (tipo="mano_obra"), con precio y cantidad editables,
    # igual que los repuestos.
    labor_cost: float = Field(default=0, ge=0)
    status: str = Field(default=ServicioEstado.PENDIENTE, max_length=20)
    fecha: date = Field(default_factory=date.today)


class ServicioId(ServicioBase, table=True):
    __tablename__ = "servicio"

    id: int | None = Field(default=None, primary_key=True)


class ServicioUpdate(SQLModel):
    description: str | None = Field(default=None, min_length=3, max_length=500)
    status: str | None = Field(default=None, max_length=20)


# --- Detalle: items del servicio/cotización (mano de obra Y repuestos,
#     unificados en una sola tabla) ---

class ServicioProductoBase(SQLModel):
    servicioid: int = Field(foreign_key="servicio.id")
    tipo: str = Field(default=ItemTipo.REPUESTO, max_length=20)
    # Solo se llena cuando tipo="repuesto" y se eligió un producto del
    # catálogo (para reutilizar el nombre). Queda vacío en mano de obra,
    # o si el repuesto se escribe libremente sin estar en el catálogo.
    productoid: int | None = Field(default=None, foreign_key="producto.id")
    # Descripción libre: se guarda siempre, así la cotización queda
    # "congelada" aunque después cambies el nombre del producto en el catálogo.
    descripcion: str = Field(min_length=1, max_length=200)
    quantity: float = Field(gt=0)
    # Precio libre: se escribe/edita en el momento, no viene fijo de
    # ningún catálogo (los precios varían de un trabajo a otro).
    unit_price: float = Field(gt=0)


class ServicioProductoId(ServicioProductoBase, table=True):
    __tablename__ = "servicio_producto"

    id: int | None = Field(default=None, primary_key=True)


class ServicioProductoUpdate(SQLModel):
    descripcion: str | None = Field(default=None, min_length=1, max_length=200)
    quantity: float | None = Field(default=None, gt=0)
    unit_price: float | None = Field(default=None, gt=0)