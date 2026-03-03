# 禅道 CSV 格式化修复实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 修复禅道 CSV 导出功能的三个格式化问题（双引号包裹、前置条件换行、步骤换行）

**架构:** 采用最小修改方案，仅修改 `xmind2testcase/zentao.py` 文件的 4 处关键位置

**技术栈:** Python 3.12+、csv 模块、pytest

---

## 前置准备

### Task 0: 验证测试环境

**Files:**
- Check: `docs/test.xmind`
- Check: `docs/test_expect.csv`
- Check: `xmind2testcase/zentao.py`

**Step 1: 激活虚拟环境**

```bash
source .venv/bin/activate
```

**Step 2: 验证测试文件存在**

```bash
ls -la docs/test.xmind docs/test_expect.csv
```

Expected: 两个文件都存在

**Step 3: 生成当前 CSV 输出作为基线**

```bash
python -m xmind2testcase.cli docs/test.xmind -csv
```

Expected: 在 `docs/` 目录生成 `test.csv` 文件

**Step 4: 对比当前输出与期望输出**

```bash
diff docs/test.csv docs/test_expect.csv
```

Expected: 显示差异（验证问题确实存在）

---

## 修改 1: 启用 CSV 全字段引号包裹

### Task 1: 修改 CSV Writer 配置

**Files:**
- Modify: `xmind2testcase/zentao.py:44-46`

**Step 1: 查看当前代码**

```bash
sed -n '44,46p' xmind2testcase/zentao.py
```

Expected: 显示 `writer = csv.writer(f)`

**Step 2: 修改 CSV writer 配置**

将第 45 行：
```python
writer = csv.writer(f)
```

修改为：
```python
writer = csv.writer(f, quoting=csv.QUOTE_ALL)
```

**Step 3: 验证语法**

```bash
python -m py_compile xmind2testcase/zentao.py
```

Expected: 无语法错误

**Step 4: 生成新的 CSV 输出**

```bash
python -m xmind2testcase.cli docs/test.xmind -csv
```

**Step 5: 检查双引号包裹**

```bash
head -2 docs/test.csv
```

Expected: 所有字段都被双引号包裹，如 `"test02(#10190)","test_Prefix ❯ 验证xxx",...`

**Step 6: 提交修改**

```bash
git add xmind2testcase/zentao.py
git commit -m "fix: 🐛 enable QUOTE_ALL for CSV writer to wrap all fields in quotes"
```

---

## 修改 2: 前置条件换行符转换

### Task 2: 修改前置条件处理逻辑

**Files:**
- Modify: `xmind2testcase/zentao.py:64`

**Step 1: 查看当前前置条件处理代码**

```bash
sed -n '64p' xmind2testcase/zentao.py
```

Expected: 显示 `case_precondition = testcase_dict['preconditions']`

**Step 2: 修改前置条件换行符处理**

将第 64 行：
```python
case_precondition = testcase_dict['preconditions']
```

修改为：
```python
case_precondition = testcase_dict['preconditions'].replace('\n', '<br>')
```

**Step 3: 验证语法**

```bash
python -m py_compile xmind2testcase/zentao.py
```

Expected: 无语法错误

**Step 4: 生成新的 CSV 输出**

```bash
python -m xmind2testcase.cli docs/test.xmind -csv
```

**Step 5: 检查前置条件格式**

```bash
grep "前置条件" docs/test.csv
```

Expected: 前置条件中的换行符被 `<br>` 替换，如 `"1) test03<br>2) test04<br>3) test05"`

**Step 6: 提交修改**

```bash
git add xmind2testcase/zentao.py
git commit -m "fix: 🐛 replace newlines with <br> in preconditions for Zentao CSV"
```

---

## 修改 3: 步骤换行保留

### Task 3: 修改步骤换行处理逻辑

**Files:**
- Modify: `xmind2testcase/zentao.py:111`

**Step 1: 查看当前步骤处理代码**

```bash
sed -n '111p' xmind2testcase/zentao.py
```

Expected: 显示 `actions = step_dict['actions'].replace('\n', '').strip()`

**Step 2: 修改步骤换行处理**

将第 111 行：
```python
actions = step_dict['actions'].replace('\n', '').strip()
```

修改为：
```python
actions = step_dict['actions'].strip()
```

**Step 3: 验证语法**

```bash
python -m py_compile xmind2testcase/zentao.py
```

Expected: 无语法错误

**Step 4: 生成新的 CSV 输出**

```bash
python -m xmind2testcase.cli docs/test.xmind -csv
```

**Step 5: 检查步骤格式**

```bash
grep -A 5 "步骤" docs/test.csv
```

Expected: 步骤中的换行符正确保留，每个步骤在新行显示

**Step 6: 提交修改**

```bash
git add xmind2testcase/zentao.py
git commit -m "fix: 🐛 preserve newlines in test steps for Zentao CSV"
```

---

## 验证与测试

### Task 4: 回归测试

**Files:**
- Test: `docs/test.xmind`
- Expected: `docs/test_expect.csv`

**Step 1: 生成最终 CSV 输出**

```bash
python -m xmind2testcase.cli docs/test.xmind -csv
```

**Step 2: 对比输出与期望文件**

```bash
diff -u docs/test_expect.csv docs/test.csv
```

Expected: 无差异输出（文件完全一致）

**Step 3: 如果有差异，查看具体差异**

```bash
diff docs/test_expect.csv docs/test.csv
```

**Step 4: 验证其他格式输出正常（XML）**

```bash
python -m xmind2testcase.cli docs/test.xmind -xml
ls -la docs/test.xml
```

