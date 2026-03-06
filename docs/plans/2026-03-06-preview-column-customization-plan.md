# 预览界面列自定义功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为预览界面添加列自定义功能，支持多套偏好配置、列拖拽排序、新增/删除列，并按偏好导出。

**Architecture:** 纯前端实现（原生 JS + HTML5 Drag & Drop），后端使用 Flask-SQLAlchemy ORM 管理偏好数据，通过 REST API 交互。

**Tech Stack:** Flask 3.0, Flask-SQLAlchemy 3.0, SQLite, 原生 JavaScript, Tailwind CSS

---

## Task 1: 添加 Flask-SQLAlchemy 依赖

**Files:**
- Modify: `pyproject.toml`

**Step 1: 添加依赖到 pyproject.toml**

在 `dependencies` 数组中添加 `flask-sqlalchemy`：

```toml
dependencies = [
    "xmindparser>=0.1.0",
    "flask>=3.0.0",
    "flask-sqlalchemy>=3.0.0",
    "arrow>=1.0.0",
    "click>=8.0.0",
]
```

**Step 2: 同步依赖**

Run: `uv sync`
Expected: 成功安装 flask-sqlalchemy

**Step 3: 提交**

```bash
git add pyproject.toml
git commit -m "chore: 🔧 添加 flask-sqlalchemy 依赖"
```

---

## Task 2: 创建数据库模型

**Files:**
- Create: `webtool/models.py`

**Step 1: 创建 models.py 文件**

```python
"""Flask-SQLAlchemy 数据库模型"""

import json
from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# 默认列配置
DEFAULT_COLUMNS = [
    {"id": "suite", "name": "所属模块", "visible": True, "order": 1, "is_custom": False},
    {"id": "name", "name": "用例标题", "visible": True, "order": 2, "is_custom": False},
    {"id": "preconditions", "name": "前置条件", "visible": True, "order": 3, "is_custom": False},
    {"id": "steps", "name": "步骤", "visible": True, "order": 4, "is_custom": False},
    {"id": "expectedresults", "name": "预期", "visible": True, "order": 5, "is_custom": False},
    {"id": "importance", "name": "优先级", "visible": True, "order": 6, "is_custom": False},
]


class Record(db.Model):
    """上传文件记录"""
    __tablename__ = 'records'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(500), nullable=False)
    create_on = db.Column(db.String(50), nullable=False)
    note = db.Column(db.Text)
    is_deleted = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'create_on': self.create_on,
            'note': self.note,
            'is_deleted': self.is_deleted,
        }


class ColumnPreference(db.Model):
    """列偏好配置"""
    __tablename__ = 'column_preferences'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    columns_json = db.Column(db.Text, nullable=False)
    is_default = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def columns(self):
        """解析 columns_json 为列表"""
        return json.loads(self.columns_json) if self.columns_json else []

    @columns.setter
    def columns(self, value):
        """将列表序列化为 columns_json"""
        self.columns_json = json.dumps(value, ensure_ascii=False)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'columns': self.columns,
            'is_default': self.is_default,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
```

**Step 2: 提交**

```bash
git add webtool/models.py
git commit -m "feat: ✨ 添加 Flask-SQLAlchemy 数据库模型"
```

---

## Task 3: 重构 application.py 使用 Flask-SQLAlchemy

**Files:**
- Modify: `webtool/application.py`

**Step 1: 更新导入和配置**

替换文件顶部的导入和配置部分：

```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Flask web application for XMind to testcase conversion."""

import json
import logging
import os
import re
from contextlib import closing
from os.path import exists, join
from typing import Any, Generator, List, Optional, Tuple

import arrow
from flask import (
    Flask,
    abort,
    g,
    jsonify,
    redirect,
    render_template,
    request,
    send_from_directory,
    url_for,
)
from werkzeug.utils import secure_filename

from xmind2cases.testlink import xmind_to_testlink_xml_file
from xmind2cases.utils import get_xmind_testcase_list, get_xmind_testsuites
from xmind2cases.zentao import xmind_to_zentao_csv_file

from webtool.models import db, Record, ColumnPreference, DEFAULT_COLUMNS

# ... 保持日志配置不变 ...

# Flask app 配置
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DATABASE}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
```

**Step 2: 更新 init() 函数**

```python
def init() -> None:
    """Initialize the application: create directories and database."""
    app.logger.info("Start initializing the database...")
    if not exists(UPLOAD_FOLDER):
        os.mkdir(UPLOAD_FOLDER)

    with app.app_context():
        db.create_all()

        # 插入默认偏好（如果不存在）
        if ColumnPreference.query.count() == 0:
            default_pref = ColumnPreference(
                name="默认",
                columns_json=json.dumps(DEFAULT_COLUMNS, ensure_ascii=False),
                is_default=True
            )
            db.session.add(default_pref)
            db.session.commit()

    app.logger.info(
        "Congratulations! the xmind2cases webtool database "
        "has initialized successfully!"
    )
```

