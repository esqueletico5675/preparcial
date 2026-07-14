from sqlmodel import SQLModel, Field
from typing import Literal
# Roles simples. Los usaremos más adelante para restringir qué puede
# hacer cada quien (ej: solo un "admin" puede borrar facturas).
from typing import Literal
from sqlmodel import SQLModel, Field


class UsuarioRol:
    ADMIN = "admin"
    EMPLEADO = "empleado"


class UsuarioBase(SQLModel):
    username: str = Field(min_length=3, max_length=50, unique=True, index=True)
    role: str = Field(default=UsuarioRol.EMPLEADO, max_length=20)  # 👈 vuelve a str, para que la tabla no rompa
    empresaid: int = Field(foreign_key="empresa.id")


class UsuarioId(UsuarioBase, table=True):
    __tablename__ = "usuario"

    id: int | None = Field(default=None, primary_key=True)
    hashed_password: str
    active: bool = Field(default=True)


class UsuarioCreate(UsuarioBase):
    password: str = Field(min_length=6, max_length=100)
    role: Literal["admin", "empleado"] = Field(default=UsuarioRol.EMPLEADO)  # 👈 acá sí, sobreescribe el de la base


class UsuarioPublic(UsuarioBase):
    id: int
    active: bool


class UsuarioUpdate(SQLModel):
    role: Literal["admin", "empleado"] | None = Field(default=None)  # 👈 y acá también
    active: bool | None = Field(default=None)
    password: str | None = Field(default=None, min_length=6, max_length=100)