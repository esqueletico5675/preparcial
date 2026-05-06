from sqlmodel import SQLModel, Field

class Motorbase(SQLModel):
    name: str | None = Field(default=None, min_length=3, max_length=64)
    cilindraje: int | None = Field(default=None, gt=0, le=2500)
    color: str | None = Field(default=None, min_length=3, max_length=64)
    model: int | None = Field(default=None, gt=1900, le=2100)
    ownerid: int | None = Field(default=None, foreign_key="ownerid.id")


class Motorid(Motorbase, table=True):
    id: int | None = Field(default=None, primary_key=True)