**Step 3: 更新数据库操作函数**

删除 `connect_db()` 函数，更新其他函数使用 SQLAlchemy：

```python
def insert_record(xmind_name: str, note: str = "") -> None:
    """Insert a new record into the database."""
    now = str(arrow.now())
    record = Record(name=xmind_name, create_on=now, note=note)
    db.session.add(record)
    db.session.commit()


def delete_record(filename: str, record_id: int) -> None:
    """Delete a record and its related files."""
    _delete_related_files(filename)
    record = Record.query.get(record_id)
    if record:
        record.is_deleted = 1
        db.session.commit()


def delete_records(keep: int = 20) -> None:
    """Clean up old files on server and mark records as deleted."""
    records = Record.query.filter_by(is_deleted=0).order_by(Record.id.desc()).offset(keep).all()
    for record in records:
        _delete_related_files(record.name)
        record.is_deleted = 1
    db.session.commit()


def get_latest_record() -> Optional[Tuple[str, str, str, str, int]]:
    """Get the latest record from the database."""
    record = Record.query.filter_by(is_deleted=0).order_by(Record.id.desc()).first()
    if record:
        short_name = record.name[:120] + "..." if len(record.name) > 120 else record.name
        create_on = arrow.get(record.create_on).humanize()
        return short_name, record.name, create_on, record.note or "", record.id
    return None


def get_records(limit: int = 8) -> Generator[Tuple[str, str, str, str, int], None, None]:
    """Get records from the database."""
    records = Record.query.filter_by(is_deleted=0).order_by(Record.id.desc()).limit(limit).all()
    for record in records:
        short_name = record.name[:120] + "..." if len(record.name) > 120 else record.name
        create_on = arrow.get(record.create_on).humanize()
        yield short_name, record.name, create_on, record.note or "", record.id
```

**Step 4: 删除 before_request 和 teardown_request**

删除这两个函数，Flask-SQLAlchemy 会自动管理会话：

```python
# 删除以下代码：
# @app.before_request
# def before_request() -> None: ...

# @app.teardown_request
# def teardown_request(exception: Optional[Exception]) -> None: ...
```

**Step 5: 验证应用启动**

Run: `cd /Users/aa/WorkSpace/Projects/xmind2cases && uv run python -c "from webtool.application import app, init; init(); print('OK')"`
Expected: 输出 "OK"

**Step 6: 提交**

```bash
git add webtool/application.py
git commit -m "refactor: ♻️ 重构 application.py 使用 Flask-SQLAlchemy"
```

---

## Task 4: 添加偏好管理 API

**Files:**
- Modify: `webtool/application.py`

**Step 1: 添加 API 路由**

在 `application.py` 中添加以下 API 路由（在现有路由之后）：

```python
# ==================== 偏好管理 API ====================

@app.route('/api/preferences', methods=['GET'])
def get_preferences():
    """获取所有偏好列表"""
    preferences = ColumnPreference.query.order_by(ColumnPreference.id).all()
    return jsonify({
        "success": True,
        "data": [p.to_dict() for p in preferences]
    })


@app.route('/api/preferences/<int:pref_id>', methods=['GET'])
def get_preference(pref_id):
    """获取单个偏好详情"""
    pref = ColumnPreference.query.get(pref_id)
    if not pref:
        return jsonify({"success": False, "message": "偏好不存在"}), 404
    return jsonify({
        "success": True,
        "data": pref.to_dict()
    })


@app.route('/api/preferences', methods=['POST'])
def create_preference():
    """新建偏好"""
    data = request.get_json()
    name = data.get('name', '新偏好')
    columns = data.get('columns', DEFAULT_COLUMNS)

    pref = ColumnPreference(
        name=name,
        columns_json=json.dumps(columns, ensure_ascii=False),
        is_default=False
    )
    db.session.add(pref)
    db.session.commit()

    return jsonify({
        "success": True,
        "data": {"id": pref.id}
    })


@app.route('/api/preferences/<int:pref_id>', methods=['PUT'])
def update_preference(pref_id):
    """更新偏好"""
    pref = ColumnPreference.query.get(pref_id)
    if not pref:
        return jsonify({"success": False, "message": "偏好不存在"}), 404

    data = request.get_json()
    if 'name' in data:
        pref.name = data['name']
    if 'columns' in data:
        pref.columns_json = json.dumps(data['columns'], ensure_ascii=False)

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "偏好已更新"
    })


@app.route('/api/preferences/<int:pref_id>', methods=['DELETE'])
def delete_preference(pref_id):
    """删除偏好"""
    pref = ColumnPreference.query.get(pref_id)
    if not pref:
        return jsonify({"success": False, "message": "偏好不存在"}), 404

    if pref.is_default:
        return jsonify({"success": False, "message": "不能删除默认偏好"}), 400

    db.session.delete(pref)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "偏好已删除"
    })


@app.route('/api/preferences/<int:pref_id>/default', methods=['POST'])
def set_default_preference(pref_id):
    """设为默认偏好"""
    pref = ColumnPreference.query.get(pref_id)
    if not pref:
        return jsonify({"success": False, "message": "偏好不存在"}), 404

    # 取消其他默认
    ColumnPreference.query.update({'is_default': False})
    pref.is_default = True
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "已设为默认偏好"
    })
```

