# api/services/xmind_parser.py
from pathlib import Path
from typing import Dict, Any

from xmind2testcase.utils import get_xmind_testcase_list, get_xmind_testsuites

from api.core.exceptions import XMindParserError


class XMindParserService:
    """XMind 文件解析服务"""

    async def parse_file(self, file_path: str) -> Dict[str, Any]:
        """解析 XMind 文件"""
        try:
            testcases = get_xmind_testcase_list(file_path)
            testsuites = get_xmind_testsuites(file_path)

            return {
                "version": await self._detect_version(file_path),
                "testcases": testcases,
                "testsuites": testsuites,
                "metadata": {
                    "testcase_count": len(testcases),
                    "suite_count": len(testsuites),
                },
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
        path = Path(file_path)
        if path.is_dir():
            content_json = path / "content.json"
            if content_json.exists():
                return "2026"
        return "8"
