from fastapi import FastAPI, HTTPException
from psycopg2.extras import register_uuid

from operations.Operations import createvehicle, showallvehicle, Vehicleuptader, killmotor, findonevehicle, \
    uptadevehicle, killvehicle
from operations.operationsowner import createowner, findowner, killOwner, uptadeownerchm, Uptadeowner, showallowners, \
    inactive_owners,active_owners
from models.models import VehicleId, VehicleBase
from models.owner import Ownerid, Owner
from db import  SessionDep, create_all_tables
app = FastAPI(lifespan=create_all_tables)


@app.post("/CREATEVEHICLE", response_model=VehicleId)
async def CreateMoto(Vehicle: VehicleBase, session : SessionDep):
    owner = findowner(Vehicle.ownerid, session)
    if owner:
        return createvehicle(Vehicle, session)
    else:
        raise HTTPException(status_code=404, detail="Owner not found")



@app.get("/showallvehicle", response_model=list[VehicleId])
async def mostrar(session: SessionDep):
    return showallvehicle(session)

@app.get("/FindOneMoto", response_model=VehicleId)
async def FindoneMoto(id: int,session: SessionDep):
    vehicle = findonevehicle(id, session)
    if not (vehicle):
        raise HTTPException(status_code=404, detail="Motor not found")
    return vehicle

@app.patch("/MOTORUPTADER/{id}", response_model=VehicleId)
async def MOTORuPTADER(id:int, motor : Vehicleuptader, session: SessionDep):
    uptade = uptadevehicle(id,motor,session)
    if not (uptade):
        raise HTTPException(status_code=404, detail="Motor not found")
    return uptade

@app.delete("/KILLVEHICLE", response_model=VehicleBase)
async def delete_vehicle(id: int,session: SessionDep):
    delete = killvehicle(id,session)
    if not (delete):
        raise HTTPException(status_code=404, detail="Motor not found")
    return delete

@app.post("/CREATEowner",response_model=Ownerid)
def create_owner (owner : Owner, session : SessionDep):
    return createowner(owner, session)


@app.patch("/uptadeOwner/{id}", response_model=Ownerid)
async def uptadeowner_endopoint(id: int, owner:uptadeownerchm, session: SessionDep):
    uptade = Uptadeowner(id, owner, session)
    if not uptade:
        raise HTTPException(status_code=404, detail="Owner not found")
    return uptade

@app.delete("/KILLowner/{id}", response_model=VehicleId)
async def kill_owner(id: int,session: SessionDep):
    delete = killOwner(id,session)
    if not (delete):
        raise HTTPException(status_code=404, detail="Owner not found")
    return delete

@app.get("/showowners",response_model=list[Ownerid])
async def ownershow(session: SessionDep):
    return showallowners(session)

@app.get("/inactive_owners",response_model=list[Ownerid])
async def ownersinactive(session: SessionDep):
    return inactive_owners(session)

@app.get("/active_owners",response_model=list[Ownerid])
async def owners_active(session: SessionDep):
    return active_owners(session)
