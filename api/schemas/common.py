# api/schemas/common.py
from pydantic import BaseModel
from typing import Generic, TypeVar, Any


T = TypeVar("T")


class PaginationParams(BaseModel):
    """分页参数"""

    limit: int = 20
    offset: int = 0


class PaginatedResponse(BaseModel, Generic[T]):
    """分页响应"""

    total: int
    limit: int
    offset: int
    items: list[T]


class ErrorResponse(BaseModel):
    """错误响应"""

    error: dict[str, Any]


class MessageResponse(BaseModel):
    """消息响应"""

    message: str
