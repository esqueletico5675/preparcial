from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select
from models.models import VehicleBase, VehicleId, Vehicleuptader


def createvehicle(vehicle: VehicleBase, empresaid: int, session: Session):
    newvehicle = VehicleId.model_validate(vehicle, update={"empresaid": empresaid})
    session.add(newvehicle)
    session.commit()
    session.refresh(newvehicle)
    return newvehicle


def showallvehicle(empresaid: int, session: Session):
    return session.exec(
        select(VehicleId).where(
            VehicleId.empresaid == empresaid,
            VehicleId.active == True,
        )
    ).all()


def findonevehicle(id: int, empresaid: int, session: Session):
    try:
        vehicle = session.get_one(VehicleId, id)
        if vehicle.empresaid != empresaid:
            return None
        return vehicle
    except NoResultFound:
        return None


def uptadevehicle(id: int, empresaid: int, newvehicle: Vehicleuptader, session: Session):
    vehicle = findonevehicle(id, empresaid, session)
    if vehicle is None:
        return None
    motorupt = newvehicle.model_dump(exclude_unset=True)
    vehicle.sqlmodel_update(motorupt)
    session.add(vehicle)
    session.commit()
    session.refresh(vehicle)
    return vehicle


def killvehicle(id: int, empresaid: int, session: Session):
    vehicle = findonevehicle(id, empresaid, session)
    if vehicle is None:
        return None
    vehicle.active = False
    session.add(vehicle)
    session.commit()
    return vehicle