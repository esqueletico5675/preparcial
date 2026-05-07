from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select
from models.models import Motorbase, Motorid,Motoruptader

def createmoto(moto: Motorbase, session: Session):
    newmoto = Motorid.model_validate(moto)
    session.add(newmoto)
    session.commit()
    session.refresh(newmoto)
    return newmoto

def showallmotos(session: Session):
    return session.exec(select(Motorid))

def findonemoto(id : int, session: Session):
    try:
        return session.get_one(Motorid,id)
    except NoResultFound:
        return None


def uptademoto (id:int ,newmotor: Motoruptader, session: Session):
    motor = findonemoto(id, session)
    if motor is None:
        return None
    motorupt = newmotor.model_dump(exclude_unset= True)
    motor.sqlmodel_update(motorupt)
    session.add(motor)
    session.commit()
    session.refresh(motor)
    return motor

def killmotor (id: int, session: Session):
    try :
        moto = session.get_one(Motorid,id)
        session.delete(moto)
        session.commit()
        return moto
    except NoResultFound:
        return None