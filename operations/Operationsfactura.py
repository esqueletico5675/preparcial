from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select

from models.Factura import FacturaId, FacturaUpdate
from models.Servicio import ServicioEstado
from operations.Operationsservicio import find_servicio, get_servicio_items

# IVA general en Colombia (19%), aplicado solo a los items que tengan
# aplica_iva=True (esto se elige por item en la pantalla de Servicios).
IVA_RATE = 0.19


def _calcular_totales(servicio, items):
    """Calcula subtotal, IVA y total a partir de los items actuales del
    servicio. El IVA solo se suma sobre los items marcados con
    aplica_iva=True (a la tarifa del 19%)."""
    subtotal_productos = sum(item.quantity * item.unit_price for item in items)
    subtotal = subtotal_productos + servicio.labor_cost
    iva = sum(
        item.quantity * item.unit_price * IVA_RATE
        for item in items
        if item.aplica_iva
    )
    subtotal = round(subtotal, 2)
    iva = round(iva, 2)
    total = round(subtotal + iva, 2)
    return subtotal, iva, total


def generar_factura(servicio_id: int, session: Session):
    """Calcula subtotal (mano de obra + repuestos), IVA y total, y crea la
    factura. Marca el servicio como facturado. Devuelve None si el servicio
    no existe o si ya fue facturado."""
    servicio = find_servicio(servicio_id, session)
    if servicio is None:
        return None
    if servicio.status == ServicioEstado.FACTURADO:
        return None  # evita duplicar facturas para el mismo servicio

    items = get_servicio_items(servicio_id, session)
    subtotal, iva, total = _calcular_totales(servicio, items)

    factura = FacturaId(
        servicioid=servicio_id,
        subtotal=subtotal,
        iva=iva,
        total=total,
    )
    session.add(factura)

    servicio.status = ServicioEstado.FACTURADO
    session.add(servicio)

    session.commit()
    session.refresh(factura)
    return factura


def find_factura(id: int, session: Session):
    try:
        return session.get_one(FacturaId, id)
    except NoResultFound:
        return None


def find_factura_by_servicio(servicio_id: int, session: Session):
    """Busca la factura asociada a un servicio (si existe)."""
    return session.exec(
        select(FacturaId).where(FacturaId.servicioid == servicio_id)
    ).first()


def actualizar_totales_factura(servicio_id: int, session: Session):
    """Si el servicio ya tiene una factura generada, recalcula subtotal,
    IVA y total con los items actuales del servicio y actualiza la factura.
    No hace nada si el servicio todavía no ha sido facturado. Se llama
    automáticamente cada vez que se agrega, edita o quita un item del
    servicio, para que la factura nunca quede desactualizada."""
    factura = find_factura_by_servicio(servicio_id, session)
    if factura is None:
        return None

    servicio = find_servicio(servicio_id, session)
    if servicio is None:
        return None

    items = get_servicio_items(servicio_id, session)
    subtotal, iva, total = _calcular_totales(servicio, items)

    factura.subtotal = subtotal
    factura.iva = iva
    factura.total = total
    session.add(factura)
    session.commit()
    session.refresh(factura)
    return factura


def show_all_facturas(session: Session):
    return session.exec(select(FacturaId)).all()


def facturas_by_status(status: str, session: Session):
    return session.exec(
        select(FacturaId).where(FacturaId.status == status)
    ).all()


def update_factura(id: int, data: FacturaUpdate, session: Session):
    factura = find_factura(id, session)
    if factura is None:
        return None
    updates = data.model_dump(exclude_unset=True)
    factura.sqlmodel_update(updates)
    session.add(factura)
    session.commit()
    session.refresh(factura)
    return factura