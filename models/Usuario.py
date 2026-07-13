from sqlmodel import SQLModel, Field

# Roles simples. Los usaremos más adelante para restringir qué puede
# hacer cada quien (ej: solo un "admin" puede borrar facturas).
class UsuarioRol:
    ADMIN = "admin"
    EMPLEADO = "empleado"


class UsuarioBase(SQLModel):
    username: str = Field(min_length=3, max_length=50, unique=True, index=True)
    role: str = Field(default=UsuarioRol.EMPLEADO, max_length=20)


class UsuarioId(UsuarioBase, table=True):
    __tablename__ = "usuario"

    id: int | None = Field(default=None, primary_key=True)
    # OJO: esto NUNCA es la contraseña en texto plano, es el resultado de
    # bcrypt.hashpw(...). Si alguien roba la base de datos, no puede leer
    # las contraseñas reales a partir de esto.
    hashed_password: str
    active: bool = Field(default=True)


# Lo que llega en el body al crear un usuario (con la contraseña en
# texto plano, SOLO en este momento, porque viaja por HTTPS y se hashea
# antes de guardar nada).
class UsuarioCreate(UsuarioBase):
    password: str = Field(min_length=6, max_length=100)


# Lo que devolvemos al frontend: nunca incluye hashed_password.
class UsuarioPublic(UsuarioBase):
    id: int
    active: bool