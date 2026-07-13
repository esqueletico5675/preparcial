"""
Funciones de seguridad: hashear/verificar contraseñas y crear/leer tokens JWT.

Por qué está todo junto en un solo archivo: son piezas pequeñas y muy
relacionadas (todas responden a "¿es esta persona quien dice ser?").
A medida que el proyecto crezca, puedes separar esto en una carpeta
auth/ con varios archivos, pero para aprender es más claro verlo junto.
"""

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()

# La SECRET_KEY es lo que firma los tokens. Si alguien la conoce, puede
# fabricar tokens falsos y hacerse pasar por cualquier usuario — por eso
# vive en el archivo .env (que NUNCA se sube a GitHub) y no aquí en el código.
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "Falta JWT_SECRET_KEY en tu archivo .env. "
        "Genera una con: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

ALGORITHM = "HS256"  # algoritmo de firma, HS256 es el estándar para este caso
ACCESS_TOKEN_EXPIRE_MINUTES = 60  # el token deja de servir después de 1 hora


# ---------------- Contraseñas ----------------

def hash_password(password: str) -> str:
    """Convierte una contraseña en texto plano en un hash irreversible.
    bcrypt agrega automáticamente un "salt" (datos aleatorios) para que
    dos personas con la misma contraseña no tengan el mismo hash."""
    salt = bcrypt.gensalt()
    hash_bytes = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hash_bytes.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compara una contraseña en texto plano contra un hash guardado.
    No se puede 'deshacer' el hash, por eso bcrypt vuelve a hashear la
    contraseña que llega y compara los resultados."""
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


# ---------------- Tokens JWT ----------------

def create_access_token(data: dict, expires_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES) -> str:
    """Crea un token JWT firmado. 'data' normalmente trae al menos
    {"sub": username} -- 'sub' (subject) es el campo estándar de JWT
    para decir de quién es el token."""
    to_encode = data.copy()
    expira = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expira})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Verifica la firma del token y que no haya expirado. Si algo está
    mal, jwt.decode lanza una excepción (jwt.PyJWTError o una subclase,
    como jwt.ExpiredSignatureError)."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])