from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select

from models.Servicio import ServicioBase, ServicioId, ServicioUpdate, \
    ServicioProductoBase, ServicioProductoId, ServicioProductoUpdate
from models.Producto import ProductoId


def create_servicio(servicio: ServicioBase, empresaid: int, session: Session):
    new_servicio = ServicioId.model_validate(servicio, update={"empresaid": empresaid})
    session.add(new_servicio)
    session.commit()
    session.refresh(new_servicio)
    return new_servicio


def find_servicio(id: int, empresaid: int, session: Session):
    try:
        servicio = session.get_one(ServicioId, id)
        if servicio.empresaid != empresaid:
            return None
        return servicio
    except NoResultFound:
        return None


def show_all_servicios(empresaid: int, session: Session):
    return session.exec(
        select(ServicioId).where(ServicioId.empresaid == empresaid)
    ).all()


def update_servicio(id: int, empresaid: int, data: ServicioUpdate, session: Session):
    servicio = find_servicio(id, empresaid, session)
    if servicio is None:
        return None
    updates = data.model_dump(exclude_unset=True)
    servicio.sqlmodel_update(updates)
    session.add(servicio)
    session.commit()
    session.refresh(servicio)
    return servicio


def servicios_by_vehicle(vehicle_id: int, empresaid: int, session: Session):
    return session.exec(
        select(ServicioId).where(
            ServicioId.vehicleid == vehicle_id,
            ServicioId.empresaid == empresaid,
        )
    ).all()


# --- Manejo de items del servicio/cotización (mano de obra Y repuestos) ---

def add_servicio_item(item: ServicioProductoBase, empresaid: int, session: Session, forzar_sin_stock: bool = False):
    """Agrega un item (mano de obra o repuesto) al servicio. Si es un
    repuesto tomado del catálogo (productoid presente), descuenta el stock.
    Devuelve None si el servicio no existe (o no pertenece a la empresa) o
    el producto no existe. Devuelve el texto "stock_insuficiente" si no hay
    stock y no se forzó."""
    servicio = find_servicio(item.servicioid, empresaid, session)
    if servicio is None:
        return None

    if item.productoid is not None:
        try:
            producto = session.get_one(ProductoId, item.productoid)
        except NoResultFound:
            return None
        if producto.empresaid != empresaid:
            return None
        if producto.tipo == "repuesto":
            if producto.stock < item.quantity and not forzar_sin_stock:
                return "stock_insuficiente"
            producto.stock -= item.quantity
            session.add(producto)

    new_item = ServicioProductoId.model_validate(item)
    session.add(new_item)
    session.commit()
    session.refresh(new_item)

    _sincronizar_factura(item.servicioid, session)
    return new_item


def _get_item_verificado(item_id: int, empresaid: int, session: Session):
    """Trae un item solo si el servicio al que pertenece es de esta empresa."""
    try:
        item = session.get_one(ServicioProductoId, item_id)
    except NoResultFound:
        return None
    servicio = find_servicio(item.servicioid, empresaid, session)
    if servicio is None:
        return None
    return item


def update_servicio_item(item_id: int, empresaid: int, data: ServicioProductoUpdate, session: Session, forzar_sin_stock: bool = False):
    """Edita descripción/cantidad/precio/IVA de un item ya agregado."""
    item = _get_item_verificado(item_id, empresaid, session)
    if item is None:
        return None

    updates = data.model_dump(exclude_unset=True)

    if "quantity" in updates and item.productoid is not None:
        producto = session.get_one(ProductoId, item.productoid)
        if producto.tipo == "repuesto":
            diferencia = updates["quantity"] - item.quantity  # > 0 = necesita más stock
            if diferencia > 0 and producto.stock < diferencia and not forzar_sin_stock:
                return "stock_insuficiente"
            producto.stock -= diferencia
            session.add(producto)

    item.sqlmodel_update(updates)
    session.add(item)
    session.commit()
    session.refresh(item)

    _sincronizar_factura(item.servicioid, session)
    return item


def get_servicio_items(servicio_id: int, empresaid: int, session: Session):
    servicio = find_servicio(servicio_id, empresaid, session)
    if servicio is None:
        return []
    return session.exec(
        select(ServicioProductoId).where(ServicioProductoId.servicioid == servicio_id)
    ).all()


def _sincronizar_factura(servicio_id: int, session: Session):
    """Si el servicio ya tiene una factura generada, la recalcula con los
    items actuales. Import local para evitar import circular (Operationsfactura
    ya importa de este archivo)."""
    from operations.Operationsfactura import actualizar_totales_factura
    actualizar_totales_factura(servicio_id, session)


def remove_servicio_item(item_id: int, empresaid: int, session: Session):
    """Quita un item del servicio. Si venía de un producto del catálogo, le
    devuelve el stock al inventario."""
    item = _get_item_verificado(item_id, empresaid, session)
    if item is None:
        return None

    servicioid = item.servicioid

    if item.productoid is not None:
        producto = session.get_one(ProductoId, item.productoid)
        if producto.tipo == "repuesto":
            producto.stock += item.quantity
            session.add(producto)

    session.delete(item)
    session.commit()

    _sincronizar_factura(servicioid, session)
    return item