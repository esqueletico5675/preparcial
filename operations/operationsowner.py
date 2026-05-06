from sqlalchemy.exc import NoResultFound
from sqlmodel import Session, select
from models.owner import Owner,Ownerid

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