**Step 2: 验证 API**

Run: `uv run python -c "
from webtool.application import app, init
init()
with app.test_client() as client:
    resp = client.get('/api/preferences')
    print(f'Status: {resp.status_code}')
    print(f'Data: {resp.get_json()}')
"`
Expected: Status: 200, Data 包含默认偏好

**Step 3: 提交**

```bash
git add webtool/application.py
git commit -m "feat: ✨ 添加偏好管理 API 接口"
```

---

## Task 5: 添加自定义导出 API

**Files:**
- Modify: `webtool/application.py`
- Modify: `xmind2cases/utils.py`（如需添加辅助函数）

**Step 1: 添加导出辅助函数**

在 `application.py` 中添加导出辅助函数：

```python
import csv
import io
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom


def get_column_value(testcase: dict, column: dict, row_index: int) -> str:
    """根据列配置获取单元格值"""
    col_id = column.get('id')
    is_custom = column.get('is_custom', False)
    default_value = column.get('default_value', '')

    if is_custom:
        # 自定义列：从 values 中获取，或使用默认值
        values = column.get('values', {})
        return values.get(str(row_index), default_value)

    # 原始列：从 testcase 获取
    if col_id == 'suite':
        return testcase.get('suite', '')
    elif col_id == 'name':
        return testcase.get('name', '')
    elif col_id == 'preconditions':
        return testcase.get('preconditions', '')
    elif col_id == 'steps':
        steps = testcase.get('steps', [])
        return '\n'.join([f"{i+1}. {s.get('actions', '')}" for i, s in enumerate(steps)])
    elif col_id == 'expectedresults':
        steps = testcase.get('steps', [])
        return '\n'.join([f"{i+1}. {s.get('expectedresults', '')}" for i, s in enumerate(steps)])
    elif col_id == 'importance':
        return str(testcase.get('importance', ''))
    elif col_id == 'execution_type':
        return default_value or str(testcase.get('execution_type', ''))
    elif col_id == 'stage':
        return default_value

    return default_value


def generate_csv_with_columns(testcases: list, columns: list) -> str:
    """根据列配置生成 CSV 内容"""
    output = io.StringIO()
    writer = csv.writer(output, lineterminator='\n')

    # 过滤可见列并排序
    visible_columns = sorted(
        [c for c in columns if c.get('visible', True)],
        key=lambda x: x.get('order', 0)
    )

    # 写入表头
    header = [c.get('name', '') for c in visible_columns]
    writer.writerow(header)

    # 写入数据行
    for idx, tc in enumerate(testcases, 1):
        row = [get_column_value(tc, c, idx) for c in visible_columns]
        writer.writerow(row)

    return output.getvalue()


def generate_xml_with_columns(testcases: list, columns: list) -> str:
    """根据列配置生成 TestLink XML 内容"""
    # 过滤可见列并排序
    visible_columns = sorted(
        [c for c in columns if c.get('visible', True)],
        key=lambda x: x.get('order', 0)
    )

    root = Element('testcases')

    for idx, tc in enumerate(testcases, 1):
        testcase_el = SubElement(root, 'testcase')
        testcase_el.set('name', tc.get('name', ''))

        # 添加 summary
        summary = SubElement(testcase_el, 'summary')
        summary.text = tc.get('name', '')

        # 添加 preconditions
        preconditions = SubElement(testcase_el, 'preconditions')
        preconditions.text = tc.get('preconditions', '')

        # 添加 importance
        importance = SubElement(testcase_el, 'importance')
        importance.text = str(tc.get('importance', 2))

        # 添加 steps
        steps_el = SubElement(testcase_el, 'steps')
        for step_idx, step in enumerate(tc.get('steps', []), 1):
            step_el = SubElement(steps_el, 'step')
            step_number = SubElement(step_el, 'step_number')
            step_number.text = str(step_idx)
            actions = SubElement(step_el, 'actions')
            actions.text = step.get('actions', '')
            expected = SubElement(step_el, 'expectedresults')
            expected.text = step.get('expectedresults', '')

        # 添加自定义列作为 custom_fields
        custom_columns = [c for c in visible_columns if c.get('is_custom')]
        if custom_columns:
            custom_fields_el = SubElement(testcase_el, 'custom_fields')
            for col in custom_columns:
                cf_el = SubElement(custom_fields_el, 'custom_field')
                name_el = SubElement(cf_el, 'name')
                name_el.text = col.get('name', '')
                value_el = SubElement(cf_el, 'value')
                value_el.text = get_column_value(tc, col, idx)

    # 格式化 XML
    rough_string = tostring(root, encoding='unicode')
    reparsed = minidom.parseString(rough_string)
    return reparsed.toprettyxml(indent="  ")
```

