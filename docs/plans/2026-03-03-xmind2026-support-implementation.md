# XMind2026 支持升级实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 升级 xmind2testcase 以同时支持 xmind8 和 xmind2026 版本的文件，通过替换 xmind 依赖为 xmindparser 并添加适配器层实现。

**架构:** 采用适配器模式，将 xmindparser 的输出转换为现有代码期望的格式。新增 `normalize_xmind_data()` 函数处理字段映射（makers→markers, labels→label），保持 parser.py 逻辑不变。

**技术栈:** Python 3.8+, xmindparser, pytest, pytest-cov

---

## 前置准备

### Task 0: 环境验证和依赖安装

**目标:** 确保开发环境就绪，安装 xmindparser

**Step 1: 验证 Python 版本**

```bash
python3 --version
```

预期输出: `Python 3.8.0` 或更高版本

**Step 2: 激活虚拟环境**

```bash
source .venv/bin/activate
```

**Step 3: 安装 xmindparser**

```bash
uv pip install xmindparser
```

预期输出: `Installed xmindparser`

**Step 4: 验证 xmindparser 安装**

```bash
python3 -c "from xmindparser import xmind_to_dict; print('xmindparser installed successfully')"
```

预期输出: `xmindparser installed successfully`

**Step 5: 安装测试依赖**

```bash
uv pip install pytest pytest-cov
```

预期输出: `Installed pytest pytest-cov`

**Step 6: 验证测试文件存在**

```bash
ls -lh docs/202602-数据资产v6.4.8*.xmind
ls -lh docs/202602-数据资产v6.4.8*.csv
```

预期输出: 列出 xmind8、xmind2026 版本文件和参考 CSV

---

## 阶段 1: 测试框架搭建

### Task 1: 创建测试目录结构

**Files:**
- Create: `tests/__init__.py`
- Create: `tests/test_utils.py`
- Create: `tests/test_integration.py`
- Create: `tests/test_e2e.py`
- Create: `tests/fixtures/__init__.py`

**Step 1: 创建测试目录**

```bash
mkdir -p tests/fixtures
```

**Step 2: 创建测试初始化文件**

```bash
touch tests/__init__.py tests/fixtures/__init__.py
```

**Step 3: 创建测试文件骨架**

```bash
touch tests/test_utils.py tests/test_integration.py tests/test_e2e.py
```

**Step 4: 验证 pytest 能发现测试**

```bash
pytest --collect-only tests/
```

预期输出: 列出 3 个测试文件（0 个测试用例）

**Step 5: 提交测试框架**

```bash
git add tests/
git commit -m "test: 🧪 add test framework structure"
```

---

### Task 2: 配置 pytest

**Files:**
- Create: `pytest.ini`
- Create: `tests/conftest.py`

**Step 1: 创建 pytest 配置文件**

```ini
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts =
    -v
    --strict-markers
    --tb=short
    --cov=xmind2testcase
    --cov-report=term-missing
    --cov-report=html
```

**Step 2: 创建 pytest fixtures**

```python
# tests/conftest.py
import os
import pytest

# 测试文件路径
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), 'fixtures')
DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docs')

@pytest.fixture
def xmind8_file():
    """xmind8 版本测试文件"""
    return os.path.join(DOCS_DIR, '202602-数据资产v6.4.8(xmind8版本).xmind')

@pytest.fixture
def xmind2026_file():
    """xmind2026 版本测试文件"""
    return os.path.join(DOCS_DIR, '202602-数据资产v6.4.8(xmind2026版本).xmind')

@pytest.fixture
def reference_csv():
    """参考 CSV 文件"""
    return os.path.join(DOCS_DIR, '202602-数据资产v6.4.8(xmind8版本).csv')
```

**Step 3: 验证 fixtures 可用**

```bash
pytest --collect-only tests/test_utils.py
```

预期输出: pytest 成功加载

**Step 4: 提交配置文件**

```bash
git add pytest.ini tests/conftest.py
git commit -m "test: ⚙️ configure pytest with coverage"
```

---

## 阶段 2: 核心功能实现（TDD）

### Task 3: 实现 normalize_xmind_data() - 基本功能

**Files:**
- Create: `xmind2testcase/utils.py` 中的 `normalize_xmind_data()` 函数
- Modify: `tests/test_utils.py`

**Step 1: 编写第一个失败测试 - 基本输入验证**

