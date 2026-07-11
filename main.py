from fastapi import FastAPI, HTTPException

from db import SessionDep, create_all_tables

from models.models import VehicleId, VehicleBase, Vehicleuptader
from models.owner import Ownerid, Owner, uptadeownerchm
from models.Producto import ProductoId, ProductoBase, ProductoUpdate
from models.Servicio import ServicioId, ServicioBase, ServicioUpdate, \
    ServicioProductoId, ServicioProductoBase
from models.Factura import FacturaId

from operations.Operations import createvehicle, showallvehicle, \
    findonevehicle, uptadevehicle, killvehicle
from operations.operationsowner import createowner, findowner, killOwner, \
    Uptadeowner, showallowners, inactive_owners, active_owners
from operations.Operationsproducto import create_producto, find_producto, \
    show_all_productos, update_producto, deactivate_producto
from operations.Operationsservicio import create_servicio, find_servicio, \
    show_all_servicios, update_servicio, add_producto_to_servicio, \
    get_servicio_items
from operations.Operationsfactura import generar_factura, find_factura, \
    show_all_facturas

app = FastAPI(lifespan=create_all_tables)


# ---------------------- VEHICULOS ----------------------

@app.post("/CREATEVEHICLE", response_model=VehicleId)
async def CreateMoto(Vehicle: VehicleBase, session: SessionDep):
    owner = findowner(Vehicle.ownerid, session)
    if owner:
        return createvehicle(Vehicle, session)
    raise HTTPException(status_code=404, detail="Owner not found")


@app.get("/showallvehicle", response_model=list[VehicleId])
async def mostrar(session: SessionDep):
    return showallvehicle(session)


@app.get("/FindOneVehicle", response_model=VehicleId)
async def FindoneVehicle(id: int, session: SessionDep):
    vehicle = findonevehicle(id, session)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Motor not found")
    return vehicle


@app.patch("/VehicleUPTADER/{id}", response_model=VehicleId)
async def VehicleuPTADER(id: int, motor: Vehicleuptader, session: SessionDep):
    uptade = uptadevehicle(id, motor, session)
    if not uptade:
        raise HTTPException(status_code=404, detail="Motor not found")
    return uptade


@app.delete("/KILLVEHICLE", response_model=VehicleBase)
async def delete_vehicle(id: int, session: SessionDep):
    delete = killvehicle(id, session)
    if not delete:
        raise HTTPException(status_code=404, detail="Motor not found")
    return delete


# ---------------------- OWNERS ----------------------

@app.post("/CREATEowner", response_model=Ownerid)
def create_owner(owner: Owner, session: SessionDep):
    return createowner(owner, session)


@app.patch("/uptadeOwner/{id}", response_model=Ownerid)
async def uptadeowner_endopoint(id: int, owner: uptadeownerchm, session: SessionDep):
    uptade = Uptadeowner(id, owner, session)
    if not uptade:
        raise HTTPException(status_code=404, detail="Owner not found")
    return uptade


@app.delete("/KILLowner/{id}", response_model=Ownerid)
async def kill_owner(id: int, session: SessionDep):
    delete = killOwner(id, session)
    if not delete:
        raise HTTPException(status_code=404, detail="Owner not found")
    return delete


@app.get("/showowners", response_model=list[Ownerid])
async def ownershow(session: SessionDep):
    return showallowners(session)


@app.get("/inactive_owners", response_model=list[Ownerid])
async def ownersinactive(session: SessionDep):
    return inactive_owners(session)


@app.get("/active_owners", response_model=list[Ownerid])
async def owners_active(session: SessionDep):
    return active_owners(session)


# ---------------------- PRODUCTOS / INVENTARIO ----------------------

@app.post("/CREATEproducto", response_model=ProductoId)
async def create_producto_endpoint(producto: ProductoBase, session: SessionDep):
    return create_producto(producto, session)


@app.get("/showproductos", response_model=list[ProductoId])
async def show_productos_endpoint(session: SessionDep):
    return show_all_productos(session)


@app.get("/FindOneProducto", response_model=ProductoId)
async def find_producto_endpoint(id: int, session: SessionDep):
    producto = find_producto(id, session)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto not found")
    return producto


@app.patch("/uptadeProducto/{id}", response_model=ProductoId)
async def update_producto_endpoint(id: int, producto: ProductoUpdate, session: SessionDep):
    updated = update_producto(id, producto, session)
    if not updated:
        raise HTTPException(status_code=404, detail="Producto not found")
    return updated


@app.delete("/KILLproducto/{id}", response_model=ProductoId)
async def deactivate_producto_endpoint(id: int, session: SessionDep):
    deactivated = deactivate_producto(id, session)
    if not deactivated:
        raise HTTPException(status_code=404, detail="Producto not found")
    return deactivated


# ---------------------- SERVICIOS / ORDENES DE TRABAJO ----------------------

@app.post("/CREATEservicio", response_model=ServicioId)
async def create_servicio_endpoint(servicio: ServicioBase, session: SessionDep):
    vehicle = findonevehicle(servicio.vehicleid, session)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return create_servicio(servicio, session)


@app.get("/showservicios", response_model=list[ServicioId])
async def show_servicios_endpoint(session: SessionDep):
    return show_all_servicios(session)


@app.get("/FindOneServicio", response_model=ServicioId)
async def find_servicio_endpoint(id: int, session: SessionDep):
    servicio = find_servicio(id, session)
    if not servicio:
        raise HTTPException(status_code=404, detail="Servicio not found")
    return servicio


@app.patch("/uptadeServicio/{id}", response_model=ServicioId)
async def update_servicio_endpoint(id: int, servicio: ServicioUpdate, session: SessionDep):
    updated = update_servicio(id, servicio, session)
    if not updated:
        raise HTTPException(status_code=404, detail="Servicio not found")
    return updated


@app.post("/ADDproductoServicio", response_model=ServicioProductoId)
async def add_producto_servicio_endpoint(item: ServicioProductoBase, session: SessionDep):
    result = add_producto_to_servicio(item, session)
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Producto no encontrado o stock insuficiente",
        )
    return result


@app.get("/showServicioItems", response_model=list[ServicioProductoId])
async def show_servicio_items_endpoint(servicio_id: int, session: SessionDep):
    return get_servicio_items(servicio_id, session)


# ---------------------- FACTURAS ----------------------

@app.post("/GENERARfactura", response_model=FacturaId)
async def generar_factura_endpoint(servicio_id: int, session: SessionDep):
    factura = generar_factura(servicio_id, session)
    if not factura:
        raise HTTPException(
            status_code=400,
            detail="Servicio no encontrado o ya fue facturado",
        )
    return factura


@app.get("/showfacturas", response_model=list[FacturaId])
async def show_facturas_endpoint(session: SessionDep):
    return show_all_facturas(session)


@app.get("/FindOneFactura", response_model=FacturaId)
async def find_factura_endpoint(id: int, session: SessionDep):
    factura = find_factura(id, session)
    if not factura:
        raise HTTPException(status_code=404, detail="Factura not found")
    return factura