**Step 2: 添加导出 API 路由**

```python
@app.route('/api/export/<filename>/csv', methods=['POST'])
def export_csv_with_preference(filename):
    """按指定偏好导出 CSV"""
    full_path = join(app.config['UPLOAD_FOLDER'], filename)
    if not exists(full_path):
        abort(404)

    data = request.get_json()
    pref_id = data.get('preference_id')

    if pref_id:
        pref = ColumnPreference.query.get(pref_id)
        columns = pref.columns if pref else DEFAULT_COLUMNS
    else:
        columns = DEFAULT_COLUMNS

    testcases = get_xmind_testcase_list(full_path)
    csv_content = generate_csv_with_columns(testcases, columns)

    from flask import Response
    return Response(
        csv_content,
        mimetype='text/csv',
        headers={'Content-Disposition': f'attachment; filename={filename[:-6]}.csv'}
    )


@app.route('/api/export/<filename>/xml', methods=['POST'])
def export_xml_with_preference(filename):
    """按指定偏好导出 XML"""
    full_path = join(app.config['UPLOAD_FOLDER'], filename)
    if not exists(full_path):
        abort(404)

    data = request.get_json()
    pref_id = data.get('preference_id')

    if pref_id:
        pref = ColumnPreference.query.get(pref_id)
        columns = pref.columns if pref else DEFAULT_COLUMNS
    else:
        columns = DEFAULT_COLUMNS

    testcases = get_xmind_testcase_list(full_path)
    xml_content = generate_xml_with_columns(testcases, columns)

    from flask import Response
    return Response(
        xml_content,
        mimetype='application/xml',
        headers={'Content-Disposition': f'attachment; filename={filename[:-6]}.xml'}
    )
```

**Step 3: 提交**

```bash
git add webtool/application.py
git commit -m "feat: ✨ 添加自定义列导出 API"
```

---

## Task 6: 创建前端样式文件

**Files:**
- Create: `webtool/static/css/preview.css`

**Step 1: 创建 preview.css**

```css
/* 预览页面列自定义样式 */

/* 表头拖拽相关 */
.column-header {
  cursor: grab;
  user-select: none;
  transition: background-color 0.2s;
}

.column-header:active {
  cursor: grabbing;
}

.column-header.dragging {
  opacity: 0.5;
  background-color: #e0e7ff;
}

.column-header.drag-over {
  border-left: 3px solid #6366f1;
}

/* 列操作按钮 */
.column-actions {
  display: none;
  margin-left: 8px;
}

.column-header:hover .column-actions {
  display: inline-flex;
  gap: 4px;
}

.column-actions button {
  padding: 2px 6px;
  font-size: 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  background-color: #f1f5f9;
  color: #475569;
  transition: all 0.2s;
}

.column-actions button:hover {
  background-color: #e2e8f0;
}

.column-actions button.btn-delete:hover {
  background-color: #fee2e2;
  color: #dc2626;
}

/* 拖拽手柄 */
.drag-handle {
  cursor: grab;
  color: #94a3b8;
  padding: 0 4px;
}

.drag-handle:hover {
  color: #64748b;
}

/* 新增列按钮 */
.add-column-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background-color: #f8fafc;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.add-column-btn:hover {
  background-color: #f1f5f9;
  border-color: #94a3b8;
  color: #475569;
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 360px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1e293b;
}

.modal-field {
  margin-bottom: 16px;
}

.modal-field label {
  display: block;
  font-size: 14px;
  color: #475569;
  margin-bottom: 6px;
}

.modal-field input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.modal-field input:focus {
  outline: none;
  border-color: #6366f1;
}

.modal-field .hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.modal-actions button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f1f5f9;
  border: none;
  color: #475569;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-confirm {
  background: #6366f1;
  border: none;
  color: white;
}

.btn-confirm:hover {
  background: #4f46e5;
}

/* 偏好选择器 */
.preference-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preference-selector select {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.preference-selector select:focus {
  outline: none;
  border-color: #6366f1;
}

/* 自定义列单元格 */
.custom-cell {
  min-height: 24px;
  cursor: text;
}

.custom-cell.editing {
  padding: 4px 8px;
  background: #fefce8;
  border-radius: 4px;
}

.custom-cell input {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
}

/* 导出弹窗 */
.export-modal .preference-list {
  max-height: 200px;
  overflow-y: auto;
}

.export-modal .preference-item {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.export-modal .preference-item:hover {
  background-color: #f1f5f9;
}

.export-modal .preference-item.selected {
  background-color: #e0e7ff;
}

.export-modal .preference-item input[type="radio"] {
  margin-right: 10px;
}

.export-modal .preference-item .pref-name {
  font-weight: 500;
}

.export-modal .preference-item .pref-count {
  margin-left: 8px;
  font-size: 12px;
  color: #94a3b8;
}

/* 隐藏类 */
.hidden {
  display: none !important;
}
```