```python
# tests/test_utils.py
import pytest
from xmind2testcase.utils import normalize_xmind_data

def test_normalize_xmind_data_invalid_input_not_list():
    """测试输入不是列表时抛出异常"""
    with pytest.raises(ValueError, match="Expected list from xmindparser"):
        normalize_xmind_data("not a list")

def test_normalize_xmind_data_empty_list():
    """测试空列表时抛出异常"""
    with pytest.raises(ValueError, match="XMind data is empty"):
        normalize_xmind_data([])
```

**Step 2: 运行测试验证失败**

```bash
pytest tests/test_utils.py::test_normalize_xmind_data_invalid_input_not_list -v
```

预期输出: `ImportError: cannot import name 'normalize_xmind_data'`

**Step 3: 实现最小函数**

```python
# xmind2testcase/utils.py
# 在文件开头添加导入
from typing import Any, Dict, List

# 在文件末尾添加函数
def normalize_xmind_data(xmind_dict: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalize xmindparser output to match legacy xmind library format.

    Args:
        xmind_dict: Raw output from xmindparser.xmind_to_dict()

    Returns:
        Normalized data structure matching old xmind library format

    Raises:
        ValueError: If input is invalid or empty
    """
    if not isinstance(xmind_dict, list):
        raise ValueError(
            f"Expected list from xmindparser, got {type(xmind_dict).__name__}"
        )

    if len(xmind_dict) == 0:
        raise ValueError("XMind data is empty")

    # 暂时返回原始数据
    return xmind_dict
```

**Step 4: 运行测试验证通过**

```bash
pytest tests/test_utils.py::test_normalize_xmind_data_invalid_input_not_list -v
pytest tests/test_utils.py::test_normalize_xmind_data_empty_list -v
```

预期输出: 两个测试都 PASS

**Step 5: 提交代码**

```bash
git add xmind2testcase/utils.py tests/test_utils.py
git commit -m "feat: ✨ add normalize_xmind_data function with input validation"
```

---

### Task 4: 实现 makers → markers 映射

**Files:**
- Modify: `xmind2testcase/utils.py` 中的 `normalize_xmind_data()`
- Modify: `tests/test_utils.py`

**Step 1: 编写失败测试 - makers 映射**

```python
# tests/test_utils.py 添加新测试

def test_normalize_makers_to_markers():
    """测试 makers 字段映射为 markers"""
    input_data = [
        {
            'title': 'Sheet 1',
            'topic': {
                'title': 'Root',
                'topics': [
                    {
                        'title': 'Test Case 1',
                        'makers': ['priority-1']
                    }
                ]
            }
        }
    ]

    result = normalize_xmind_data(input_data)

    # 验证原始 makers 字段保留
    assert result[0]['topic']['topics'][0]['makers'] == ['priority-1']
    # 验证新增 markers 字段
    assert result[0]['topic']['topics'][0]['markers'] == ['priority-1']

def test_normalize_empty_makers():
    """测试没有 makers 时添加空 markers"""
    input_data = [
        {
            'title': 'Sheet 1',
            'topic': {
                'title': 'Root',
                'topics': [
                    {'title': 'Test Case 1'}
                ]
            }
        }
    ]

    result = normalize_xmind_data(input_data)

    # 验证添加了空 markers
    assert result[0]['topic']['topics'][0]['markers'] == []
```

**Step 2: 运行测试验证失败**

```bash
pytest tests/test_utils.py::test_normalize_makers_to_markers -v
```

预期输出: `AssertionError: KeyError: 'markers'`

**Step 3: 实现字段映射逻辑**

```python
# xmind2testcase/utils.py 修改 normalize_xmind_data

def normalize_xmind_data(xmind_dict: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Normalize xmindparser output to match legacy xmind library format."""
    if not isinstance(xmind_dict, list):
        raise ValueError(
            f"Expected list from xmindparser, got {type(xmind_dict).__name__}"
        )

    if len(xmind_dict) == 0:
        raise ValueError("XMind data is empty")

    def normalize_topic(topic: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize a single topic node."""
        if not isinstance(topic, dict):
            return topic

        # 字段映射：makers → markers
        if 'makers' in topic:
            topic['markers'] = topic['makers']

        # 确保 markers 字段存在
        if 'markers' not in topic:
            topic['markers'] = []

        # 递归处理子 topics
        if 'topics' in topic and isinstance(topic['topics'], list):
            topic['topics'] = [
                normalize_topic(sub_topic)
                for sub_topic in topic['topics']
            ]

        return topic

    # 深拷贝以避免修改原始数据
    import copy
    normalized_dict = copy.deepcopy(xmind_dict)

    # 标准化每个 sheet
    for sheet in normalized_dict:
        if 'topic' in sheet and isinstance(sheet['topic'], dict):
            sheet['topic'] = normalize_topic(sheet['topic'])

    return normalized_dict
```

