# api/schemas/testcase.py
from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class TestStepBase(BaseModel):
    """TestStep 基础模型"""

    step_number: int
    actions: str
    expectedresults: Optional[str] = None
    execution_type: int = 1


class TestStepCreate(TestStepBase):
    """创建 TestStep 的请求"""

    pass


class TestStepResponse(TestStepBase):
    """TestStep 响应"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    result: Optional[int] = None


class TestCaseBase(BaseModel):
    """TestCase 基础模型"""

    name: str
    summary: Optional[str] = None
    preconditions: Optional[str] = None
    execution_type: int = 1
    importance: int = 2
    estimated_exec_duration: Optional[int] = None
    status: int = 7
    version: int = 1
    product: Optional[str] = None
    suite: Optional[str] = None


class TestCaseCreate(TestCaseBase):
    """创建 TestCase 的请求"""

    record_id: int
    steps: List[TestStepCreate] = []


class TestCaseResponse(TestCaseBase):
    """TestCase 响应"""

    model_config = ConfigDict(from_attributes=True)

    id: int
    record_id: int
    result: Optional[int] = None
    steps: List[TestStepResponse] = []
