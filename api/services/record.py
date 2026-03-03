# api/services/record.py
from datetime import datetime
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from api.core.exceptions import RecordNotFoundError
from api.repositories.record import RecordRepository
from api.repositories.testcase import TestCaseRepository
from api.services.xmind_parser import XMindParserService


class RecordService:
    """记录管理服务"""

    def __init__(self, db: AsyncSession, parser_service: XMindParserService):
        self.db = db
        self.record_repo = RecordRepository(db)
        self.testcase_repo = TestCaseRepository(db)
        self.parser = parser_service

    async def create_record(self, file_path: str, original_filename: str) -> dict:
        """创建新记录（上传并解析 XMind）"""
        parsed = await self.parser.parse_file(file_path)

        record_data = {
            "name": Path(file_path).name,
            "original_filename": original_filename,
            "file_path": file_path,
            "create_on": datetime.utcnow().isoformat(),
            "file_size": Path(file_path).stat().st_size,
            "xmind_version": parsed["version"],
            "converted_at": datetime.utcnow().isoformat(),
        }

        record = await self.record_repo.create(record_data)

        return {
            "id": record.id,
            **record_data,
            "testcase_count": parsed["metadata"]["testcase_count"],
        }

    async def get_record(self, record_id: int) -> dict:
        """获取记录详情"""
        result = await self.record_repo.get_with_testcase_count(record_id)
        if not result:
            raise RecordNotFoundError(f"Record {record_id} not found")
        return result

    async def list_records(self, skip: int = 0, limit: int = 20) -> list:
        """获取记录列表"""
        return await self.record_repo.list_not_deleted(skip, limit)
