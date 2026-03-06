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