**Step 4: 运行测试验证通过**

```bash
pytest tests/test_utils.py::test_normalize_makers_to_markers -v
pytest tests/test_utils.py::test_normalize_empty_makers -v
```

预期输出: 两个测试都 PASS

**Step 5: 提交代码**

```bash
git add xmind2testcase/utils.py tests/test_utils.py
git commit -m "feat: ✨ implement makers to markers mapping in normalize_xmind_data"
```

---

### Task 5: 实现 labels → label 映射

**Files:**
- Modify: `xmind2testcase/utils.py` 中的 `normalize_xmind_data()`
- Modify: `tests/test_utils.py`

**Step 1: 编写失败测试 - labels 映射**

```python
# tests/test_utils.py 添加新测试

def test_normalize_labels_to_label():
    """测试 labels 字段映射为 label（取第一个）"""
    input_data = [
        {
            'title': 'Sheet 1',
            'topic': {
                'title': 'Root',
                'topics': [
                    {
                        'title': 'Test Case 1',
                        'labels': ['自动', '高优先级']
                    }
                ]
            }
        }
    ]

    result = normalize_xmind_data(input_data)

    # 验证原始 labels 字段保留
    assert result[0]['topic']['topics'][0]['labels'] == ['自动', '高优先级']
    # 验证新增 label 字段取第一个
    assert result[0]['topic']['topics'][0]['label'] == '自动'

def test_normalize_empty_labels():
    """测试没有 labels 时添加 None label"""
    input_data = [
        {
            'title': 'Sheet 1',
            'topic': {
                'title': 'Root',
                'topics': [
                    {'title': 'Test Case 1'}
                ]
            }
        }
    ]

    result = normalize_xmind_data(input_data)

    # 验证添加了 None label
    assert result[0]['topic']['topics'][0]['label'] is None
```

**Step 2: 运行测试验证失败**

```bash
pytest tests/test_utils.py::test_normalize_labels_to_label -v
```

预期输出: `AssertionError: KeyError: 'label'`

**Step 3: 实现 label 映射逻辑**

```python
# xmind2testcase/utils.py 修改 normalize_topic 函数

def normalize_topic(topic: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a single topic node."""
    if not isinstance(topic, dict):
        return topic

    # 字段映射：makers → markers
    if 'makers' in topic:
        topic['markers'] = topic['makers']

    # 确保 markers 字段存在
    if 'markers' not in topic:
        topic['markers'] = []

    # 字段映射：labels → label
    if 'labels' in topic and isinstance(topic['labels'], list):
        # 取第一个 label，或 None
        topic['label'] = topic['labels'][0] if topic['labels'] else None
    elif 'label' not in topic:
        topic['label'] = None

    # 递归处理子 topics
    if 'topics' in topic and isinstance(topic['topics'], list):
        topic['topics'] = [
            normalize_topic(sub_topic)
            for sub_topic in topic['topics']
        ]

    return topic
```

**Step 4: 运行测试验证通过**

```bash
pytest tests/test_utils.py::test_normalize_labels_to_label -v
pytest tests/test_utils.py::test_normalize_empty_labels -v
```

预期输出: 两个测试都 PASS

**Step 5: 提交代码**

```bash
git add xmind2testcase/utils.py tests/test_utils.py
git commit -m "feat: ✨ implement labels to label mapping in normalize_xmind_data"
```

---

### Task 6: 添加默认字段

**Files:**
- Modify: `xmind2testcase/utils.py` 中的 `normalize_xmind_data()`
- Modify: `tests/test_utils.py`

**Step 1: 编写失败测试 - 默认字段**

```python
# tests/test_utils.py 添加新测试

def test_normalize_default_fields():
    """测试添加默认字段（note, comment, link, id）"""
    input_data = [
        {
            'title': 'Sheet 1',
            'topic': {
                'title': 'Root',
                'topics': [
                    {'title': 'Test Case 1'}
                ]
            }
        }
    ]

    result = normalize_xmind_data(input_data)

    topic = result[0]['topic']['topics'][0]

    # 验证所有默认字段存在
    assert 'note' in topic
    assert topic['note'] is None
    assert 'comment' in topic
    assert topic['comment'] is None
    assert 'link' in topic
    assert topic['link'] is None
    assert 'id' in topic
    assert topic['id'] is None
```

**Step 2: 运行测试验证失败**

```bash
pytest tests/test_utils.py::test_normalize_default_fields -v
```

预期输出: `AssertionError: assert 'note' in topic`

**Step 3: 实现默认字段逻辑**

