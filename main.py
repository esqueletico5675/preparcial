from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import select

from db import SessionDep, create_all_tables

from models.models import VehicleId, VehicleBase, Vehicleuptader
from models.owner import Ownerid, Owner, uptadeownerchm
from models.Producto import ProductoId, ProductoBase, ProductoUpdate
from models.Servicio import ServicioId, ServicioBase, ServicioUpdate, \
    ServicioProductoId, ServicioProductoBase, ServicioProductoUpdate
from models.Factura import FacturaId, FacturaUpdate
from models.Usuario import UsuarioId, UsuarioCreate, UsuarioPublic

from security import hash_password, verify_password, create_access_token
from Auth import get_current_user, requerir_admin

from operations.Operations import createvehicle, showallvehicle, \
    findonevehicle, uptadevehicle, killvehicle
from operations.operationsowner import createowner, findowner, killOwner, \
    Uptadeowner, showallowners, inactive_owners, active_owners
from operations.Operationsproducto import create_producto, find_producto, \
    show_all_productos, update_producto, deactivate_producto
from operations.Operationsservicio import create_servicio, find_servicio, \
    show_all_servicios, update_servicio, add_servicio_item, \
    update_servicio_item, get_servicio_items, remove_servicio_item
from operations.Operationsfactura import generar_factura, find_factura, \
    show_all_facturas, update_factura

app = FastAPI(lifespan=create_all_tables)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------- AUTENTICACIÓN ----------------------

@app.post("/register", response_model=UsuarioPublic)
async def register_endpoint(
    datos: UsuarioCreate,
    session: SessionDep,
    usuario_actual: UsuarioId = Depends(requerir_admin),
):
    """Crea un usuario nuevo. En un proyecto real, esto normalmente se
    protegería para que solo un admin pueda crear usuarios (con
    Depends(requerir_admin)) — lo dejamos abierto por ahora para poder
    crear el primer usuario admin sin tener ya un token."""
    ya_existe = session.exec(
        select(UsuarioId).where(UsuarioId.username == datos.username)
    ).first()
    if ya_existe:
        raise HTTPException(status_code=400, detail="Ese nombre de usuario ya existe")

    nuevo_usuario = UsuarioId(
        username=datos.username,
        role=datos.role,
        hashed_password=hash_password(datos.password),
    )
    session.add(nuevo_usuario)
    session.commit()
    session.refresh(nuevo_usuario)
    return nuevo_usuario


@app.post("/login")
async def login_endpoint(session: SessionDep, form_data: OAuth2PasswordRequestForm = Depends()):
    """OAuth2PasswordRequestForm espera un formulario (no JSON) con
    'username' y 'password' — así funciona el estándar OAuth2 que usa
    FastAPI, y es lo que permite que el botón 'Authorize' de /docs
    funcione automáticamente."""
    usuario = session.exec(
        select(UsuarioId).where(UsuarioId.username == form_data.username)
    ).first()

    credenciales_invalidas = HTTPException(
        status_code=401,
        detail="Usuario o contraseña incorrectos",
    )
    if not usuario or not usuario.active:
        raise credenciales_invalidas
    if not verify_password(form_data.password, usuario.hashed_password):
        raise credenciales_invalidas

    token = create_access_token(data={"sub": usuario.username, "role": usuario.role})
    return {"access_token": token, "token_type": "bearer"}


@app.get("/me", response_model=UsuarioPublic)
async def me_endpoint(usuario_actual: UsuarioId = Depends(get_current_user)):
    """Endpoint de prueba: si esto responde tus datos, el token funciona.
    Si el token falta, es inválido, o expiró, te dará 401 automáticamente
    (la validación pasa DENTRO de Depends(get_current_user), antes de
    llegar aquí)."""
    return usuario_actual


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
async def delete_vehicle(
            id: int,
            session: SessionDep,
            usuario_actual: UsuarioId = Depends(requerir_admin),
    ):
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
async def kill_owner(
            id: int,
            session: SessionDep,
            usuario_actual: UsuarioId = Depends(requerir_admin),
    ):
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
async def deactivate_producto_endpoint(
    id: int,
    session: SessionDep,
    usuario_actual: UsuarioId = Depends(get_current_user),  # <- esta línea es TODO lo que hay que agregar
):
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


@app.post("/ADDservicioItem", response_model=ServicioProductoId)
async def add_servicio_item_endpoint(item: ServicioProductoBase, session: SessionDep, forzar: bool = False):
    result = add_servicio_item(item, session, forzar_sin_stock=forzar)
    if result == "stock_insuficiente":
        raise HTTPException(status_code=409, detail="stock_insuficiente")
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Servicio no encontrado o producto no encontrado",
        )
    return result


@app.get("/showServicioItems", response_model=list[ServicioProductoId])
async def show_servicio_items_endpoint(servicio_id: int, session: SessionDep):
    return get_servicio_items(servicio_id, session)


@app.patch("/uptadeServicioItem/{item_id}", response_model=ServicioProductoId)
async def update_servicio_item_endpoint(item_id: int, item: ServicioProductoUpdate, session: SessionDep, forzar: bool = False):
    updated = update_servicio_item(item_id, item, session, forzar_sin_stock=forzar)
    if updated == "stock_insuficiente":
        raise HTTPException(status_code=409, detail="stock_insuficiente")
    if not updated:
        raise HTTPException(
            status_code=400,
            detail="Item no encontrado",
        )
    return updated

@app.delete("/removeServicioItem/{item_id}", response_model=ServicioProductoId)
async def remove_servicio_item_endpoint(
            item_id: int,
            session: SessionDep,
            usuario_actual: UsuarioId = Depends(requerir_admin),
    ):
    removed = remove_servicio_item(item_id, session)
    if not removed:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    return removed


# ---------------------- FACTURAS ----------------------

@app.post("/GENERARfactura", response_model=FacturaId)
async def generar_factura_endpoint(
            servicio_id: int,
            session: SessionDep,
            usuario_actual: UsuarioId = Depends(get_current_user),
    ):
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

@app.patch("/uptadeFactura/{id}", response_model=FacturaId)
async def update_factura_endpoint(
            id: int,
            factura: FacturaUpdate,
            session: SessionDep,
            usuario_actual: UsuarioId = Depends(requerir_admin),
    ):
    updated = update_factura(id, factura, session)
    if not updated:
        raise HTTPException(status_code=404, detail="Factura not found")
    return updated


# ---------------------- FRONTEND ----------------------
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")