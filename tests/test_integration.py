# tests/test_integration.py
import os
from xmind2cases.utils import get_xmind_testsuites, get_xmind_testcase_list


def test_parse_xmind_file(test_xmind):
    """测试解析 xmind 文件"""
    testsuites = get_xmind_testsuites(test_xmind)

    # 验证返回了测试集
    assert len(testsuites) > 0

    # 验证测试集结构
    suite = testsuites[0]
    assert suite.name is not None
    assert len(suite.sub_suites) > 0


def test_xmind_to_testcase_list(test_xmind):
    """测试 xmind 文件转换为测试用例列表"""
    testcases = get_xmind_testcase_list(test_xmind)

    # 验证返回了测试用例
    assert len(testcases) > 0

    # 验证测试用例结构
    case = testcases[0]
    assert "name" in case
    assert "steps" in case
    assert "product" in case
    assert "suite" in case


def test_convert_to_csv(test_xmind):
    """测试 CSV 转换功能"""
    from xmind2cases.zentao import xmind_to_zentao_csv_file

    # 转换为 CSV
    csv_file = xmind_to_zentao_csv_file(test_xmind)

    # 验证文件创建
    assert os.path.exists(csv_file)
    assert csv_file.endswith(".csv")

    # 验证文件内容不为空
    with open(csv_file, "r", encoding="utf-8") as f:
        content = f.read()
        assert len(content) > 0
        # CSV 应该包含表头
        assert "用例标题" in content or "用例名称" in content or "TestCase" in content

    # 清理生成的 CSV 文件
    if os.path.exists(csv_file):
        os.remove(csv_file)
