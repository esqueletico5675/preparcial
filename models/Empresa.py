from sqlmodel import SQLModel, Field


class EmpresaBase(SQLModel):
    nombre: str = Field(min_length=2, max_length=100)


class EmpresaId(EmpresaBase, table=True):
    __tablename__ = "empresa"

    id: int | None = Field(default=None, primary_key=True)
    active: bool = Field(default=True)


class EmpresaUpdate(SQLModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=100)
    active: bool | None = Field(default=None)