**Step 2: 提交**

```bash
git add webtool/static/css/preview.css
git commit -m "feat: ✨ 添加预览页面列自定义样式"
```

---

## Task 7: 创建前端交互脚本

**Files:**
- Create: `webtool/static/js/preview.js`

**Step 1: 创建 preview.js（第一部分：基础结构和初始化）**

```javascript
/**
 * 预览页面列自定义管理器
 */
const ColumnManager = {
  // 当前状态
  currentPreference: null,
  preferences: [],
  testcases: [],
  filename: '',

  // 防抖定时器
  _saveTimer: null,

  /**
   * 初始化
   */
  async init() {
    // 从页面获取数据
    this.filename = document.body.dataset.filename;
    this.testcases = window.TESTCASES || [];

    // 加载偏好列表
    await this.loadPreferences();

    // 渲染偏好选择器
    this.renderPreferenceSelector();

    // 渲染表格
    this.renderTable();

    // 绑定事件
    this.bindEvents();
  },

  /**
   * 加载偏好列表
   */
  async loadPreferences() {
    try {
      const resp = await fetch('/api/preferences');
      const data = await resp.json();
      if (data.success) {
        this.preferences = data.data;
        // 找到默认偏好
        this.currentPreference = this.preferences.find(p => p.is_default) || this.preferences[0];
      }
    } catch (e) {
      console.error('加载偏好失败:', e);
    }
  },

  /**
   * 防抖保存
   */
  debounceSave() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
    }
    this._saveTimer = setTimeout(() => {
      this.saveCurrentPreference();
    }, 500);
  },

  /**
   * 保存当前偏好
   */
  async saveCurrentPreference() {
    if (!this.currentPreference) return;

    try {
      await fetch(`/api/preferences/${this.currentPreference.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columns: this.currentPreference.columns
        })
      });
    } catch (e) {
      console.error('保存偏好失败:', e);
    }
  },
};
```

**Step 2: 添加渲染函数**

```javascript
// 继续在 ColumnManager 对象中添加

/**
 * 渲染偏好选择器
 */
renderPreferenceSelector() {
  const container = document.getElementById('preference-selector');
  if (!container) return;

  const select = container.querySelector('select');
  select.innerHTML = this.preferences.map(p =>
    `<option value="${p.id}" ${p.id === this.currentPreference?.id ? 'selected' : ''}>
      ${p.name} (${p.columns.filter(c => c.visible).length}列)
    </option>`
  ).join('');
},

/**
 * 渲染整个表格
 */
renderTable() {
  this.renderHeader();
  this.renderBody();
},

/**
 * 渲染表头
 */
renderHeader() {
  const thead = document.querySelector('thead tr');
  if (!thead) return;

  const columns = this.currentPreference?.columns || [];
  const visibleColumns = columns.filter(c => c.visible).sort((a, b) => a.order - b.order);

  let html = '<th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-20 whitespace-nowrap">序号</th>';

  visibleColumns.forEach(col => {
    html += `
      <th class="column-header px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap"
          data-col-id="${col.id}" draggable="true">
        <span class="drag-handle">⋮⋮</span>
        <span class="column-name">${col.name}</span>
        <span class="column-actions">
          <button class="btn-edit" title="编辑">✏️</button>
          <button class="btn-delete" title="删除">🗑️</button>
        </span>
      </th>
    `;
  });

  html += `
    <th class="px-6 py-3">
      <button class="add-column-btn" id="add-column-btn">
        <span>+</span> 新增列
      </button>
    </th>
  `;

  thead.innerHTML = html;
},

/**
 * 渲染表格内容
 */
renderBody() {
  const tbody = document.querySelector('tbody');
  if (!tbody) return;

  const columns = this.currentPreference?.columns || [];
  const visibleColumns = columns.filter(c => c.visible).sort((a, b) => a.order - b.order);

  let html = '';
  this.testcases.forEach((tc, idx) => {
    html += `<tr class="hover:bg-slate-50">`;
    html += `<td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600">${idx + 1}</td>`;

    visibleColumns.forEach(col => {
      const value = this.getColumnValue(tc, col, idx + 1);
      const cellClass = col.is_custom ? 'custom-cell' : '';

      if (col.id === 'importance') {
        html += `
          <td class="px-6 py-4 text-sm">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
              ${value === '1' ? 'bg-red-100 text-red-800' : value === '2' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}">
              P${value}
            </span>
          </td>
        `;
      } else {
        html += `<td class="px-6 py-4 text-sm text-slate-700 ${cellClass}" data-col-id="${col.id}" data-row="${idx + 1}">${value}</td>`;
      }
    });

    html += `<td class="px-6 py-4"></td>`; // 空列用于新增按钮
    html += `</tr>`;
  });

  tbody.innerHTML = html;
},