```python
# xmind2testcase/utils.py 修改 normalize_topic 函数

def normalize_topic(topic: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize a single topic node."""
    if not isinstance(topic, dict):
        return topic

    # 字段映射：makers → markers
    if 'makers' in topic:
        topic['markers'] = topic['makers']

    # 确保 markers 字段存在
    if 'markers' not in topic:
        topic['markers'] = []

    # 字段映射：labels → label
    if 'labels' in topic and isinstance(topic['labels'], list):
        # 取第一个 label，或 None
        topic['label'] = topic['labels'][0] if topic['labels'] else None
    elif 'label' not in topic:
        topic['label'] = None

    # 确保其他必需字段存在
    topic.setdefault('note', None)
    topic.setdefault('comment', None)
    topic.setdefault('link', None)
    topic.setdefault('id', None)

    # 递归处理子 topics
    if 'topics' in topic and isinstance(topic['topics'], list):
        topic['topics'] = [
            normalize_topic(sub_topic)
            for sub_topic in topic['topics']
        ]

    return topic
```

**Step 4: 运行测试验证通过**

```bash
pytest tests/test_utils.py::test_normalize_default_fields -v
```

预期输出: PASS

**Step 5: 提交代码**

```bash
git add xmind2testcase/utils.py tests/test_utils.py
git commit -m "feat: ✨ add default fields to normalized topics"
```

---

### Task 7: 测试嵌套结构处理

**Files:**
- Modify: `tests/test_utils.py`

**Step 1: 编写测试 - 深层嵌套**

```python
# tests/test_utils.py 添加新测试

def test_normalize_deeply_nested_structure():
    """测试深层嵌套结构的处理"""
    input_data = [
        {
            'title': 'Sheet 1',
            'topic': {
                'title': 'Root',
                'topics': [
                    {
                        'title': 'Suite 1',
                        'topics': [
                            {
                                'title': 'Sub-suite 1',
                                'topics': [
                                    {
                                        'title': 'Test Case 1',
                                        'makers': ['priority-2'],
                                        'labels': ['手动']
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        }
    ]

    result = normalize_xmind_data(input_data)

    # 验证深层嵌套的节点也被正确处理
    test_case = result[0]['topic']['topics'][0]['topics'][0]['topics'][0]

    assert test_case['markers'] == ['priority-2']
    assert test_case['label'] == '手动'
    assert test_case['note'] is None
    assert test_case['comment'] is None
```

**Step 2: 运行测试验证通过**

```bash
pytest tests/test_utils.py::test_normalize_deeply_nested_structure -v
```

预期输出: PASS

**Step 3: 提交测试**

```bash
git add tests/test_utils.py
git commit -m "test: ✅ add test for deeply nested structure normalization"
```

---

### Task 8: 测试不修改原始数据

**Files:**
- Modify: `tests/test_utils.py`

**Step 1: 编写测试 - 原始数据不变**

```python
# tests/test_utils.py 添加新测试

def test_normalize_preserves_original_data():
    """测试标准化不修改原始数据"""
    import copy

    input_data = [
        {
            'title': 'Sheet 1',
            'topic': {
                'title': 'Root',
                'topics': [
                    {
                        'title': 'Test Case 1',
                        'makers': ['priority-1']
                    }
                ]
            }
        }
    ]

    # 创建原始数据的深拷贝用于对比
    original_data = copy.deepcopy(input_data)

    # 执行标准化
    result = normalize_xmind_data(input_data)

    # 验证原始数据未被修改
    assert input_data == original_data

    # 验证返回的是新对象
    assert input_data is not result

    # 验证结果包含 markers
    assert result[0]['topic']['topics'][0]['markers'] == ['priority-1']

    # 验证原始数据没有 markers
    assert 'markers' not in input_data[0]['topic']['topics'][0]
```

**Step 2: 运行测试验证通过**

```bash
pytest tests/test_utils.py::test_normalize_preserves_original_data -v
```

预期输出: PASS

**Step 3: 提交测试**

```bash
git add tests/test_utils.py
git commit -m "test: ✅ add test for preserving original data"
```

---

## 阶段 3: 更新 get_xmind_testsuites() 函数

### Task 9: 更新 get_xmind_testsuites() 使用 xmindparser

**Files:**
- Modify: `xmind2testcase/utils.py` 中的 `get_xmind_testsuites()` 函数
- Modify: `tests/test_utils.py`

**Step 1: 编写失败测试 - 文件不存在**

