from datetime import date
from sqlmodel import SQLModel, Field


class FacturaEstado:
    PENDIENTE = "pendiente"
    PAGADA = "pagada"
    ANULADA = "anulada"


class FacturaBase(SQLModel):
    servicioid: int = Field(foreign_key="servicio.id")
    subtotal: float = Field(ge=0)
    iva: float = Field(ge=0)
    total: float = Field(ge=0)
    fecha: date = Field(default_factory=date.today)
    status: str = Field(default=FacturaEstado.PENDIENTE, max_length=20)

    # Campos que se llenaran cuando integremos la DIAN (fase 2). Por ahora
    # quedan nulos, no se usan todavia.
    dian_cufe: str | None = Field(default=None, max_length=100)
    dian_status: str | None = Field(default=None, max_length=30)


class FacturaId(FacturaBase, table=True):
    __tablename__ = "factura"

    id: int | None = Field(default=None, primary_key=True)


class FacturaUpdate(SQLModel):
    status: str | None = Field(default=None, max_length=20)