/**
 * 获取列值
 */
getColumnValue(testcase, column, rowIndex) {
  const colId = column.id;
  const isCustom = column.is_custom;
  const defaultValue = column.default_value || '';

  if (isCustom) {
    const values = column.values || {};
    return values[rowIndex.toString()] || defaultValue;
  }

  switch (colId) {
    case 'suite': return testcase.suite || '';
    case 'name': return testcase.name || '';
    case 'preconditions': return testcase.preconditions || '';
    case 'steps':
      return (testcase.steps || []).map((s, i) => `${i + 1}. ${s.actions || ''}`).join('<br>');
    case 'expectedresults':
      return (testcase.steps || []).map((s, i) => `${i + 1}. ${s.expectedresults || ''}`).join('<br>');
    case 'importance': return testcase.importance || '';
    default: return defaultValue;
  }
},
```

**Step 3: 添加事件绑定**

```javascript
// 继续在 ColumnManager 对象中添加

/**
 * 绑定事件
 */
bindEvents() {
  // 偏好切换
  const select = document.querySelector('#preference-selector select');
  if (select) {
    select.addEventListener('change', (e) => {
      const prefId = parseInt(e.target.value);
      this.switchPreference(prefId);
    });
  }

  // 表头事件委托
  document.querySelector('thead').addEventListener('click', (e) => {
    if (e.target.matches('.btn-edit')) {
      const colId = e.target.closest('.column-header').dataset.colId;
      this.openEditModal(colId);
    }
    if (e.target.matches('.btn-delete')) {
      const colId = e.target.closest('.column-header').dataset.colId;
      this.deleteColumn(colId);
    }
    if (e.target.matches('#add-column-btn')) {
      this.openAddModal();
    }
  });

  // 拖拽事件
  document.querySelectorAll('.column-header').forEach(th => {
    th.addEventListener('dragstart', (e) => this.handleDragStart(e));
    th.addEventListener('dragover', (e) => this.handleDragOver(e));
    th.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    th.addEventListener('drop', (e) => this.handleDrop(e));
    th.addEventListener('dragend', (e) => this.handleDragEnd(e));
  });

  // 双击编辑单元格
  document.querySelector('tbody').addEventListener('dblclick', (e) => {
    if (e.target.matches('.custom-cell')) {
      const colId = e.target.dataset.colId;
      const row = e.target.dataset.row;
      this.editCell(colId, row, e.target);
    }
  });

  // 导出按钮
  document.querySelectorAll('.export-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = btn.dataset.type;
      this.openExportModal(type);
    });
  });
},
```

**Step 4: 添加拖拽处理**

```javascript
// 继续在 ColumnManager 对象中添加

_draggedColumn: null,

handleDragStart(e) {
  this._draggedColumn = e.target.closest('.column-header');
  this._draggedColumn.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
},

handleDragOver(e) {
  e.preventDefault();
  const target = e.target.closest('.column-header');
  if (target && target !== this._draggedColumn) {
    target.classList.add('drag-over');
  }
},

handleDragLeave(e) {
  const target = e.target.closest('.column-header');
  if (target) {
    target.classList.remove('drag-over');
  }
},

handleDrop(e) {
  e.preventDefault();
  const target = e.target.closest('.column-header');
  if (!target || target === this._draggedColumn) return;

  target.classList.remove('drag-over');

  // 交换列顺序
  const draggedId = this._draggedColumn.dataset.colId;
  const targetId = target.dataset.colId;

  this.swapColumnOrder(draggedId, targetId);
  this.renderTable();
  this.debounceSave();
},

handleDragEnd(e) {
  if (this._draggedColumn) {
    this._draggedColumn.classList.remove('dragging');
    this._draggedColumn = null;
  }
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
},

swapColumnOrder(colId1, colId2) {
  const columns = this.currentPreference.columns;
  const col1 = columns.find(c => c.id === colId1);
  const col2 = columns.find(c => c.id === colId2);

  if (col1 && col2) {
    const temp = col1.order;
    col1.order = col2.order;
    col2.order = temp;
  }
},
```

**Step 5: 添加列操作和弹窗**

```javascript
// 继续在 ColumnManager 对象中添加

/**
 * 打开新增列弹窗
 */
openAddModal() {
  this.showModal('新增列', { name: '未命名字段', defaultValue: '' }, (data) => {
    this.addColumn(data.name, data.defaultValue);
  });
},

/**
 * 打开编辑列弹窗
 */
openEditModal(colId) {
  const col = this.currentPreference.columns.find(c => c.id === colId);
  if (!col) return;

  this.showModal('编辑列', {
    name: col.name,
    defaultValue: col.default_value || ''
  }, (data) => {
    this.updateColumn(colId, data.name, data.defaultValue);
  });
},