```python
# tests/test_utils.py 添加新测试

def test_get_xmind_testsuites_file_not_found():
    """测试文件不存在时抛出异常"""
    from xmind2testcase.utils import get_xmind_testsuites

    with pytest.raises(FileNotFoundError, match="XMind file not found"):
        get_xmind_testsuites('nonexistent.xmind')

def test_get_xmind_testsuites_invalid_format():
    """测试无效文件格式时抛出异常"""
    from xmind2testcase.utils import get_xmind_testsuites
    import tempfile
    import os

    # 创建一个非 .xmind 文件
    with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as f:
        temp_file = f.name
        f.write(b"invalid content")

    try:
        with pytest.raises(ValueError, match="Invalid file format"):
            get_xmind_testsuites(temp_file)
    finally:
        os.unlink(temp_file)
```

**Step 2: 运行测试验证失败**

```bash
pytest tests/test_utils.py::test_get_xmind_testsuites_file_not_found -v
```

预期输出: 测试失败（当前函数可能返回空列表）

**Step 3: 重构 get_xmind_testsuites() 函数**

```python
# xmind2testcase/utils.py 完整重写 get_xmind_testsuites()

def get_xmind_testsuites(xmind_file: str) -> List[TestSuite]:
    """Load the XMind file and parse to TestSuite list.

    Args:
        xmind_file: Path to the XMind file.

    Returns:
        List of TestSuite objects parsed from the XMind file.

    Raises:
        FileNotFoundError: If the file does not exist.
        ValueError: If the file format is invalid or parsing fails.
    """
    from xmindparser import xmind_to_dict

    xmind_file = get_absolute_path(xmind_file)

    # 文件存在性检查
    if not os.path.exists(xmind_file):
        raise FileNotFoundError(
            f"XMind file not found: {xmind_file}"
        )

    # 文件扩展名检查
    if not xmind_file.lower().endswith('.xmind'):
        raise ValueError(
            f"Invalid file format. Expected .xmind file, got: {xmind_file}"
        )

    logging.info('Parsing XMind file: %s', xmind_file)

    # 解析文件
    try:
        xmind_content_dict = xmind_to_dict(xmind_file)
    except Exception as e:
        raise ValueError(
            f"Failed to parse XMind file: {xmind_file}. "
            f"Error: {str(e)}"
        ) from e

    # 数据验证
    if not xmind_content_dict:
        raise ValueError(
            f"Invalid XMind file: {xmind_file}. "
            "File is empty or contains no valid data."
        )

    # 标准化数据格式
    try:
        xmind_content_dict = normalize_xmind_data(xmind_content_dict)
    except Exception as e:
        raise ValueError(
            f"Failed to normalize XMind data: {str(e)}"
        ) from e

    logging.debug("Normalized XMind data: %s", xmind_content_dict)

    # 解析为 TestSuite 对象
    testsuites = xmind_to_testsuites(xmind_content_dict)

    logging.info('Successfully parsed %d testsuite(s)', len(testsuites))
    return testsuites
```

**Step 4: 运行测试验证通过**

```bash
pytest tests/test_utils.py::test_get_xmind_testsuites_file_not_found -v
pytest tests/test_utils.py::test_get_xmind_testsuites_invalid_format -v
```

预期输出: 两个测试都 PASS

**Step 5: 移除旧的 xmind 导入**

```python
# xmind2testcase/utils.py 在文件开头移除
# import xmind  # <-- 删除这一行
```

**Step 6: 提交代码**

```bash
git add xmind2testcase/utils.py tests/test_utils.py
git commit -m "refactor: ♻️ update get_xmind_testsuites to use xmindparser with strict error handling"
```

---

## 阶段 4: 集成测试

### Task 10: 测试 xmind8 文件解析

**Files:**
- Modify: `tests/test_integration.py`

**Step 1: 编写集成测试**

```python
# tests/test_integration.py
import pytest
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
```

**Step 2: 运行测试验证通过**

```bash
pytest tests/test_integration.py::test_parse_xmind8_file -v
pytest tests/test_integration.py::test_xmind8_to_testcase_list -v
```

预期输出: 两个测试都 PASS

**Step 3: 提交测试**

```bash
git add tests/test_integration.py
git commit -m "test: ✅ add integration tests for xmind8 file parsing"
```

---

### Task 11: 测试 xmind2026 文件解析

**Files:**
- Modify: `tests/test_integration.py`

**Step 1: 编写集成测试**

```python
# tests/test_integration.py 添加新测试

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
```

**Step 2: 运行测试验证通过**

```bash
pytest tests/test_integration.py::test_parse_xmind2026_file -v
pytest tests/test_integration.py::test_xmind2026_to_testcase_list -v
```

预期输出: 两个测试都 PASS

**Step 3: 提交测试**

