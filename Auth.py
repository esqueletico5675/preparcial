"""
Dependencias de FastAPI relacionadas a "quién está haciendo esta petición".

OAuth2PasswordBearer es una clase de FastAPI que sabe leer el header:
    Authorization: Bearer <token>
y sacar solo el <token>. No hace nada de JWT por sí sola, solo extrae
el texto del header — la validación la hacemos nosotros con security.py.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import PyJWTError
from sqlmodel import select

from db import SessionDep
from security import decode_access_token
from models.Usuario import UsuarioId

# tokenUrl le dice a la documentación automática (/docs) en qué endpoint
# se consigue el token, para que el botón "Authorize" funcione solo.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def get_current_user(session: SessionDep, token: str = Depends(oauth2_scheme)) -> UsuarioId:
    """Dependency que se usa así en un endpoint:

        async def mi_endpoint(usuario: UsuarioId = Depends(get_current_user)):
            ...

    FastAPI la ejecuta ANTES de entrar a la función del endpoint. Si el
    token no es válido, lanza un 401 y la función del endpoint ni siquiera
    llega a correr.
    """
    error_credenciales = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudo validar la credencial",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        username = payload.get("sub")
        if username is None:
            raise error_credenciales
    except PyJWTError:
        # Cubre token mal formado, firma inválida, o expirado.
        raise error_credenciales

    usuario = session.exec(
        select(UsuarioId).where(UsuarioId.username == username)
    ).first()

    if usuario is None or not usuario.active:
        raise error_credenciales

    return usuario


def requerir_admin(usuario: UsuarioId = Depends(get_current_user)) -> UsuarioId:
    """Dependency más estricta: además de estar logueado, debe ser admin.
    Úsala en endpoints delicados, ej: borrar facturas o crear usuarios."""
    if usuario.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta acción requiere rol de administrador",
        )
    return usuario