/**
 * 显示弹窗
 */
showModal(title, data, onConfirm) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">${title}</div>
      <div class="modal-field">
        <label>列名称</label>
        <input type="text" id="modal-name" value="${data.name}" placeholder="输入列名称">
      </div>
      <div class="modal-field">
        <label>默认值</label>
        <input type="text" id="modal-default" value="${data.defaultValue}" placeholder="可选">
        <div class="hint">所有行将填充此值，留空则不填充</div>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel">取消</button>
        <button class="btn-confirm">确定</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // 绑定事件
  overlay.querySelector('.btn-cancel').onclick = () => overlay.remove();
  overlay.querySelector('.btn-confirm').onclick = () => {
    const name = overlay.querySelector('#modal-name').value.trim();
    const defaultValue = overlay.querySelector('#modal-default').value.trim();
    overlay.remove();
    onConfirm({ name, defaultValue });
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  // 聚焦输入框
  overlay.querySelector('#modal-name').focus();
},

/**
 * 新增列
 */
addColumn(name, defaultValue) {
  const columns = this.currentPreference.columns;
  const maxOrder = Math.max(...columns.map(c => c.order || 0), 0);
  const customCount = columns.filter(c => c.is_custom).length;

  columns.push({
    id: `custom_${customCount + 1}`,
    name: name || '未命名字段',
    visible: true,
    order: maxOrder + 1,
    is_custom: true,
    default_value: defaultValue,
    values: {}
  });

  this.renderTable();
  this.debounceSave();
},

/**
 * 更新列
 */
updateColumn(colId, name, defaultValue) {
  const col = this.currentPreference.columns.find(c => c.id === colId);
  if (!col) return;

  col.name = name || col.name;
  col.default_value = defaultValue;

  this.renderTable();
  this.debounceSave();
},

/**
 * 删除列
 */
deleteColumn(colId) {
  if (!confirm('确定要删除此列吗？')) return;

  const idx = this.currentPreference.columns.findIndex(c => c.id === colId);
  if (idx > -1) {
    this.currentPreference.columns.splice(idx, 1);
    this.renderTable();
    this.debounceSave();
  }
},

/**
 * 编辑单元格
 */
editCell(colId, row, cellElement) {
  const col = this.currentPreference.columns.find(c => c.id === colId);
  if (!col || !col.is_custom) return;

  const currentValue = col.values?.[row] || col.default_value || '';

  cellElement.classList.add('editing');
  cellElement.innerHTML = `<input type="text" value="${currentValue}" />`;

  const input = cellElement.querySelector('input');
  input.focus();
  input.select();

  const saveCell = () => {
    const newValue = input.value.trim();
    if (!col.values) col.values = {};
    col.values[row] = newValue;
    cellElement.classList.remove('editing');
    cellElement.textContent = newValue || col.default_value || '';
    this.debounceSave();
  };

  input.onblur = saveCell;
  input.onkeydown = (e) => {
    if (e.key === 'Enter') saveCell();
    if (e.key === 'Escape') {
      cellElement.classList.remove('editing');
      cellElement.textContent = currentValue;
    }
  };
},
```

**Step 6: 添加偏好管理和导出**

```javascript
// 继续在 ColumnManager 对象中添加

/**
 * 切换偏好
 */
async switchPreference(prefId) {
  this.currentPreference = this.preferences.find(p => p.id === prefId);
  this.renderTable();
},

/**
 * 打开导出弹窗
 */
openExportModal(type) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay export-modal';

  const options = this.preferences.map(p => `
    <label class="preference-item ${p.id === this.currentPreference?.id ? 'selected' : ''}">
      <input type="radio" name="export-pref" value="${p.id}"
        ${p.id === this.currentPreference?.id ? 'checked' : ''}>
      <span class="pref-name">${p.name}</span>
      <span class="pref-count">(${p.columns.filter(c => c.visible).length}列)</span>
    </label>
  `).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="modal-title">导出 ${type.toUpperCase()}</div>
      <div class="modal-field">
        <label>选择偏好</label>
        <div class="preference-list">${options}</div>
      </div>
      <div class="modal-actions">
        <button class="btn-cancel">取消</button>
        <button class="btn-confirm">导出</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // 选中样式切换
  overlay.querySelectorAll('.preference-item').forEach(item => {
    item.onclick = () => {
      overlay.querySelectorAll('.preference-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      item.querySelector('input').checked = true;
    };
  });

  // 绑定事件
  overlay.querySelector('.btn-cancel').onclick = () => overlay.remove();
  overlay.querySelector('.btn-confirm').onclick = () => {
    const prefId = overlay.querySelector('input[name="export-pref"]:checked').value;
    overlay.remove();
    this.doExport(type, parseInt(prefId));
  };
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
},

/**
 * 执行导出
 */