```bash
git add tests/test_integration.py
git commit -m "test: ✅ add integration tests for xmind2026 file parsing"
```

---

### Task 12: 测试两种格式输出一致性

**Files:**
- Modify: `tests/test_integration.py`

**Step 1: 编写一致性测试**

```python
# tests/test_integration.py 添加新测试

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
```

**Step 2: 运行测试验证通过**

```bash
pytest tests/test_integration.py::test_both_formats_same_output -v
```

预期输出: PASS（如果两个文件内容确实相同）

**Step 3: 提交测试**

```bash
git add tests/test_integration.py
git commit -m "test: ✅ add consistency test for xmind8 and xmind2026 formats"
```

---

### Task 13: 测试 CSV 转换功能

**Files:**
- Modify: `tests/test_integration.py`

**Step 1: 编写 CSV 转换测试**

```python
# tests/test_integration.py 添加新测试

def test_convert_to_csv(xmind8_file, tmp_path):
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
        assert '用例名称' in content or 'TestCase' in content
```

**Step 2: 运行测试验证通过**

```bash
pytest tests/test_integration.py::test_convert_to_csv -v
```

预期输出: PASS

**Step 3: 提交测试**

```bash
git add tests/test_integration.py
git commit -m "test: ✅ add CSV conversion test"
```

---

## 阶段 5: E2E 测试

### Task 14: E2E 测试 - xmind8 完整流程

**Files:**
- Modify: `tests/test_e2e.py`

**Step 1: 编写 E2E 测试**

```python
# tests/test_e2e.py
import pytest
import os
from xmind2testcase.utils import get_xmind_testcase_list
from xmind2testcase.zentao import xmind_to_zentao_csv_file

def test_xmind8_to_zentao_csv(xmind8_file):
    """测试 xmind8 到禅道 CSV 的完整流程"""
    # 步骤 1: 解析测试用例
    testcases = get_xmind_testcase_list(xmind8_file)
    assert len(testcases) > 0

    # 步骤 2: 转换为 CSV
    csv_file = xmind_to_zentao_csv_file(xmind8_file)
    assert os.path.exists(csv_file)

    # 步骤 3: 验证 CSV 文件格式
    with open(csv_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

        # 验证有表头和数据行
        assert len(lines) > 1

        # 验证表头包含必要字段
        header = lines[0]
        assert '用例名称' in header or 'name' in header.lower()

    # 清理生成的 CSV 文件
    if os.path.exists(csv_file):
        os.remove(csv_file)
```

**Step 2: 运行测试验证通过**

```bash
pytest tests/test_e2e.py::test_xmind8_to_zentao_csv -v -s
```

预期输出: PASS

**Step 3: 提交测试**

```bash
git add tests/test_e2e.py
git commit -m "test: ✅ add E2E test for xmind8 to CSV conversion"
```

---

### Task 15: E2E 测试 - xmind2026 完整流程

**Files:**
- Modify: `tests/test_e2e.py`

**Step 1: 编写 E2E 测试**

```python
# tests/test_e2e.py 添加新测试

def test_xmind2026_to_zentao_csv(xmind2026_file):
    """测试 xmind2026 到禅道 CSV 的完整流程"""
    # 步骤 1: 解析测试用例
    testcases = get_xmind_testcase_list(xmind2026_file)
    assert len(testcases) > 0

    # 步骤 2: 转换为 CSV
    csv_file = xmind_to_zentao_csv_file(xmind2026_file)
    assert os.path.exists(csv_file)

    # 步骤 3: 验证 CSV 文件格式
    with open(csv_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()

        # 验证有表头和数据行
        assert len(lines) > 1

        # 验证表头包含必要字段
        header = lines[0]
        assert '用例名称' in header or 'name' in header.lower()

    # 清理生成的 CSV 文件
    if os.path.exists(csv_file):
        os.remove(csv_file)
```

**Step 2: 运行测试验证通过**

```bash
pytest tests/test_e2e.py::test_xmind2026_to_zentao_csv -v -s
```

预期输出: PASS

**Step 3: 提交测试**

```bash
git add tests/test_e2e.py
git commit -m "test: ✅ add E2E test for xmind2026 to CSV conversion"
```

---

## 阶段 6: 依赖更新和文档

### Task 16: 更新 pyproject.toml 依赖

**Files:**
- Modify: `pyproject.toml`

**Step 1: 移除 xmind 依赖**

```bash
# 编辑 pyproject.toml
# 移除这行：
# "xmind>=1.2.0",
```

**Step 2: 添加 xmindparser 依赖**

