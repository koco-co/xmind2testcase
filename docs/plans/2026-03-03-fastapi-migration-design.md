# FastAPI 迁移设计文档

**创建日期**: 2026-03-03
**状态**: 设计阶段
**作者**: Poco

---

## 1. 概述

### 1.1 项目目标

将 xmind2cases 项目的后端从 Flask 完全重构为 FastAPI，使用 SQLite 存储转换历史和测试用例数据。

### 1.2 核心需求

- ✅ 全栈重构 FastAPI（包括 CLI 工具改为调用 FastAPI）
- ✅ SQLite 数据库存储转换历史 + 测试用例
- ✅ 完全重写（不保留 Flask 代码）
- ✅ 无需认证（公开访问）
- ✅ 保持现有核心库（xmind2testcase）不变

### 1.3 技术选型

| 技术 | 版本 | 用途 |
|------|------|------|
| FastAPI | 最新 | 异步 Web 框架 |
| Uvicorn | 最新 | ASGI 服务器 |
| SQLAlchemy | 2.0+ | 异步 ORM |
| Pydantic | v2 | 数据验证 |
| Alembic | 最新 | 数据库迁移 |
| aiosqlite | 最新 | SQLite 异步驱动 |
| pytest | 最新 | 测试框架 |

---

## 2. 架构设计

### 2.1 系统分层

```
┌─────────────────────────────────────────────────────┐
│                    API 层 (routes)                  │
│  /upload, /convert, /testcases, /records, /health  │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                  服务层 (services)                  │
│  XMindParserService, ConversionService,             │
│  RecordService, TestCaseService                     │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              数据访问层 (repositories)              │
│  RecordRepository, TestCaseRepository               │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│              SQLAlchemy 2.0 ORM (models)            │
│  Record, TestCase, TestStep                         │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                  SQLite 数据库                      │
└─────────────────────────────────────────────────────┘
```

### 2.2 项目目录结构

```
xmind2cases/
├── api/                          # FastAPI 应用
│   ├── __init__.py
│   ├── main.py                   # FastAPI 应用入口
│   ├── config.py                 # 配置管理
│   ├── dependencies.py           # 依赖注入
│   │
│   ├── models/                   # SQLAlchemy ORM 模型
│   │   ├── __init__.py
│   │   ├── base.py               # Base 类和数据库会话
│   │   ├── record.py             # Record 模型
│   │   ├── testcase.py           # TestCase 模型
│   │   └── test_step.py          # TestStep 模型
│   │
│   ├── schemas/                  # Pydantic 数据验证模型
│   │   ├── __init__.py
│   │   ├── record.py             # Record 的请求/响应模型
│   │   ├── testcase.py           # TestCase 的请求/响应模型
│   │   └── common.py             # 通用模型(分页、错误响应等)
│   │
│   ├── repositories/             # 数据访问层
│   │   ├── __init__.py
│   │   ├── base.py               # 基础 Repository
│   │   ├── record.py             # Record Repository
│   │   └── testcase.py           # TestCase Repository
│   │
│   ├── services/                 # 业务逻辑层
│   │   ├── __init__.py
│   │   ├── xmind_parser.py       # XMind 解析服务
│   │   ├── conversion.py         # 转换服务
│   │   ├── record.py             # 记录管理服务
│   │   └── testcase.py           # 测试用例服务
│   │
│   ├── routes/                   # API 路由
│   │   ├── __init__.py
│   │   ├── records.py            # 记录相关路由
│   │   ├── testcases.py          # 测试用例相关路由
│   │   ├── conversion.py         # 转换相关路由
│   │   └── health.py             # 健康检查
│   │
│   ├── core/                     # 核心功能
│   │   ├── __init__.py
│   │   ├── database.py           # 数据库连接和会话管理
│   │   ├── security.py           # 安全相关
│   │   └── exceptions.py         # 自定义异常
│   │
│   └── static/                   # 静态文件
│       └── ...
│
├── migrations/                   # Alembic 数据库迁移
│   └── versions/
│
├── tests/                        # 测试
│   ├── api/                      # API 测试
│   ├── services/                 # 服务层测试
│   └── conftest.py               # pytest fixtures
│
├── xmind2testcase/               # 现有核心库(保持不变)
│   ├── parser.py
│   ├── utils.py
│   ├── metadata.py
│   └── ...
│
├── pyproject.toml
└── README.md
```

---

## 3. 数据库设计

### 3.1 核心数据表

#### records 表 - 转换历史记录

