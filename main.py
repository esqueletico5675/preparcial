from fastapi import FastAPI, HTTPException
from operations.Operations import createmoto, showallmotos
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

@app.post("/CREATEowner",response_model=Ownerid)
def create_owner (owner : Owner, session : SessionDep):
    return createowner(owner, session)