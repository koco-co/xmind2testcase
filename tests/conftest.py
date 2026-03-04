# tests/conftest.py
import os
import pytest

# 测试文件路径
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "docs")


@pytest.fixture
def test_xmind():
    """测试用 xmind 文件"""
    return os.path.join(DOCS_DIR, "test.xmind")
