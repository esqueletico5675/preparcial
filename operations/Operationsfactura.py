from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select

from models.factura import FacturaId
from models.servicio import ServicioEstado
from operations.operationsservicio import find_servicio, get_servicio_items

# IVA general en Colombia. Ajusta esto si el taller aplica una tarifa
# distinta (p. ej. régimen simplificado) o si mas adelante lo quieres
# configurable por .env
IVA_RATE = 0.19


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
    subtotal_productos = sum(item.quantity * item.unit_price for item in items)
    subtotal = subtotal_productos + servicio.labor_cost
    iva = round(subtotal * IVA_RATE, 2)
    total = round(subtotal + iva, 2)

    factura = FacturaId(
        servicioid=servicio_id,
        subtotal=round(subtotal, 2),
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


def show_all_facturas(session: Session):
    return session.exec(select(FacturaId)).all()


def facturas_by_status(status: str, session: Session):
    return session.exec(
        select(FacturaId).where(FacturaId.status == status)
    ).all()