```bash
# 编辑 pyproject.toml dependencies 部分
dependencies = [
    "xmindparser>=0.1.0",
    "flask>=3.0.0",
    "arrow>=1.0.0",
]
```

**Step 3: 添加开发依赖**

```bash
# 编辑 pyproject.toml
[project.optional-dependencies]
dev = [
    "twine>=5.0.0",
    "build>=0.10.0",
    "pytest>=7.0.0",
    "pytest-cov>=4.0.0",
]
```

**Step 4: 验证依赖安装**

```bash
uv sync
```

预期输出: 依赖安装成功

**Step 5: 运行所有测试验证**

```bash
pytest tests/ -v
```

预期输出: 所有测试 PASS

**Step 6: 提交依赖更新**

```bash
git add pyproject.toml
git commit -m "chore: ⬆️ replace xmind with xmindparser and add test dependencies"
```

---

### Task 17: 更新 README.md

**Files:**
- Modify: `README.md`

**Step 1: 更新依赖说明**

```markdown
## 🚀 快速开始

### 安装

```bash
pip install xmind2testcase
```

升级后，项目使用 **xmindparser** 库，同时支持：
- ✅ XMind 8 及以前版本（XML 格式）
- ✅ XMind 2026 最新版本（JSON 格式）
```

**Step 2: 添加版本支持说明**

```markdown
## ✨ 功能特性

- 🎨 **可视化设计** - 使用 XMind 进行直观的测试用例设计
- 🔄 **多格式转换** - 支持 TestLink XML、禅道 CSV、JSON 格式
- 🌐 **Web 工具** - 提供便捷的 Web 转换界面
- 📊 **执行统计** - 支持测试用例执行结果标识和统计
- 🤖 **自动/手动** - 支持通过标签设置用例类型
- 🌍 **中文支持** - 导出文件完全支持中文显示
- 🔧 **API 集成** - 提供 Python API 便于集成到其他系统
- 🆕 **多版本支持** - 同时支持 XMind 8 和 XMind 2026 文件格式
```

**Step 3: 提交文档更新**

```bash
git add README.md
git commit -m "docs: 📝 update README with xmind2026 support information"
```

---

### Task 18: 创建 CHANGELOG.md

**Files:**
- Create: `CHANGELOG.md`

**Step 1: 创建变更日志文件**

```markdown
# 更新日志

所有重要的项目变更都将记录在此文件中。

## [1.6.0] - 2026-03-03

### 新增
- ✨ 支持 XMind 2026 文件格式（JSON 格式）
- ✨ 同时兼容 XMind 8 及以前版本（XML 格式）
- 🧪 添加完整的测试套件（单元、集成、E2E）
- 📝 添加项目开发文档

### 变更
- ♻️ 底层解析库从 xmind 切换到 xmindparser
- ⚠️ 错误处理更严格：文件不存在或格式错误时抛出异常
- 🔧 改进数据验证和错误提示

### 修复
- 🐛 修复 xmind2026 文件解析乱码问题

### 技术细节
- 添加 `normalize_xmind_data()` 适配器函数处理字段映射
- 字段映射：`makers` → `markers`, `labels` → `label`
- 测试覆盖率达到 80%+

## [1.5.0] - 2024-XX-XX

- 支持通过标签设置用例类型（自动/手动）
- 支持导出文件中文显示
- 增加命令运行指引
- 修复服务器远程部署无法访问问题
- 取消测试用例关键字默认设置

（更多历史版本请查看 git commit 历史）
```

**Step 2: 提交变更日志**

```bash
git add CHANGELOG.md
git commit -m "docs: 📝 add CHANGELOG for v1.6.0 release"
```

---

## 阶段 7: 最终验证和发布

### Task 19: 运行完整测试套件

**Files:**
- None

**Step 1: 运行所有测试并生成覆盖率报告**

```bash
pytest tests/ -v --cov=xmind2testcase --cov-report=html --cov-report=term
```

预期输出:
- 所有测试 PASS
- 覆盖率 ≥ 80%

**Step 2: 检查覆盖率报告**

```bash
open htmlcov/index.html
```

验证覆盖率报告显示 ≥ 80%

**Step 3: 运行代码质量检查**

```bash
# 检查代码风格
python -m flake8 xmind2testcase/ tests/ --max-line-length=100

# 如果没有 flake8，先安装
# pip install flake8
```

预期输出: 无错误或警告

**Step 4: 验证 Web 工具功能**

```bash
# 启动 Web 工具
python -m xmind2testcase.cli webtool

# 在浏览器中访问 http://127.0.0.1:5002
# 上传 xmind2026 文件测试转换功能
```

预期输出: Web 工具正常运行，成功转换文件