```sql
CREATE TABLE records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                    -- XMind 文件名
    original_filename TEXT NOT NULL,       -- 原始上传文件名
    file_path TEXT NOT NULL,               -- 存储路径
    create_on TEXT NOT NULL,               -- ISO 8601 格式时间戳
    note TEXT,                             -- 备注
    file_size INTEGER,                     -- 文件大小(字节)
    xmind_version TEXT,                    -- XMind 版本 (8/2026)
    is_deleted INTEGER DEFAULT 0,          -- 软删除标记
    converted_at TEXT                      -- 转换完成时间
);

CREATE INDEX idx_records_create_on ON records(create_on);
CREATE INDEX idx_records_is_deleted ON records(is_deleted);
```

#### testcases 表 - 测试用例

```sql
CREATE TABLE testcases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,            -- 关联的转换记录
    name TEXT NOT NULL,                    -- 用例名称
    summary TEXT,                          -- 摘要
    preconditions TEXT,                    -- 前置条件
    execution_type INTEGER DEFAULT 1,      -- 执行类型 (1:手动, 2:自动)
    importance INTEGER DEFAULT 2,          -- 优先级 (1:高, 2:中, 3:低)
    estimated_exec_duration INTEGER,       -- 预计执行时间(分钟)
    status INTEGER DEFAULT 7,              -- 状态
    version INTEGER DEFAULT 1,             -- 版本号
    product TEXT,                          -- 产品名称
    suite TEXT,                            -- 测试集名称
    result INTEGER,                        -- 执行结果 (1:pass, 2:failed, 3:blocked, 4:skipped)

    FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
);

CREATE INDEX idx_testcases_record_id ON testcases(record_id);
CREATE INDEX idx_testcases_importance ON testcases(importance);
CREATE INDEX idx_testcases_result ON testcases(result);
```

#### test_steps 表 - 测试步骤

```sql
CREATE TABLE test_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    testcase_id INTEGER NOT NULL,          -- 关联的测试用例
    step_number INTEGER NOT NULL,          -- 步骤序号
    actions TEXT NOT NULL,                 -- 测试动作
    expectedresults TEXT,                  -- 预期结果
    execution_type INTEGER DEFAULT 1,      -- 执行类型
    result INTEGER,                        -- 执行结果

    FOREIGN KEY (testcase_id) REFERENCES testcases(id) ON DELETE CASCADE
);

CREATE INDEX idx_test_steps_testcase_id ON test_steps(testcase_id);
CREATE INDEX idx_test_steps_step_number ON test_steps(step_number);
```

### 3.2 设计决策

1. **外键级联删除** - 删除 record 时自动清理关联的 testcases 和 test_steps
2. **索引优化** - 为常用查询字段(时间、关联ID、优先级)建立索引
3. **软删除** - records 表使用 is_deleted 实现软删除，便于数据恢复
4. **文件元数据** - 存储 file_size 和 xmind_version 便于统计和兼容性处理
5. **时间戳格式** - 使用 ISO 8601 字符串(兼容原有代码)

---

## 4. API 设计

### 4.1 RESTful 端点

#### Records API

```python
GET    /api/v1/records                    # 记录列表
POST   /api/v1/records                    # 创建记录（上传）
GET    /api/v1/records/{id}               # 获取详情
DELETE /api/v1/records/{id}               # 软删除
DELETE /api/v1/records/{id}/hard          # 永久删除
DELETE /api/v1/records/cleanup            # 批量清理
```

#### TestCases API

```python
GET    /api/v1/records/{id}/testcases     # 获取记录的所有测试用例
GET    /api/v1/testcases/{id}             # 获取单个测试用例
PUT    /api/v1/testcases/{id}             # 更新测试用例
DELETE /api/v1/testcases/{id}             # 删除测试用例
PATCH  /api/v1/testcases/batch/result     # 批量更新结果
```

#### Conversion API

```python
POST   /api/v1/convert/{id}/testlink      # 转换为 TestLink XML
POST   /api/v1/convert/{id}/zentao        # 转换为 Zentao CSV
POST   /api/v1/convert/{id}/json          # 转换为 JSON
```

#### Health Check

```python
GET    /health                            # 健康检查
GET    /health/database                   # 数据库健康检查
```

### 4.2 响应格式

**成功响应**:
```json
{
  "id": 1,
  "name": "testcase.xmind",
  "original_filename": "testcase.xmind",
  "file_size": 12345,
  "xmind_version": "2026",
  "create_on": "2026-03-03T14:30:22+08:00",
  "testcase_count": 15
}
```

**错误响应**:
```json
{
  "error": {
    "type": "RecordNotFoundError",
    "message": "Record with id 999 not found",
    "detail": {
      "record_id": 999
    }
  }
}
```

---

## 5. 服务层设计

### 5.1 核心服务

#### XMindParserService
- `parse_file()` - 解析 XMind 文件
- `validate_xmind()` - 验证文件格式
- `detect_version()` - 检测 XMind 版本

#### ConversionService
- `convert_to_testlink()` - 转换为 TestLink XML
- `convert_to_zentao()` - 转换为 Zentao CSV
- `convert_to_json()` - 转换为 JSON
- `store_testcases()` - 存储测试用例到数据库

