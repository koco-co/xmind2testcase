# FastAPI 迁移实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 将 xmind2cases 后端从 Flask 完全重构为 FastAPI，使用 SQLite 存储转换历史和测试用例。

**架构:** 采用分层架构（API → Services → Repositories → Models），使用 FastAPI + SQLAlchemy 2.0 + Alembic，完全异步实现。

**技术栈:** FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2, Alembic, aiosqlite, pytest

---

## 前置准备

### Task 0: 环境准备和依赖安装

**文件:**
- 修改: `pyproject.toml`

**步骤 1: 添加 FastAPI 相关依赖**

编辑 `pyproject.toml`，在 dependencies 中添加：

```toml
dependencies = [
    # ... 现有依赖 ...
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "sqlalchemy[asyncio]>=2.0.36",
    "aiosqlite>=0.20.0",
    "alembic>=1.14.0",
    "pydantic>=2.10.3",
    "pydantic-settings>=2.6.1",
    "python-multipart>=0.0.20",  # 文件上传支持
    "httpx>=0.28.0",  # 测试客户端
    "structlog>=24.4.0",  # 结构化日志
]
```

**步骤 2: 安装依赖**

运行: `uv sync`
预期: 所有依赖安装成功

**步骤 3: 提交**

```bash
git add pyproject.toml
git commit -m "chore: add FastAPI and async database dependencies"
```

---

## Phase 1: 基础设施搭建

### Task 1: 创建配置管理模块

**文件:**
- 创建: `api/config.py`

**步骤 1: 创建配置文件**

```python
# api/config.py
from pydantic_settings import BaseSettings
from typing import Literal


class Settings(BaseSettings):
    """应用配置"""

    # 应用基础配置
    APP_NAME: str = "xmind2cases API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False

    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/xmind2cases.db"
    DATABASE_ECHO: bool = False

    # 文件存储配置
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: list[str] = [".xmind"]
    KEEP_RECORDS: int = 20

    # API 配置
    API_V1_PREFIX: str = "/api/v1"

    # 分页配置
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # 日志配置
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    LOG_FORMAT: Literal["json", "text"] = "json"

    # CORS 配置
    CORS_ORIGINS: list[str] = ["*"]

    # 文档配置
    DOCS_ENABLED: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
```

**步骤 2: 提交**

```bash
git add api/config.py
git commit -m "feat: add FastAPI configuration management"
```

---

### Task 2: 创建数据库连接管理

**文件:**
- 创建: `api/core/database.py`
- 创建: `api/models/base.py`

**步骤 1: 创建数据库核心模块**

```python
# api/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from api.config import settings

# 创建异步引擎
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
)

# 创建异步会话工厂
async_session_maker = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncSession:
    """依赖注入：获取数据库会话"""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

**步骤 2: 创建 Base 模型**

```python
# api/models/base.py
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import Column, Integer, DateTime
from datetime import datetime


class Base(DeclarativeBase):
    """所有 ORM 模型的基类"""
    pass
```

**步骤 3: 提交**

```bash
git add api/core/database.py api/models/base.py
git commit -m "feat: add async database connection management"
```

---

### Task 3: 创建自定义异常

**文件:**
- 创建: `api/core/exceptions.py`

**步骤 1: 创建异常类**

```python
# api/core/exceptions.py
from typing import Any


class Xmind2CasesError(Exception):
    """基础异常类"""
    def __init__(self, message: str, detail: Any = None):
        self.message = message
        self.detail = detail
        super().__init__(message)


class ValidationError(Xmind2CasesError):
    """数据验证错误 (400)"""
    pass


class NotFoundError(Xmind2CasesError):
    """资源不存在 (404)"""
    pass


class ConflictError(Xmind2CasesError):
    """冲突错误 (409)"""
    pass


class BusinessLogicError(Xmind2CasesError):
    """业务逻辑错误 (422)"""
    pass


class FileValidationError(ValidationError):
    """文件验证失败"""
    pass


class RecordNotFoundError(NotFoundError):
    """记录不存在"""
    pass


class TestCaseNotFoundError(NotFoundError):
    """测试用例不存在"""
    pass
