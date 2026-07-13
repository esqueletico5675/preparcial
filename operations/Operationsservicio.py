from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select

from models.Servicio import ServicioBase, ServicioId, ServicioUpdate, \
    ServicioProductoBase, ServicioProductoId, ServicioProductoUpdate
from models.Producto import ProductoId


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


# --- Manejo de items del servicio/cotización (mano de obra Y repuestos) ---

def add_servicio_item(item: ServicioProductoBase, session: Session, forzar_sin_stock: bool = False):
    """Agrega un item (mano de obra o repuesto) al servicio. Si es un
    repuesto tomado del catálogo (productoid presente), descuenta el stock.
    Devuelve None si el servicio no existe o el producto no existe.
    Devuelve el texto "stock_insuficiente" si no hay stock y no se forzó
    (para que el frontend pregunte '¿deseas continuar?'). Si forzar_sin_stock
    es True, se agrega igual y el stock puede quedar en negativo (representa
    un faltante/pedido pendiente). Se puede agregar en cualquier momento,
    incluso si el servicio ya fue facturado."""
    servicio = find_servicio(item.servicioid, session)
    if servicio is None:
        return None

    if item.productoid is not None:
        try:
            producto = session.get_one(ProductoId, item.productoid)
        except NoResultFound:
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


def update_servicio_item(item_id: int, data: ServicioProductoUpdate, session: Session, forzar_sin_stock: bool = False):
    """Edita descripción/cantidad/precio/IVA de un item ya agregado. Si el
    item viene de un producto del catálogo y cambia la cantidad, ajusta el
    stock por la diferencia. Devuelve None si el item no existe. Devuelve
    "stock_insuficiente" si el aumento de cantidad supera el stock disponible
    y no se forzó. Se puede editar en cualquier momento, incluso si el
    servicio ya fue facturado."""
    try:
        item = session.get_one(ServicioProductoId, item_id)
    except NoResultFound:
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


def get_servicio_items(servicio_id: int, session: Session):
    return session.exec(
        select(ServicioProductoId).where(ServicioProductoId.servicioid == servicio_id)
    ).all()


def _sincronizar_factura(servicio_id: int, session: Session):
    """Si el servicio ya tiene una factura generada, la recalcula con los
    items actuales. Import local para evitar import circular (Operationsfactura
    ya importa de este archivo)."""
    from operations.Operationsfactura import actualizar_totales_factura
    actualizar_totales_factura(servicio_id, session)


def remove_servicio_item(item_id: int, session: Session):
    """Quita un item del servicio. Si venía de un producto del catálogo, le
    devuelve el stock al inventario. Devuelve None si el item no existe.
    Se puede quitar en cualquier momento, incluso si el servicio ya fue
    facturado."""
    try:
        item = session.get_one(ServicioProductoId, item_id)
    except NoResultFound:
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