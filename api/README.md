# xmind2cases API 文档

## 概述

FastAPI 异步 REST API，用于 XMind 到测试用例的转换和管理。

## 技术栈

- **框架**: FastAPI 0.115+
- **服务器**: Uvicorn (ASGI)
- **数据库**: SQLite + SQLAlchemy 2.0 (async)
- **数据验证**: Pydantic v2
- **迁移**: Alembic

## 目录结构

```
api/
├── main.py           # FastAPI 应用入口
├── config.py         # 配置管理
├── core/             # 核心功能
│   ├── database.py   # 数据库连接
│   └── exceptions.py # 自定义异常
├── models/           # ORM 模型
├── schemas/          # Pydantic 模型
├── repositories/     # 数据访问层
├── services/         # 业务逻辑层
└── routes/           # API 路由
```

## 端点列表

### 健康检查

#### GET /health
检查服务健康状态

**响应:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-03T12:00:00Z"
}
```

#### GET /health/database
检查数据库连接

**响应:**
```json
{
  "status": "healthy",
  "connection": "ok"
}
```

### 记录管理

#### GET /api/v1/records
获取记录列表

**查询参数:**
- `skip`: 跳过记录数（默认 0）
- `limit`: 返回记录数（默认 20）

**响应:** RecordResponse[]

#### POST /api/v1/records
上传 XMind 文件并创建记录

**请求体:** multipart/form-data
- `file`: XMind 文件

**响应:** RecordResponse

#### GET /api/v1/records/{id}
获取记录详情

**参数:**
- `id`: 记录 ID

**响应:** RecordDetail

## 开发

### 运行测试

```bash
pytest tests/api/ -v
```

### 代码格式化

```bash
ruff format api/
ruff check api/
```