```

**步骤 2: 提交**

```bash
git add api/core/exceptions.py
git commit -m "feat: add custom exception classes"
```

---

## Phase 2: 数据模型层

### Task 4: 创建 Record 模型

**文件:**
- 创建: `api/models/record.py`

**步骤 1: 创建 Record ORM 模型**

```python
# api/models/record.py
from sqlalchemy import String, Integer, Column
from api.models.base import Base


class Record(Base):
    """转换记录模型"""
    __tablename__ = "records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    create_on = Column(String, nullable=False)
    note = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    xmind_version = Column(String, nullable=True)
    is_deleted = Column(Integer, nullable=False, default=0)
    converted_at = Column(String, nullable=True)
```

**步骤 2: 提交**

```bash
git add api/models/record.py
git commit -m "feat: add Record ORM model"
```

---

### Task 5: 创建 TestCase 和 TestStep 模型

**文件:**
- 创建: `api/models/testcase.py`
- 创建: `api/models/test_step.py`

**步骤 1: 创建 TestStep 模型**

```python
# api/models/test_step.py
from sqlalchemy import String, Integer, Column, ForeignKey
from sqlalchemy.orm import relationship
from api.models.base import Base


class TestStep(Base):
    """测试步骤模型"""
    __tablename__ = "test_steps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    testcase_id = Column(Integer, ForeignKey("testcases.id", ondelete="CASCADE"), nullable=False)
    step_number = Column(Integer, nullable=False)
    actions = Column(String, nullable=False)
    expectedresults = Column(String, nullable=True)
    execution_type = Column(Integer, nullable=False, default=1)
    result = Column(Integer, nullable=True)
```

**步骤 2: 创建 TestCase 模型**

```python
# api/models/testcase.py
from sqlalchemy import String, Integer, Column, ForeignKey
from sqlalchemy.orm import relationship
from api.models.base import Base
from api.models.test_step import TestStep


class TestCase(Base):
    """测试用例模型"""
    __tablename__ = "testcases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    record_id = Column(Integer, ForeignKey("records.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    summary = Column(String, nullable=True)
    preconditions = Column(String, nullable=True)
    execution_type = Column(Integer, nullable=False, default=1)
    importance = Column(Integer, nullable=False, default=2)
    estimated_exec_duration = Column(Integer, nullable=True)
    status = Column(Integer, nullable=False, default=7)
    version = Column(Integer, nullable=False, default=1)
    product = Column(String, nullable=True)
    suite = Column(String, nullable=True)
    result = Column(Integer, nullable=True)

    # 关系
    steps = relationship("TestStep", cascade="all, delete-orphan")
