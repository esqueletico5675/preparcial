from sqlmodel import Session, select

from models import Motorbase, Motorid

def createmoto(moto: Motorbase, session: Session):
    newmoto = Motorid.model_validate(moto)
    session.add(newmoto)
    session.commit()
    session.refresh(newmoto)
    return newmoto

def showallmotos(session: Session):
    return session.exec(select(Motorid))