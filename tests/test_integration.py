# tests/test_integration.py
import pytest
import os
from xmind2testcase.utils import get_xmind_testsuites, get_xmind_testcase_list

def test_parse_xmind8_file(xmind8_file):
    """测试解析 xmind8 文件"""
    testsuites = get_xmind_testsuites(xmind8_file)

    # 验证返回了测试集
    assert len(testsuites) > 0

    # 验证测试集结构
    suite = testsuites[0]
    assert suite.name is not None
    assert len(suite.sub_suites) > 0

def test_xmind8_to_testcase_list(xmind8_file):
    """测试 xmind8 文件转换为测试用例列表"""
    testcases = get_xmind_testcase_list(xmind8_file)

    # 验证返回了测试用例
    assert len(testcases) > 0

    # 验证测试用例结构
    case = testcases[0]
    assert 'name' in case
    assert 'steps' in case
    assert 'product' in case
    assert 'suite' in case

def test_parse_xmind2026_file(xmind2026_file):
    """测试解析 xmind2026 文件"""
    testsuites = get_xmind_testsuites(xmind2026_file)

    # 验证返回了测试集
    assert len(testsuites) > 0

    # 验证测试集结构
    suite = testsuites[0]
    assert suite.name is not None
    assert len(suite.sub_suites) > 0

def test_xmind2026_to_testcase_list(xmind2026_file):
    """测试 xmind2026 文件转换为测试用例列表"""
    testcases = get_xmind_testcase_list(xmind2026_file)

    # 验证返回了测试用例
    assert len(testcases) > 0

    # 验证测试用例结构
    case = testcases[0]
    assert 'name' in case
    assert 'steps' in case
    assert 'product' in case
    assert 'suite' in case

def test_both_formats_same_output(xmind8_file, xmind2026_file):
    """测试两种格式文件的输出一致"""
    # 获取两种格式的测试用例
    xmind8_cases = get_xmind_testcase_list(xmind8_file)
    xmind2026_cases = get_xmind_testcase_list(xmind2026_file)

    # 验证测试用例数量相同
    assert len(xmind8_cases) == len(xmind2026_cases)

    # 验证每个测试用例的关键字段相同
    for case8, case2026 in zip(xmind8_cases, xmind2026_cases):
        assert case8['name'] == case2026['name']
        assert case8['product'] == case2026['product']
        assert case8['suite'] == case2026['suite']
        assert len(case8['steps']) == len(case2026['steps'])

        # 验证测试步骤
        for step8, step2026 in zip(case8['steps'], case2026['steps']):
            assert step8['actions'] == step2026['actions']
            assert step8['expectedresults'] == step2026['expectedresults']

def test_convert_to_csv(xmind8_file):
    """测试 CSV 转换功能"""
    from xmind2testcase.zentao import xmind_to_zentao_csv_file

    # 转换为 CSV
    csv_file = xmind_to_zentao_csv_file(xmind8_file)

    # 验证文件创建
    assert os.path.exists(csv_file)
    assert csv_file.endswith('.csv')

    # 验证文件内容不为空
    with open(csv_file, 'r', encoding='utf-8') as f:
        content = f.read()
        assert len(content) > 0
        # CSV 应该包含表头
        assert '用例标题' in content or '用例名称' in content or 'TestCase' in content

    # 清理生成的 CSV 文件
    if os.path.exists(csv_file):
        os.remove(csv_file)