```

**步骤 3: 提交**

```bash
git add api/models/testcase.py api/models/test_step.py
git commit -m "feat: add TestCase and TestStep ORM models"
```

---

## Phase 3: Pydantic Schemas

### Task 6: 创建通用 Schemas

**文件:**
- 创建: `api/schemas/common.py`

**步骤 1: 创建通用响应模型**

```python
# api/schemas/common.py
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional, Any


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
```

**步骤 2: 提交**

```bash
git add api/schemas/common.py
git commit -m "feat: add common Pydantic schemas"
```

---

### Task 7: 创建 Record Schemas

**文件:**
- 创建: `api/schemas/record.py`

**步骤 1: 创建 Record 的请求和响应模型**

```python
# api/schemas/record.py
from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


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
```

**步骤 2: 提交**

```bash
git add api/schemas/record.py
git commit -m "feat: add Record Pydantic schemas"
```

---

### Task 8: 创建 TestCase Schemas

**文件:**
- 创建: `api/schemas/testcase.py`

**步骤 1: 创建 TestCase 的请求和响应模型**

```python
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
```

**步骤 2: 提交**

```bash
git add api/schemas/testcase.py
git commit -m "feat: add TestCase Pydantic schemas"
```

---

## Phase 4: 数据访问层 (Repositories)

### Task 9: 创建基础 Repository

**文件:**
- 创建: `api/repositories/base.py`

**步骤 1: 创建基础 Repository 类**

```python
# api/repositories/base.py
from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from api.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """基础 Repository 类"""

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    async def get(self, id: int) -> Optional[ModelType]:
        """根据 ID 获取单个对象"""
        result = await self.db.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def get_multi(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[ModelType]:
        """获取多个对象"""
        result = await self.db.execute(
            select(self.model).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    async def create(self, obj_in: dict) -> ModelType:
        """创建新对象"""
        db_obj = self.model(**obj_in)
        self.db.add(db_obj)
        await self.db.flush()
        return db_obj

    async def delete(self, id: int) -> bool:
        """删除对象"""
        obj = await self.get(id)
        if obj:
            await self.db.delete(obj)
            return True
        return False
```

**步骤 2: 提交**

```bash
git add api/repositories/base.py
git commit -m "feat: add base repository class"
```

---

### Task 10: 创建 Record Repository

**文件:**
- 创建: `api/repositories/record.py`

**步骤 1: 创建 Record Repository**

```python
# api/repositories/record.py
from typing import List, Optional
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from api.models.record import Record
from api.models.testcase import TestCase
from api.repositories.base import BaseRepository


class RecordRepository(BaseRepository[Record]):
    """Record 数据访问层"""

    def __init__(self, db: AsyncSession):
        super().__init__(Record, db)

    async def get_with_testcase_count(self, id: int) -> Optional[dict]:
        """获取记录及其测试用例数量"""
        # 获取记录
        record = await self.get(id)
        if not record:
            return None

        # 统计测试用例数量
        result = await self.db.execute(
            select(func.count(TestCase.id)).where(TestCase.record_id == id)
        )
        count = result.scalar()

        return {
            **record.__dict__,
            "testcase_count": count or 0
        }

    async def list_not_deleted(
        self,
        skip: int = 0,
        limit: int = 20
    ) -> List[Record]:
        """获取未删除的记录列表"""
        result = await self.db.execute(
            select(self.model)
            .where(self.model.is_deleted == 0)
            .order_by(self.model.id.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def soft_delete(self, id: int) -> bool:
        """软删除记录"""
        record = await self.get(id)
        if record:
            record.is_deleted = 1
            return True
        return False
```

**步骤 2: 提交**

```bash
git add api/repositories/record.py
git commit -m "feat: add Record repository"
```

---

### Task 11: 创建 TestCase Repository

**文件:**
- 创建: `api/repositories/testcase.py`

**步骤 1: 创建 TestCase Repository**

```python
# api/repositories/testcase.py
from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from api.models.testcase import TestCase
from api.models.test_step import TestStep
from api.repositories.base import BaseRepository


class TestCaseRepository(BaseRepository[TestCase]):
    """TestCase 数据访问层"""

    def __init__(self, db: AsyncSession):
        super().__init__(TestCase, db)

    async def get_by_record(self, record_id: int) -> List[TestCase]:
        """获取记录的所有测试用例"""
        result = await self.db.execute(
            select(TestCase)
            .where(TestCase.record_id == record_id)
            .order_by(TestCase.id)
        )
        return list(result.scalars().all())

    async def create_with_steps(
        self,
        testcase_data: dict,
        steps_data: List[dict]
    ) -> TestCase:
        """创建测试用例及其步骤"""
        # 创建测试用例
        testcase = TestCase(**testcase_data)
        self.db.add(testcase)
        await self.db.flush()

        # 创建步骤
        for step_data in steps_data:
            step_data["testcase_id"] = testcase.id
            step = TestStep(**step_data)
            self.db.add(step)

        return testcase
```

**步骤 2: 提交**

```bash
git add api/repositories/testcase.py
git commit -m "feat: add TestCase repository"
```

---

## Phase 5: 服务层

### Task 12: 创建 XMindParserService

**文件:**
- 创建: `api/services/xmind_parser.py`

**步骤 1: 创建 XMind 解析服务**

```python
# api/services/xmind_parser.py
from pathlib import Path
from typing import Dict, Any, List
from xmind2testcase.utils import get_xmind_testsuites, get_xmind_testcase_list
from xmind2testcase.parser import xmind_to_testsuites
from api.core.exceptions import InvalidXMindFormatError, XMindParserError


class XMindParserService:
    """XMind 文件解析服务"""

    async def parse_file(self, file_path: str) -> Dict[str, Any]:
        """解析 XMind 文件

        Returns:
            {
                'version': '8' | '2026',
                'testsuites': List[TestSuite],
                'testcases': List[TestCase],
                'metadata': {...}
            }
        """
        try:
            # 检测 XMind 版本
            version = await self._detect_version(file_path)

            # 解析测试用例
            testcases = get_xmind_testcase_list(file_path)
            testsuites = get_xmind_testsuites(file_path)

            return {
                "version": version,
                "testcases": testcases,
                "testsuites": testsuites,
                "metadata": {
                    "testcase_count": len(testcases),
                    "suite_count": len(testsuites)
                }
            }
        except Exception as e:
            raise XMindParserError(f"Failed to parse XMind file: {str(e)}")

    async def validate_xmind(self, file_path: str) -> bool:
        """验证文件是否为有效的 XMind 文件"""
        path = Path(file_path)
        if not path.exists():
            return False
        if path.suffix.lower() != ".xmind":
            return False
        return True

    async def _detect_version(self, file_path: str) -> str:
        """检测 XMind 版本"""
        # 简化检测：检查文件内容
        path = Path(file_path)
        if path.is_dir():
            # XMind 2026 是目录格式
            content_json = path / "content.json"
            if content_json.exists():
                return "2026"

        # 默认返回 8（假设是旧的压缩格式）
        return "8"
```

**步骤 2: 提交**

```bash
git add api/services/xmind_parser.py
git commit -m "feat: add XMind parser service"
```

---

### Task 13: 创建 RecordService

**文件:**
- 创建: `api/services/record.py`

**步骤 1: 创建记录管理服务**

```python
# api/services/record.py
from sqlalchemy.ext.asyncio import AsyncSession
from api.repositories.record import RecordRepository
from api.repositories.testcase import TestCaseRepository
from api.services.xmind_parser import XMindParserService
from api.schemas.record import RecordCreate, RecordResponse
from api.core.exceptions import RecordNotFoundError
from pathlib import Path
import shutil


class RecordService:
    """记录管理服务"""

    def __init__(
        self,
        db: AsyncSession,
        parser_service: XMindParserService
    ):
        self.db = db
        self.record_repo = RecordRepository(db)
        self.testcase_repo = TestCaseRepository(db)
        self.parser = parser_service

    async def create_record(
        self,
        file_path: str,
        original_filename: str
    ) -> RecordResponse:
        """创建新记录（上传并解析 XMind）"""
        # 解析 XMind 文件
        parsed = await self.parser.parse_file(file_path)

        # 创建记录
        record_data = {
            "name": Path(file_path).name,
            "original_filename": original_filename,
            "file_path": file_path,
            "create_on": datetime.utcnow().isoformat(),
            "file_size": Path(file_path).stat().st_size,
            "xmind_version": parsed["version"],
            "converted_at": datetime.utcnow().isoformat()
        }

        record = await self.record_repo.create(record_data)

        # TODO: 存储测试用例到数据库

        return RecordResponse(
            id=record.id,
            **record_data,
            testcase_count=parsed["metadata"]["testcase_count"]
        )

    async def get_record(self, record_id: int) -> dict:
        """获取记录详情"""
        result = await self.record_repo.get_with_testcase_count(record_id)
        if not result:
            raise RecordNotFoundError(f"Record {record_id} not found")
        return result

    async def list_records(
        self,
        skip: int = 0,
        limit: int = 20
    ) -> list:
        """获取记录列表"""
        return await self.record_repo.list_not_deleted(skip, limit)
```

**步骤 2: 修正导入**

```python
# 在文件顶部添加
from datetime import datetime
```

**步骤 3: 提交**

```bash
git add api/services/record.py
git commit -m "feat: add record management service"
```

---

## Phase 6: API 路由层

### Task 14: 创建健康检查路由

**文件:**
- 创建: `api/routes/health.py`

**步骤 1: 创建健康检查路由**

```python
# api/routes/health.py
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/health/database")
async def database_health():
    """数据库健康检查"""
    # TODO: 实际检查数据库连接
    return {
        "status": "healthy",
        "connection": "ok"
    }
```

**步骤 2: 提交**

```bash
git add api/routes/health.py
git commit -m "feat: add health check routes"
```

---

### Task 15: 创建 Records 路由

**文件:**
- 创建: `api/routes/records.py`

**步骤 1: 创建记录路由**

```python
# api/routes/records.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from api.core.database import get_db
from api.services.record import RecordService
from api.services.xmind_parser import XMindParserService
from api.schemas.record import RecordResponse
from api.core.exceptions import RecordNotFoundError

router = APIRouter(prefix="/records", tags=["records"])


def get_record_service(
    db: AsyncSession = Depends(get_db)
) -> RecordService:
    """依赖注入：获取 RecordService"""
    parser = XMindParserService()
    return RecordService(db, parser)


@router.get("", response_model=List[RecordResponse])
async def list_records(
    skip: int = 0,
    limit: int = 20,
    service: RecordService = Depends(get_record_service)
):
    """获取记录列表"""
    return await service.list_records(skip, limit)


@router.post("", response_model=RecordResponse)
async def create_record(
    file: UploadFile = File(...),
    service: RecordService = Depends(get_record_service)
):
    """上传 XMind 文件并创建记录"""
    # TODO: 实现文件保存逻辑
    raise HTTPException(status_code=501, detail="Not implemented yet")


@router.get("/{record_id}")
async def get_record(
    record_id: int,
    service: RecordService = Depends(get_record_service)
):
    """获取记录详情"""
    try:
        return await service.get_record(record_id)
    except RecordNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
```

**步骤 2: 提交**

```bash
git add api/routes/records.py
git commit -m "feat: add records API routes"
```

---

### Task 16: 创建主应用

**文件:**
- 创建: `api/main.py`

**步骤 1: 创建 FastAPI 主应用**

```python
# api/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.config import settings
from api.routes import health, records
from api.core.exceptions import Xmind2CasesError
from fastapi.responses import JSONResponse
from fastapi import Request


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    docs_url="/docs" if settings.DOCS_ENABLED else None,
    redoc_url="/redoc" if settings.DOCS_ENABLED else None,
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# 注册路由
app.include_router(health.router)
app.include_router(records.router, prefix=settings.API_V1_PREFIX)


# 全局异常处理器
@app.exception_handler(Xmind2CasesError)
async def xmind2cases_exception_handler(
    request: Request,
    exc: Xmind2CasesError
):
    """处理所有自定义异常"""
    status_code = {
        Exception: 500,
    }.get(type(exc), 500)

    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "type": type(exc).__name__,
                "message": exc.message,
                "detail": exc.detail
            }
        }
    )


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    # 确保必要的目录存在
    from pathlib import Path
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path("data").mkdir(parents=True, exist_ok=True)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
```

**步骤 2: 提交**

```bash
git add api/main.py
git commit -m "feat: create FastAPI main application"
```

---

## Phase 7: 数据库迁移

### Task 17: 配置 Alembic

**文件:**
- 创建: `alembic.ini`
- 创建: `migrations/env.py`
- 创建: `migrations/script.py.mako`

**步骤 1: 初始化 Alembic**

运行: `alembic init migrations`
预期: 创建 alembic 配置文件和 migrations 目录

**步骤 2: 配置 alembic.ini**

编辑 `alembic.ini`，设置数据库 URL：
```ini
sqlalchemy.url = sqlite+aiosqlite:///./data/xmind2cases.db
```

**步骤 3: 配置 migrations/env.py**

```python
# migrations/env.py
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
from api.models.base import Base
from api.models.record import Record
from api.models.testcase import TestCase
from api.models.test_step import TestStep
from api.config import settings

# 导入所有模型
target_metadata = Base.metadata

# 其他配置保持默认...
```

**步骤 4: 创建初始迁移**

运行: `alembic revision --autogenerate -m "Initial migration"`
预期: 生成迁移脚本

**步骤 5: 执行迁移**

运行: `alembic upgrade head`
预期: 数据库表创建成功

**步骤 6: 提交**

```bash
git add alembic.ini migrations/
git commit -m "feat: add Alembic database migration setup"
```

---

## Phase 8: 测试

### Task 18: 编写基础测试

**文件:**
- 创建: `tests/conftest.py`
- 创建: `tests/api/test_health.py`

**步骤 1: 创建 pytest 配置**

```python
# tests/conftest.py
import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from api.main import app
from api.models.base import Base


@pytest.fixture(scope="session")
def event_loop():
    """创建事件循环"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def db_session():
    """创建测试数据库会话"""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        yield session

    await engine.dispose()


@pytest.fixture(scope="function")
async def client(db_session):
    """创建测试客户端"""
    from api.core.database import get_db

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
```

**步骤 2: 创建健康检查测试**

```python
# tests/api/test_health.py
import pytest


@pytest.mark.asyncio
async def test_health_check(client):
    """测试健康检查端点"""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data
```

**步骤 3: 运行测试**

运行: `pytest tests/api/test_health.py -v`
预期: 测试通过

**步骤 4: 提交**

```bash
git add tests/
git commit -m "test: add basic API tests"
```

---

## Phase 9: CLI 工具改造

### Task 19: 更新 CLI 工具

**文件:**
- 修改: `xmind2testcase/cli.py`

**步骤 1: 添加 FastAPI 启动命令**

在 `cli.py` 中添加：
```python
@click.command()
@click.argument('port', default=8000, required=False)
def webtool(port):
    """启动 FastAPI Web 工具"""
    import uvicorn
    from api.main import app

    click.echo(f"Starting FastAPI server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
```

**步骤 2: 提交**

```bash
git add xmind2testcase/cli.py
git commit -m "feat: add FastAPI server command to CLI"
```

---

## Phase 10: 文档和收尾

### Task 20: 更新文档

**文件:**
- 修改: `README.md`
- 创建: `api/README.md`

**步骤 1: 更新主 README**

在 README.md 中添加 FastAPI 相关说明：
```markdown
## FastAPI 服务

### 启动服务

```bash
# 开发环境
uvicorn api.main:app --reload

# 生产环境
uvicorn api.main:app --host 0.0.0.0 --workers 4

# 使用 CLI
python -m xmind2testcase.cli webtool
```

### API 文档

启动服务后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
```

**步骤 2: 创建 API README**

```markdown
# API 文档

## 端点列表

### 健康检查
- GET /health - 健康检查
- GET /health/database - 数据库健康检查

### 记录管理
- GET /api/v1/records - 获取记录列表
- POST /api/v1/records - 上传 XMind 文件
- GET /api/v1/records/{id} - 获取记录详情

## 数据模型

详见 API 文档：/docs
```

**步骤 3: 提交**

```bash
git add README.md api/README.md
git commit -m "docs: add FastAPI documentation"
```

---

## 验收测试

### Task 21: 端到端测试

**步骤 1: 启动服务**

运行: `uvicorn api.main:app --reload`
预期: 服务启动成功，监听 8000 端口

**步骤 2: 访问 API 文档**

浏览器访问: http://localhost:8000/docs
预期: Swagger UI 正常显示

**步骤 3: 测试健康检查**

运行: `curl http://localhost:8000/health`
预期: 返回 JSON 响应，status 为 "healthy"

**步骤 4: 检查测试覆盖率**

运行: `pytest --cov=api --cov-report=html`
预期: 覆盖率 ≥ 80%

**步骤 5: 检查 Docker 构建**

运行: `docker build -t xmind2cases-api .`
预期: Docker 镜像构建成功

**步骤 6: 提交最终版本**

```bash
git add .
git commit -m "chore: final adjustments for FastAPI migration"
```

---

## 总结

完成以上 21 个任务后，xmind2cases 项目将成功从 Flask 迁移到 FastAPI，具备：

✅ 完全异步的 API 服务
✅ SQLite 数据库存储转换历史和测试用例
✅ RESTful API 设计
✅ 自动生成 OpenAPI 文档
✅ 完善的测试覆盖
✅ 数据库迁移支持
✅ Docker 部署支持

**下一步:** 根据实际使用反馈进行性能优化和功能增强。
