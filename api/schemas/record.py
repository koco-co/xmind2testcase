# api/schemas/record.py
from pydantic import BaseModel, ConfigDict
from typing import Optional


class RecordBase(BaseModel):
    """Record 基础模型"""

    name: str
    original_filename: str
    note: Optional[str] = None


class RecordCreate(RecordBase):
    """创建 Record 的请求"""

    file_path: str
    file_size: Optional[int] = None
    xmind_version: Optional[str] = None


class RecordResponse(RecordBase):
    """Record 响应"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    file_path: str
    file_size: Optional[int] = None
    xmind_version: Optional[str] = None
    create_on: str
    converted_at: Optional[str] = None
    testcase_count: int = 0
