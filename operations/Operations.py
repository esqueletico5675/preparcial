from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select
from models.models import VehicleBase, VehicleId,Vehicleuptader

def createvehicle(vehicle: VehicleBase, session: Session):
    newvehicle = VehicleId.model_validate(vehicle)
    session.add(newvehicle)
    session.commit()
    session.refresh(newvehicle)
    return newvehicle

def showallvehicle(session: Session):
    return session.exec(select(VehicleId))

def findonevehicle(id : int, session: Session):
    try:
        return session.get_one(VehicleId, id)
    except NoResultFound:
        return None


def uptadevehicle (id:int, newvehicle: Vehicleuptader, session: Session):
    vehicle = findonevehicle(id, session)
    if vehicle is None:
        return None
    motorupt = newvehicle.model_dump(exclude_unset= True)
    vehicle.sqlmodel_update(motorupt)
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle

def killvehicle (id: int, session: Session):
    try :
        vehicle = session.get_one(VehicleId, id)
        session.delete(vehicle)
        session.commit()
        return vehicle
    except NoResultFound:
        return None