Expected: XML 文件成功生成

**Step 5: 验证其他格式输出正常（JSON）**

```bash
python -m xmind2testcase.cli docs/test.xmind -json
ls -la docs/test.json
```

Expected: JSON 文件成功生成

**Step 6: 运行单元测试**

```bash
pytest tests/ -v
```

Expected: 所有测试通过

---

### Task 5: 边界情况测试

**Files:**
- Create: `tests/test_zentao_edge_cases.py` (可选)

**Step 1: 测试空前置条件**

```bash
# 创建包含空前置条件的测试用例
# 验证不会报错
python -c "
from xmind2testcase.zentao import gen_a_testcase_row
testcase = {
    'name': 'Test',
    'suite': 'Module',
    'preconditions': '',
    'steps': [],
    'importance': 2,
    'execution_type': 1
}
row = gen_a_testcase_row(testcase)
print('Empty precondition test passed')
"
```

Expected: 无报错，输出 "Empty precondition test passed"

**Step 2: 测试多个连续换行符**

```bash
python -c "
text = 'Line1\n\n\nLine2'
result = text.replace('\n', '<br>')
print(result)
assert result == 'Line1<br><br><br>Line2'
print('Multiple newlines test passed')
"
```

Expected: 输出 "Line1<br><br><br>Line2" 和 "Multiple newlines test passed"

**Step 3: 测试已有 <br> 标签**

```bash
python -c "
text = 'Line1<br>Line2\nLine3'
result = text.replace('\n', '<br>')
print(result)
assert '<br><br>' in result
print('Existing <br> tag test passed')
"
```

Expected: 原有的 `<br>` 和新的 `<br>` 都被保留

---

## 文档更新

### Task 6: 更新 CHANGELOG

**Files:**
- Modify: `CHANGELOG.md` (如果存在)

**Step 1: 检查是否存在 CHANGELOG**

```bash
ls -la CHANGELOG.md
```

**Step 2: 如果存在，添加更新条目**

在文件顶部添加：

```markdown
## [Unreleased]

### Fixed
- 🐛 修复禅道 CSV 导出格式问题：所有字段现在用双引号包裹
- 🐛 修复前置条件中的换行符现在转换为 `<br>` 标签
- 🐛 修复测试步骤中的换行符现在正确保留
```

**Step 3: 提交文档更新**

```bash
git add CHANGELOG.md
git commit -m "docs: 📝 update CHANGELOG for Zentao CSV format fixes"
```

---

## 最终验证

### Task 7: 完整流程验证

**Files:**
- Test: `docs/test.xmind`

**Step 1: 清理旧的输出文件**

```bash
rm -f docs/test.csv docs/test.xml docs/test.json
```

**Step 2: 生成所有格式输出**

```bash
python -m xmind2testcase.cli docs/test.xmind
```

**Step 3: 验证所有输出文件存在**

```bash
ls -la docs/test.csv docs/test.xml docs/test.json
```

Expected: 三个文件都成功生成

**Step 4: 最终 CSV 格式验证**

```bash
cat docs/test.csv
```

Expected:
- 所有字段用双引号包裹
- 前置条件使用 `<br>` 替代换行
- 步骤换行正确显示

**Step 5: 对比验证**

```bash
diff docs/test.csv docs/test_expect.csv
```

Expected: 无差异

**Step 6: 运行完整测试套件**

```bash
pytest tests/ -v --cov=xmind2testcase
```

Expected: 所有测试通过，覆盖率 >= 80%

---

## 提交与发布

### Task 8: 创建 Pull Request

**Step 1: 推送到远程分支**

```bash
git push origin main
```

**Step 2: 创建 Pull Request**

在 GitHub 上创建 PR，标题：`fix: 🐛 fix Zentao CSV export format issues`

**PR 描述模板：**

```markdown
## 修复的问题
- 所有字段现在用双引号包裹（符合禅道 CSV 导入格式）
- 前置条件中的换行符转换为 `<br>` 标签
- 测试步骤中的换行符正确保留

## 修改的文件
- `xmind2testcase/zentao.py` - 4 处关键修改

## 测试
- ✅ 回归测试：`docs/test.csv` 与 `docs/test_expect.csv` 完全一致
- ✅ 边界测试：空前置条件、多换行符、已有 `<br>` 标签
- ✅ 其他格式：XML、JSON 输出正常
- ✅ 单元测试：所有测试通过

## 截图
（添加 CSV 导入禅道成功的截图）

## Checklist
- [x] 代码符合项目规范
- [x] 所有测试通过
- [x] 文档已更新
- [x] 无副作用（其他格式不受影响）
```

---

## 完成检查清单

- [ ] Task 0: 测试环境验证完成
- [ ] Task 1: CSV Writer 配置修改完成
- [ ] Task 2: 前置条件换行符修改完成
- [ ] Task 3: 步骤换行保留修改完成
- [ ] Task 4: 回归测试通过
- [ ] Task 5: 边界情况测试通过
- [ ] Task 6: 文档更新完成
- [ ] Task 7: 完整流程验证通过
- [ ] Task 8: Pull Request 创建完成

---

## 预期成果

修复后，`docs/test.xmind` 转换生成的 `test.csv` 将与 `docs/test_expect.csv` 完全一致，可以直接导入禅道系统，无需手动调整格式。

**关键验证点：**
1. ✅ 所有字段用双引号包裹
2. ✅ 前置条件：`"1) test03<br>2) test04<br>3) test05"`
3. ✅ 步骤换行正确显示（每个步骤占一行）
4. ✅ 预期结果格式保持不变
