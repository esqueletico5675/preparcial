from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select

from models.Usuario import UsuarioId, UsuarioCreate, UsuarioUpdate
from security import hash_password


def create_usuario(data: UsuarioCreate, session: Session):
    nuevo = UsuarioId(
        username=data.username,
        role=data.role,
        hashed_password=hash_password(data.password),
    )
    session.add(nuevo)
    session.commit()
    session.refresh(nuevo)
    return nuevo


def find_usuario(id: int, session: Session):
    try:
        return session.get_one(UsuarioId, id)
    except NoResultFound:
        return None


def find_usuario_by_username(username: str, session: Session):
    return session.exec(
        select(UsuarioId).where(UsuarioId.username == username)
    ).first()


def show_all_usuarios(session: Session):
    return session.exec(select(UsuarioId)).all()


def update_usuario(id: int, data: UsuarioUpdate, session: Session):
    usuario = find_usuario(id, session)
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


def delete_usuario(id: int, session: Session):
    usuario = find_usuario(id, session)
    if usuario is None:
        return None
    usuario.active = False
    session.add(usuario)
    session.commit()
    session.refresh(usuario)
    return usuario