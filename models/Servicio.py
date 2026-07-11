from datetime import date
from sqlmodel import SQLModel, Field


# Estados posibles de un servicio (usar como referencia, no como Enum estricto
# para no romper compatibilidad si luego migras a un Enum real)
class ServicioEstado:
    PENDIENTE = "pendiente"
    EN_PROCESO = "en_proceso"
    COMPLETADO = "completado"
    FACTURADO = "facturado"


class ServicioBase(SQLModel):
    vehicleid: int = Field(foreign_key="vehicleid.id")
    description: str = Field(min_length=3, max_length=500)
    labor_cost: float = Field(default=0, ge=0)
    status: str = Field(default=ServicioEstado.PENDIENTE, max_length=20)
    fecha: date = Field(default_factory=date.today)


class ServicioId(ServicioBase, table=True):
    __tablename__ = "servicio"

    id: int | None = Field(default=None, primary_key=True)


class ServicioUpdate(SQLModel):
    description: str | None = Field(default=None, min_length=3, max_length=500)
    labor_cost: float | None = Field(default=None, ge=0)
    status: str | None = Field(default=None, max_length=20)


# --- Detalle: qué repuestos se usaron en cada servicio ---

class ServicioProductoBase(SQLModel):
    servicioid: int = Field(foreign_key="servicio.id")
    productoid: int = Field(foreign_key="producto.id")
    quantity: int = Field(gt=0)
    # se guarda el precio en el momento del uso, para que si el producto
    # sube de precio despues, las facturas viejas no se vean afectadas
    unit_price: float = Field(gt=0)


class ServicioProductoId(ServicioProductoBase, table=True):
    __tablename__ = "servicio_producto"

    id: int | None = Field(default=None, primary_key=True)