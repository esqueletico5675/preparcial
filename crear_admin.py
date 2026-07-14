import getpass

from sqlmodel import Session, select

from db import engine
from models.Usuario import UsuarioId, UsuarioRol
from models.Empresa import EmpresaId
from security import hash_password


def main():
    username = input("Username del admin: ").strip()
    password = getpass.getpass("Contraseña: ")
    empresaid = input("ID de la empresa: ").strip()

    if len(password) < 6:
        print("La contraseña debe tener al menos 6 caracteres.")
        return

    if not empresaid.isdigit():
        print("Debes indicar un ID de empresa numérico válido.")
        return

    with Session(engine) as session:
        existente = session.exec(
            select(UsuarioId).where(UsuarioId.username == username)
        ).first()
        if existente:
            print(f"Ya existe un usuario '{username}'. No se creó nada.")
            return

        admin = UsuarioId(
            username=username,
            role=UsuarioRol.ADMIN,
            hashed_password=hash_password(password),
            empresaid=int(empresaid),
        )
        session.add(admin)
        session.commit()
        print(f"Admin '{username}' creado correctamente en la empresa {empresaid}.")


if __name__ == "__main__":
    main()