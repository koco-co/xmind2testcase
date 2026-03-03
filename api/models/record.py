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
