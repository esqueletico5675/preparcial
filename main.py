from fastapi import FastAPI, HTTPException
from psycopg2.extras import register_uuid

from operations.Operations import createmoto, showallmotos, Motoruptader, killmotor, findonemoto, uptademoto
from operations.operationsowner import createowner,findowner
from models.models import Motorid, Motorbase
from models.owner import Ownerid, Owner
from db import  SessionDep, create_all_tables
app = FastAPI(lifespan=create_all_tables)


@app.post("/CREATEMOTO",response_model=Motorid)
async def CreateMoto(moto: Motorbase, session : SessionDep ):
    owner = findowner(moto.ownerid, session)
    if owner:
        return createmoto(moto, session)
    else:
        raise HTTPException(status_code=404, detail="Owner not found")



@app.get("/showallmotos",response_model=list[Motorid])
async def mostrar(session: SessionDep):
    return showallmotos(session)

@app.get("/FindOneMoto",response_model=Motorid)
async def FindoneMoto(id: int,session: SessionDep):
    motor = findonemoto(id, session)
    if not (motor):
        raise HTTPException(status_code=404, detail="Motor not found")
    return motor

@app.patch("/MOTORUPTADER/{id}",response_model=Motorid)
async def MOTORuPTADER(id:int,motor : Motoruptader,session: SessionDep):
    uptade = uptademoto(id,motor,session)
    if not (uptade):
        raise HTTPException(status_code=404, detail="Motor not found")
    return uptade

@app.delete("/KILLMOTOR",response_model=Motorbase)
async def delete_motor(id: int,session: SessionDep):
    delete = killmotor(id,session)
    if not (delete):
        raise HTTPException(status_code=404, detail="Motor not found")
    return delete

@app.post("/CREATEowner",response_model=Ownerid)
def create_owner (owner : Owner, session : SessionDep):
    return createowner(owner, session)