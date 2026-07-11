from sqlmodel import SQLModel, Field

class VehicleBase(SQLModel):
    ownerid: int | None = Field(default=None, foreign_key="ownerid.id")
    name: str | None = Field(default=None, min_length=3, max_length=64)
    marca: str | None = Field(default=None, min_length=3, max_length=64)
    model: int | None = Field(default=None)
    plate :str | None = Field(default=None, min_length=3, max_length=7)
    kilometers :int | None = Field(default=None, ge=0,le=99999999)





class VehicleId(VehicleBase, table=True):
    id: int | None = Field(default=None, primary_key=True)



class Vehicleuptader(VehicleBase):
    ownerid: int | None = Field(default=None)
    name: str | None = Field(default=None, min_length=3, max_length=64)
    kilometers: int | None = Field(default=None, ge=0,le=99999999)