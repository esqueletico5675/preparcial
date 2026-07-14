from sqlmodel import Session, select

from models.Usuario import UsuarioId, UsuarioUpdate
from security import hash_password


def find_usuario(id: int, empresaid: int, session: Session):
    """Nunca devuelve un usuario de otra empresa, aunque el ID exista."""
    usuario = session.get(UsuarioId, id)
    if usuario is None or usuario.empresaid != empresaid:
        return None
    return usuario


def show_all_usuarios(empresaid: int, session: Session):
    return session.exec(
        select(UsuarioId).where(UsuarioId.empresaid == empresaid)
    ).all()


def update_usuario(id: int, empresaid: int, data: UsuarioUpdate, session: Session):
    usuario = find_usuario(id, empresaid, session)
    if usuario is None:
        return None

    updates = data.model_dump(exclude_unset=True)
    if "password" in updates:
        password = updates.pop("password")
        usuario.hashed_password = hash_password(password)

    usuario.sqlmodel_update(updates)
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario


def delete_usuario(id: int, empresaid: int, session: Session):
    usuario = find_usuario(id, empresaid, session)
    if usuario is None:
        return None
    usuario.active = False
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario