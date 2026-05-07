from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select
from models.owner import Owner,Ownerid,uptadeownerchm

def createowner (owner : Owner, session: Session):
    newoner = Ownerid.model_validate(owner)
    session.add(newoner)
    session.commit()
    session.refresh(newoner)
    return newoner

def findowner (id : int , session: Session):
    try:
        return session.get_one(Ownerid,id)
    except NoResultFound:
        return None

def Uptadeowner (id: int,new_owner:uptadeownerchm,session: Session):
    owner = findowner(id,session)
    print("Owner encontrado:", owner)
    if owner is None:
        return None
    onwerupt = new_owner.model_dump(exclude_unset= True)
    owner.sqlmodel_update(onwerupt)
    session.add(owner)
    session.commit()
    session.refresh(owner)
    return owner

def killOwner (id: int,session: Session):
    try:
        owner = session.get_one(Ownerid,id)
        owner.active = False
        session.add(owner)
        session.commit()
        return owner
    except NoResultFound:
        return None


def showallowners (session: Session):
    owners = session.exec(select(Ownerid)).all()
    return owners

def inactive_owners (session: Session):
    return session.exec(select(Ownerid).where(Ownerid.active ==False)).all()

def active_owners (session: Session):
    return session.exec(select(Ownerid).where(Ownerid.active == True)).all()