from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select

from models.Producto import ProductoBase, ProductoId, ProductoUpdate


def create_producto(producto: ProductoBase, session: Session):
    new_producto = ProductoId.model_validate(producto)
    session.add(new_producto)
    session.commit()
    session.refresh(new_producto)
    return new_producto


def find_producto(id: int, session: Session):
    try:
        return session.get_one(ProductoId, id)
    except NoResultFound:
        return None


def show_all_productos(session: Session):
    return session.exec(select(ProductoId)).all()


def update_producto(id: int, data: ProductoUpdate, session: Session):
    producto = find_producto(id, session)
    if producto is None:
        return None
    updates = data.model_dump(exclude_unset=True)
    producto.sqlmodel_update(updates)
    session.add(producto)
    session.commit()
    session.refresh(producto)
    return producto


def deactivate_producto(id: int, session: Session):
    producto = find_producto(id, session)
    if producto is None:
        return None
    producto.active = False
    session.add(producto)
    session.commit()
    return producto


def productos_bajo_stock(session: Session, umbral: int = 5):
    """Utilidad pensada para el modulo de WhatsApp con proveedores (fase 3):
    lista los repuestos que estan por debajo del umbral de stock."""
    return session.exec(
        select(ProductoId).where(ProductoId.stock < umbral)
    ).all()