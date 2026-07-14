from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select
from models.owner import Owner, Ownerid, uptadeownerchm


def createowner(owner: Owner, empresaid: int, session: Session):
    newoner = Ownerid.model_validate(owner, update={"empresaid": empresaid})
    session.add(newoner)
    session.commit()
    session.refresh(newoner)
    return newoner


def findowner(id: int, empresaid: int, session: Session):
    try:
        owner = session.get_one(Ownerid, id)
        if owner.empresaid != empresaid:
            return None
        return owner
    except NoResultFound:
        return None


def Uptadeowner(id: int, empresaid: int, new_owner: uptadeownerchm, session: Session):
    owner = findowner(id, empresaid, session)
    if owner is None:
        return None
    onwerupt = new_owner.model_dump(exclude_unset=True)
    owner.sqlmodel_update(onwerupt)
    session.add(owner)
    session.commit()
    session.refresh(owner)
    return owner


def killOwner(id: int, empresaid: int, session: Session):
    owner = findowner(id, empresaid, session)
    if owner is None:
        return None
    owner.active = False
    session.add(owner)
    session.commit()
    return owner


def showallowners(empresaid: int, session: Session):
    return session.exec(
        select(Ownerid).where(Ownerid.empresaid == empresaid)
    ).all()


def inactive_owners(empresaid: int, session: Session):
    return session.exec(
        select(Ownerid).where(Ownerid.empresaid == empresaid, Ownerid.active == False)
    ).all()


def active_owners(empresaid: int, session: Session):
    return session.exec(
        select(Ownerid).where(Ownerid.empresaid == empresaid, Ownerid.active == True)
    ).all()