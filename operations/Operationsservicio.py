from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select

from models.servicio import ServicioBase, ServicioId, ServicioUpdate, \
    ServicioProductoBase, ServicioProductoId
from models.producto import ProductoId


def create_servicio(servicio: ServicioBase, session: Session):
    new_servicio = ServicioId.model_validate(servicio)
    session.add(new_servicio)
    session.commit()
    session.refresh(new_servicio)
    return new_servicio


def find_servicio(id: int, session: Session):
    try:
        return session.get_one(ServicioId, id)
    except NoResultFound:
        return None


def show_all_servicios(session: Session):
    return session.exec(select(ServicioId)).all()


def update_servicio(id: int, data: ServicioUpdate, session: Session):
    servicio = find_servicio(id, session)
    if servicio is None:
        return None
    updates = data.model_dump(exclude_unset=True)
    servicio.sqlmodel_update(updates)
    session.add(servicio)
    session.commit()
    session.refresh(servicio)
    return servicio


def servicios_by_vehicle(vehicle_id: int, session: Session):
    return session.exec(
        select(ServicioId).where(ServicioId.vehicleid == vehicle_id)
    ).all()


# --- Manejo de repuestos usados en un servicio ---

def add_producto_to_servicio(item: ServicioProductoBase, session: Session):
    """Agrega un repuesto al servicio y descuenta el stock. Devuelve None si
    el producto no existe o si no hay stock suficiente."""
    try:
        producto = session.get_one(ProductoId, item.productoid)
    except NoResultFound:
        return None

    if producto.stock < item.quantity:
        return None  # stock insuficiente

    producto.stock -= item.quantity
    session.add(producto)

    new_item = ServicioProductoId.model_validate(item)
    session.add(new_item)
    session.commit()
    session.refresh(new_item)
    return new_item


def get_servicio_items(servicio_id: int, session: Session):
    return session.exec(
        select(ServicioProductoId).where(ServicioProductoId.servicioid == servicio_id)
    ).all()


def remove_servicio_item(item_id: int, session: Session):
    """Quita un repuesto del servicio y le devuelve el stock al inventario."""
    try:
        item = session.get_one(ServicioProductoId, item_id)
    except NoResultFound:
        return None

    producto = session.get_one(ProductoId, item.productoid)
    producto.stock += item.quantity
    session.add(producto)

    session.delete(item)
    session.commit()
    return item