async doExport(type, preferenceId) {
  try {
    const resp = await fetch(`/api/export/${this.filename}/${type}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preference_id: preferenceId })
    });

    if (!resp.ok) throw new Error('导出失败');

    const blob = await resp.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.filename.replace('.xmind', '')}.${type}`;
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (e) {
    alert('导出失败: ' + e.message);
  }
},

// 初始化入口
};

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  ColumnManager.init();
});
```

**Step 2: 提交**

```bash
git add webtool/static/js/preview.js
git commit -m "feat: ✨ 添加预览页面列自定义交互脚本"
```

---

## Task 8: 重构预览页面模板

**Files:**
- Modify: `webtool/templates/preview.html`

**Step 1: 更新 preview.html 头部**

在 `</head>` 前添加新样式和脚本引用：

```html
<!-- 在 </head> 前添加 -->
<link rel="stylesheet" type="text/css" href="{{ url_for('static', filename='css/preview.css') }}">
```

在 `</body>` 前添加脚本：

```html
<!-- 在 </body> 前添加 -->
<script>
  // 传递数据给 JS
  window.TESTCASES = {{ suite | tojson }};
  document.body.dataset.filename = "{{ name }}";
</script>
<script src="{{ url_for('static', filename='js/preview.js') }}"></script>
```

**Step 2: 更新顶部操作栏**

替换顶部操作栏，添加偏好选择器和修改导出按钮：

```html
<!-- 顶部操作栏 -->
<div class="bg-white border-b border-slate-200 sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center space-x-4">
                <a href="{{ url_for('index') }}" class="text-slate-600 hover:text-slate-900">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </a>
                <div>
                    <h1 class="text-lg font-semibold text-slate-900">{{ name }}</h1>
                    <p class="text-sm text-slate-500">预览</p>
                </div>
            </div>

            <div class="flex items-center space-x-3">
                <!-- 统计信息 -->
                <div class="hidden sm:flex items-center space-x-4 mr-4">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-indigo-600">{{ suite_count }}</div>
                        <div class="text-xs text-slate-500">TestSuites</div>
                    </div>
                    <div class="h-8 w-px bg-slate-200"></div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-indigo-600">{{ suite | length }}</div>
                        <div class="text-xs text-slate-500">TestCases</div>
                    </div>
                </div>

                <!-- 偏好选择器 -->
                <div class="preference-selector" id="preference-selector">
                    <label class="text-sm text-slate-500">偏好:</label>
                    <select class="text-sm"></select>
                </div>

                <!-- 导出按钮 -->
                <div class="flex flex-wrap items-center gap-2">
                    <button class="export-btn inline-flex items-center px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors text-sm sm:text-base" data-type="csv">
                        <svg class="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span class="hidden sm:inline">导出</span> CSV
                    </button>
                    <button class="export-btn inline-flex items-center px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors text-sm sm:text-base" data-type="xml">
                        <svg class="w-4 h-4 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        <span class="hidden sm:inline">导出</span> XML
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>
```

**Step 3: 更新表格结构**

将现有表格替换为动态渲染的占位符：

```html
<!-- 主内容区域 -->
<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200">
                <thead class="bg-slate-50">
                    <tr>
                        <!-- 由 JS 动态渲染 -->
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-slate-200">
                    <!-- 由 JS 动态渲染 -->
                </tbody>
            </table>
        </div>
    </div>
</main>
```

**Step 4: 提交**

```bash
git add webtool/templates/preview.html
git commit -m "feat: ✨ 重构预览页面模板，支持列自定义"
```

---

## Task 9: 删除不再需要的 schema.sql

**Files:**
- Delete: `webtool/schema.sql`

**Step 1: 删除文件**

```bash
rm webtool/schema.sql
```

**Step 2: 提交**

```bash
git add -A
git commit -m "chore: 🔥 删除不再需要的 schema.sql"
```

---

## Task 10: 集成测试

**Step 1: 启动应用**

Run: `uv run python webtool/application.py`
Expected: 应用启动成功，访问 http://localhost:5002

**Step 2: 手动测试清单**

- [ ] 上传 XMind 文件，进入预览页面
- [ ] 验证偏好选择器显示"默认 (6列)"
- [ ] 点击"新增列"按钮，添加自定义列
- [ ] 拖拽列头调整顺序
- [ ] 编辑列名和默认值
- [ ] 删除列
- [ ] 双击自定义列单元格编辑
- [ ] 点击导出按钮，选择偏好导出 CSV
- [ ] 点击导出按钮，选择偏好导出 XML
- [ ] 刷新页面，验证偏好设置保留

**Step 3: 最终提交**

```bash
git add -A
git commit -m "test: ✅ 完成预览界面列自定义功能集成测试"
```

---

## 执行完成标志

所有任务完成后，运行：

```bash
git log --oneline -10
```

确认提交历史包含所有功能的提交记录。
