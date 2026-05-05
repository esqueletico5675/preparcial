from fastapi import FastAPI

from Operations import createmoto, showallmotos
from models import Motorid, Motorbase
from db import  sessionDep, create_all_tables
app = FastAPI()


@app.post("/CREATEMOTO",response_model=Motorid)
async def CreateMoto(moto: Motorbase, session : sessionDep ):
    return createmoto(moto, session)


@app.get("/showallmotos",response_model=list[Motorid])
async def mostrar(session: sessionDep):
    return showallmotos(session)
