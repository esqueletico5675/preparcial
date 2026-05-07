from sqlmodel import SQLModel, Field
class Owner( SQLModel):
    name: str  | None= Field(default= None ,min_length=3, max_length=64)
    email: str | None= Field(default= None,min_length=3, max_length=100)
    cellphone: str|None= Field(default= None,min_length=1, max_length=15)
    cc : str |None  = Field(default= None,min_length=1, max_length=20)

class Ownerid( Owner, table = True):
    id : int | None = Field(default= None ,primary_key=True, gt=0)

class uptadeownerchm ( Owner):
    name : str | None = Field(default=None, min_length=3, max_length=64)
    email : str | None = Field(default=None, min_length=3, max_length=100)
    cellphone : str | None = Field(default=None, min_length=1, max_length=15)
    cc : str | None = Field(default=None, min_length=1, max_length=20)

