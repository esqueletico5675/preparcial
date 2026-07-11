from sqlmodel import SQLModel, Field


class ProductoBase(SQLModel):
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    price: float = Field(gt=0)
    stock: int = Field(default=0, ge=0)
    sku: str | None = Field(default=None, max_length=30)


class ProductoId(ProductoBase, table=True):
    __tablename__ = "producto"

    id: int | None = Field(default=None, primary_key=True)
    active: bool = Field(default=True)


class ProductoUpdate(SQLModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    price: float | None = Field(default=None, gt=0)
    stock: int | None = Field(default=None, ge=0)
    sku: str | None = Field(default=None, max_length=30)