**Step 5: 手动验证 CSV 输出**

```bash
# 用 xmind2026 文件生成 CSV
python -m xmind2testcase.cli docs/202602-数据资产v6.4.8\(xmind2026版本\).xmind -csv

# 检查生成的 CSV 文件
cat 202602-数据资产v6.4.8.csv | head -20
```

预期输出: CSV 格式正确，中文显示正常

**Step 6: 提交最终验证**

```bash
git add .
git commit -m "test: ✅ verify all tests pass and coverage meets 80%+ requirement"
```

---

### Task 20: 构建和发布到 PyPI

**Files:**
- None

**Step 1: 更新版本号**

```bash
# 编辑 pyproject.toml
version = "1.6.0"
```

**Step 2: 构建项目**

```bash
uv build
```

预期输出: 构建成功，生成 dist/ 目录

**Step 3: 检查构建产物**

```bash
ls -lh dist/
```

预期输出: 看到 `.tar.gz` 和 `.whl` 文件

**Step 4: 发布到 PyPI（测试环境）**

```bash
# 先发布到测试 PyPI 验证
uv publish --index https://test.pypi.org/simple/
```

**Step 5: 从测试 PyPI 安装验证**

```bash
pip install --index-url https://test.pypi.org/simple/ xmind2testcase==1.6.0
```

**Step 6: 发布到正式 PyPI**

```bash
uv publish
```

预期输出: 发布成功

**Step 7: 验证正式发布**

```bash
pip install xmind2testcase==1.6.0
```

**Step 8: 创建 Git 标签**

```bash
git tag v1.6.0
git push origin v1.6.0
```

**Step 9: 在 GitHub 创建 Release**

1. 访问 GitHub 仓库页面
2. 点击 "Releases" → "Draft a new release"
3. 标签选择 `v1.6.0`
4. 发布标题：`v1.6.0 - XMind2026 Support`
5. 发布内容复制 CHANGELOG.md 中的 v1.6.0 部分
6. 点击 "Publish release"

---

## 验收检查清单

在宣布任务完成前，确保以下所有项目都已完成：

### 功能验收
- [ ] 能够成功解析 xmind8 版本文件
- [ ] 能够成功解析 xmind2026 版本文件
- [ ] 两种格式文件转换后的测试用例内容语义一致
- [ ] CSV 转换功能正常
- [ ] JSON 转换功能正常
- [ ] Web 工具功能正常

### 测试验收
- [ ] 所有单元测试通过（14+ 个）
- [ ] 所有集成测试通过（6+ 个）
- [ ] 所有 E2E 测试通过（2+ 个）
- [ ] 测试覆盖率 ≥ 80%
- [ ] 代码质量检查通过（flake8）

### 文档验收
- [ ] README.md 已更新
- [ ] CHANGELOG.md 已创建
- [ ] 设计文档已保存到 `docs/plans/`
- [ ] 实施计划已保存到 `docs/plans/`

### 错误处理验收
- [ ] 文件不存在时抛出 FileNotFoundError
- [ ] 无效格式时抛出 ValueError
- [ ] 空数据时抛出 ValueError
- [ ] 所有错误信息清晰明确

### 性能验收
- [ ] 解析速度合理（< 5秒 for 10MB 文件）
- [ ] 内存占用合理（< 200MB）

### 发布验收
- [ ] pyproject.toml 版本号已更新
- [ ] 项目已构建成功
- [ ] 已发布到 PyPI
- [ ] Git 标签已创建
- [ ] GitHub Release 已创建

---

## 参考资源

- **设计文档**: `docs/plans/2026-03-03-xmind2026-support-design.md`
- **xmindparser GitHub**: https://github.com/tobyqin/xmindparser
- **测试文件**:
  - `docs/202602-数据资产v6.4.8(xmind8版本).xmind`
  - `docs/202602-数据资产v6.4.8(xmind2026版本).xmind`
  - `docs/202602-数据资产v6.4.8(xmind8版本).csv`

---

## 重要提醒

**TDD 原则**: 必须先写测试，再写实现代码。每个任务都遵循：
1. 编写失败测试
2. 运行测试确认失败
3. 编写最小实现
4. 运行测试确认通过
5. 提交代码

**频繁提交**: 每个小功能完成后立即提交，保持提交历史清晰。

**错误处理**: 严格模式，始终抛出明确的异常，不静默失败。

**代码质量**: 符合 PEP 8 规范，添加类型注解和文档字符串。

---

**总任务数**: 20
**预计时间**: 7-10 小时
**测试数量**: 22+ 个
**目标覆盖率**: 80%+