#### RecordService
- `create_record()` - 创建新记录
- `get_record()` - 获取记录详情
- `list_records()` - 获取记录列表
- `delete_record()` - 删除记录
- `cleanup_old_records()` - 清理旧记录

#### TestCaseService
- `get_testcases_by_record()` - 获取记录的测试用例
- `get_testcase()` - 获取单个测试用例
- `update_testcase()` - 更新测试用例
- `batch_update_result()` - 批量更新结果

### 5.2 服务特点

- ✅ 完全异步（所有方法都是 async）
- ✅ 依赖注入（通过 FastAPI 的 Depends）
- ✅ 错误处理（抛出自定义异常）
- ✅ 类型安全（使用 Pydantic 模型）

---

## 6. 错误处理

### 6.1 异常层次结构

```python
Xmind2CasesError (基类)
├── ValidationError (400)
├── NotFoundError (404)
├── ConflictError (409)
├── BusinessLogicError (422)
├── ExternalServiceError (502)
└── DatabaseError (500)
```

### 6.2 全局异常处理器

所有自定义异常由全局处理器捕获，返回统一格式的错误响应。

---

## 7. 配置管理

### 7.1 配置项

```python
class Settings(BaseSettings):
    # 应用配置
    APP_NAME: str = "xmind2cases API"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False

    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # 数据库配置
    DATABASE_URL: str = "sqlite+aiosqlite:///./data/xmind2cases.db"

    # 文件存储配置
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB

    # API 配置
    API_V1_PREFIX: str = "/api/v1"

    # 分页配置
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
```

### 7.2 环境变量

支持通过 `.env` 文件或环境变量配置。

---

## 8. 测试策略

### 8.1 测试覆盖率

- **总体覆盖率**: ≥ 80%
- **核心业务逻辑**: ≥ 90%
- **API 路由**: ≥ 75%
- **数据模型**: ≥ 85%

### 8.2 测试类型

- **单元测试** (60%) - 服务层、Repository 层
- **集成测试** (30%) - API 测试
- **E2E 测试** (10%) - 完整流程测试

### 8.3 测试工具

- pytest - 测试框架
- pytest-asyncio - 异步测试支持
- httpx - 异步 HTTP 客户端
- pytest-cov - 覆盖率报告

---

## 9. 数据库迁移

### 9.1 迁移工具

使用 Alembic 进行数据库版本管理。

### 9.2 迁移命令

```bash
# 创建新迁移
alembic revision --autogenerate -m "description"

# 升级到最新版本
alembic upgrade head

# 降级一个版本
alembic downgrade -1
```

### 9.3 自动迁移

应用启动时自动检测并执行待执行的迁移。

---

## 10. 性能优化

### 10.1 数据库优化

- 批量插入测试用例
- 使用连接池
- 合理的索引设计

### 10.2 异步处理

- 使用 aiosqlite 异步数据库操作
- 使用 aiofiles 异步文件 I/O

### 10.3 缓存

- 可选的 Redis 缓存支持
- API 响应缓存

---

## 11. 部署方案

### 11.1 Docker 部署

提供 Dockerfile 和 docker-compose.yml 配置。

### 11.2 启动命令

```bash
# 开发环境
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

# 生产环境
uvicorn api.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 12. 向后兼容性

### 12.1 CLI 工具

现有的 CLI 工具将改为调用 FastAPI，保持用户使用习惯不变。

### 12.2 核心库

`xmind2testcase` 核心库保持不变，继续提供纯 Python API。

---

## 13. 实施计划

实施计划将在设计文档批准后创建，预计包括以下阶段：

1. **Phase 1**: 基础设施搭建（数据库模型、配置、依赖注入）
2. **Phase 2**: 数据访问层（Repositories）
3. **Phase 3**: 服务层（Services）
4. **Phase 4**: API 路由层（Routes）
5. **Phase 5**: 测试编写
6. **Phase 6**: CLI 工具改造
7. **Phase 7**: 文档更新

---

## 14. 风险与注意事项

### 14.1 风险

- SQLite 并发写入限制（但对于单文件转换场景影响较小）
- 异步编程复杂度增加

### 14.2 注意事项

- 确保所有 I/O 操作都是异步的
- 合理处理数据库会话生命周期
- 注意文件上传大小限制

---

## 15. 验收标准

- [ ] 所有 API 端点正常工作
- [ ] 测试覆盖率达到 80%+
- [ ] 数据库迁移正常执行
- [ ] CLI 工具功能保持不变
- [ ] 性能不低于原 Flask 实现
- [ ] OpenAPI 文档自动生成
- [ ] Docker 部署成功

---

**状态**: 待审核
**下一步**: 创建实施计划
