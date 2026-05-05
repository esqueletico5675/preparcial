from email.policy import default
from typing import Optional
from sqlmodel import SQLModel, Field

class Motorbase ():
    name: str | None = Field(default= None ,min_length=3,max_length=64)
    cilindraje : int|None = Field( default=None , gt = 0 , le = 2500)

class Motorid (Motorbase, table = True):
    id : int = Field(gdefault=None, primary_key = True, gt = 0)