# 文档系统更新实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 系统性更新项目文档（README、CHANGELOG、api/README），建立 CI 检查机制，确保文档与代码保持同步。

**架构:** 采用最小化更新策略，修复现有文档问题并创建自动化检查脚本，通过 GitHub Actions 在 PR 时自动检查文档一致性。

**技术栈:** Markdown、Python 3.12、GitHub Actions、toml

---

## Task 1: 修复 README.md - 删除重复内容

**Files:**
- Modify: `README.md:157-277`

**Step 1: 备份原文件**

```bash
cp README.md README.md.backup
```

**Step 2: 删除重复的"快速开始"部分**

删除第 157-277 行的重复内容（从第二个"## 🚀 快速开始"到"### 2️⃣ Web 界面"之前）

**Step 3: 验证文件结构**

```bash
grep -n "## 🚀 快速开始" README.md
```

Expected: 只出现一次（应该在第 18 行左右）

**Step 4: 提交更改**

```bash
git add README.md
git commit -m "docs: 删除 README.md 中重复的快速开始部分"
```

---

## Task 2: 修复 README.md - 全局替换包名

**Files:**
- Modify: `README.md`

**Step 1: 查找所有旧包名出现位置**

```bash
grep -n "xmind2testcase" README.md
```

Expected: 找到多处（命令行示例、导入语句等）

**Step 2: 全局替换**

```bash
sed -i '' 's/xmind2testcase/xmind2cases/g' README.md
```

**Step 3: 验证替换结果**

```bash
grep -c "xmind2testcase" README.md
```

Expected: 0

```bash
grep -c "xmind2cases" README.md
```

Expected: > 0

**Step 4: 提交更改**

```bash
git add README.md
git commit -m "docs: 统一包名为 xmind2cases"
```

---

## Task 3: 更新 README.md - 版本号和新功能

**Files:**
- Modify: `README.md`

**Step 1: 找到版本号显示位置**

```bash
grep -n "v1.5.0" README.md
grep -n "更新日志" README.md
```

**Step 2: 更新版本号显示**

在 "更新日志" 部分将 "v1.5.0 (最新)" 改为 "v1.6.1 (最新)"

**Step 3: 添加 Windows 脚本说明**

在"一键启动"部分的"Windows 用户"下补充：

```markdown
**✨ 脚本会自动:**
- ✅ 检测并安装 [uv](https://github.com/astral-sh/uv)（极速 Python 包管理器）
- ✅ 同步项目依赖
- ✅ 检测端口占用并提供交互式选项
- ✅ 启动 Web 工具（http://localhost:5002）
```

**Step 4: 更新功能特性列表**

在"功能特性"部分添加：

```markdown
- 🔍 **智能检测** - 端口占用自动检测并提供交互式解决方案
- 🎨 **现代化 UI** - 图标化操作、紧凑布局、长文件名智能截断
- 🪟 **跨平台支持** - 提供 Windows、macOS、Linux 一键启动脚本
```

**Step 5: 提交更改**

```bash
git add README.md
git commit -m "docs: 更新版本号至 v1.6.1 并补充新功能说明"
```

---

## Task 4: 重构 CHANGELOG.md

**Files:**
- Modify: `CHANGELOG.md`

**Step 1: 备份原文件**

```bash
cp CHANGELOG.md CHANGELOG.md.backup
```

**Step 2: 清理 [Unreleased] 部分**

将 [Unreleased] 部分的内容移除或合并到 v1.6.1

**Step 3: 添加 v1.6.1 版本记录**

在 [Unreleased] 后添加：

```markdown
## [1.6.1] - 2026-03-04

### Added
- ✨ 支持 Windows 一键启动（init.bat/init.ps1）
- ✨ 端口占用检测和交互式处理
- ✨ UI 优化：图标化操作、紧凑布局、长文件名智能截断

### Changed
- 🔄 包名从 xmind2testcase 重命名为 xmind2cases
- 📝 优化文档结构，删除重复内容

### Fixed
- 🐛 修复禅道 CSV 导出格式问题：所有字段用双引号包裹
- 🐛 修复前置条件中的换行符转换为 `<br>` 标签
```

**Step 4: 清理重复内容**

删除 v1.6.0 中重复的"新增/变更/修复"部分

**Step 5: 验证格式**

```bash
grep -n "## \[" CHANGELOG.md | head -5
```

Expected: 版本号按降序排列

**Step 6: 提交更改**

```bash
git add CHANGELOG.md
git commit -m "docs: 重构 CHANGELOG.md，添加 v1.6.1 版本记录"
```

---

## Task 5: 简化 api/README.md

**Files:**
- Modify: `api/README.md`

**Step 1: 审查现有内容**

```bash
wc -l api/README.md
```

**Step 2: 简化技术栈说明**

只保留关键信息：
- FastAPI 0.115+
- SQLAlchemy 2.0 (async)
- Pydantic v2

**Step 3: 删除冗余目录结构**

删除详细的目录结构说明，保留简单的端点列表

**Step 4: 添加快速开始示例**

在文档开头添加：

```markdown
## 快速开始

### 启动服务

```bash
# 开发环境
uvicorn api.main:app --reload

# 生产环境
uvicorn api.main:app --host 0.0.0.0 --workers 4
```

### 访问文档

启动后访问：
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
```

**Step 5: 提交更改**

```bash
git add api/README.md
git commit -m "docs: 简化 API 文档结构"
```

---

## Task 6: 创建文档检查脚本

**Files:**
- Create: `scripts/check_docs.py`

**Step 1: 创建 scripts 目录**

```bash
mkdir -p scripts
```

**Step 2: 编写检查脚本**

创建 `scripts/check_docs.py`:

```python
#!/usr/bin/env python3
"""文档一致性检查脚本"""

import sys
from pathlib import Path


def check_readme():
    """检查 README.md 中的包名一致性"""
    readme = Path("README.md")

    if not readme.exists():
        print("❌ README.md 文件不存在")
        return False

    content = readme.read_text(encoding='utf-8')

    # 不应出现旧的包名
    if "xmind2testcase" in content:
        print("❌ README.md 中包含旧包名 'xmind2testcase'")
        # 显示出现位置
        lines = content.split('\n')
        for i, line in enumerate(lines, 1):
            if 'xmind2testcase' in line:
                print(f"   第 {i} 行: {line.strip()}")
        return False

    # 应包含新包名
    if "xmind2cases" not in content:
        print("❌ README.md 中缺少包名 'xmind2cases'")
        return False

    print("✅ README.md 包名检查通过")
    return True


def check_changelog_version():
    """检查 CHANGELOG 与 pyproject.toml 版本匹配"""
    try:
        import toml
    except ImportError:
        print("⚠️  跳过版本检查（toml 未安装，运行: pip install toml）")
        return True

    pyproject_path = Path("pyproject.toml")
    changelog_path = Path("CHANGELOG.md")

    if not pyproject_path.exists():
        print("❌ pyproject.toml 文件不存在")
        return False

    if not changelog_path.exists():
        print("❌ CHANGELOG.md 文件不存在")
        return False

    pyproject = toml.load(pyproject_path)
    version = pyproject["project"]["version"]

    changelog = changelog_path.read_text(encoding='utf-8')

    # 检查最新版本是否在 CHANGELOG 中
    if f"[{version}]" not in changelog:
        print(f"❌ CHANGELOG.md 中缺少版本 [{version}]")
        print(f"   pyproject.toml 版本: {version}")
        # 显示 CHANGELOG 中的版本
        import re
        versions = re.findall(r'\[(\d+\.\d+\.\d+)\]', changelog)
        if versions:
            print(f"   CHANGELOG 最新版本: {versions[0]}")
        return False

    print(f"✅ CHANGELOG.md 版本 {version} 检查通过")
    return True


def check_no_duplicate_quick_start():
    """检查 README 中没有重复的快速开始部分"""
    readme = Path("README.md")
    content = readme.read_text(encoding='utf-8')

    count = content.count("## 🚀 快速开始")
    if count > 1:
        print(f"❌ README.md 中 '快速开始' 部分重复 {count} 次")
        return False

    print("✅ README.md 无重复内容检查通过")
    return True


def main():
    """主函数"""
    print("=" * 50)
    print("🔍 文档一致性检查")
    print("=" * 50)

    all_passed = True

    all_passed &= check_readme()
    all_passed &= check_changelog_version()
    all_passed &= check_no_duplicate_quick_start()

    print("=" * 50)
    if all_passed:
        print("✅ 所有文档检查通过")
        print("=" * 50)
        return 0
    else:
        print("❌ 文档检查失败")
        print("=" * 50)
        return 1


if __name__ == "__main__":
    sys.exit(main())
```

**Step 3: 添加执行权限**

```bash
chmod +x scripts/check_docs.py
```

**Step 4: 测试脚本**

```bash
python scripts/check_docs.py
```

Expected: 通过所有检查

**Step 5: 提交更改**

```bash
git add scripts/check_docs.py
git commit -m "feat: 添加文档一致性检查脚本"
```

---

## Task 7: 创建 GitHub Actions 工作流

**Files:**
- Create: `.github/workflows/doc-check.yml`

**Step 1: 创建 .github/workflows 目录**

```bash
mkdir -p .github/workflows
```

**Step 2: 编写工作流配置**

创建 `.github/workflows/doc-check.yml`:

```yaml
name: Documentation Check

on:
  pull_request:
    paths:
      - 'README.md'
      - 'CHANGELOG.md'
      - 'api/README.md'
      - 'pyproject.toml'
  push:
    paths:
      - 'README.md'
      - 'CHANGELOG.md'
      - 'api/README.md'
      - 'pyproject.toml'

jobs:
  doc-check:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          pip install toml

      - name: Run documentation checks
        run: |
          python scripts/check_docs.py

      - name: Upload result
        if: always()
        run: |
          echo "Documentation check completed"
```

**Step 3: 验证 YAML 语法**

```bash
python -c "import yaml; yaml.safe_load(open('.github/workflows/doc-check.yml'))"
```

Expected: 无错误

**Step 4: 提交更改**

```bash
git add .github/workflows/doc-check.yml
git commit -m "ci: 添加文档检查 CI 工作流"
```

---

## Task 8: 完整测试和验证

**Files:**
- Test: 所有文档文件

**Step 1: 运行文档检查脚本**

```bash
python scripts/check_docs.py
```

Expected: ✅ 所有文档检查通过

**Step 2: 本地预览 README**

```bash
# 如果安装了 glow
glow README.md

# 或使用 VS Code 预览
code README.md
```

**Step 3: 检查所有版本号**

```bash
echo "=== pyproject.toml ==="
grep "^version" pyproject.toml

echo -e "\n=== CHANGELOG.md ==="
grep "## \[" CHANGELOG.md | head -3

echo -e "\n=== README.md ==="
grep "更新日志" -A 2 README.md | head -5
```

Expected: 所有版本号一致

**Step 4: 检查包名一致性**

```bash
echo "=== 检查旧包名 ==="
grep -r "xmind2testcase" --include="*.md" . || echo "✅ 无旧包名"

echo -e "\n=== 检查新包名 ==="
grep -r "xmind2cases" --include="*.md" . | wc -l
```

Expected: 旧包名为 0，新包名 > 0

**Step 5: 创建测试 PR（可选）**

```bash
git checkout -b test/documentation-update
git push origin test/documentation-update
```

然后在 GitHub 上创建 PR，验证 CI 工作流

**Step 6: 清理测试分支**

```bash
git checkout main
git branch -D test/documentation-update
```

---

## Task 9: 更新开发文档（可选）

**Files:**
- Create: `docs/DOCUMENTATION.md`

**Step 1: 创建文档维护指南**

创建 `docs/DOCUMENTATION.md`:

```markdown
# 文档维护指南

## 原则

- **Keep It Simple** - 简洁实用，重点突出
- **同步更新** - 代码变更时同步更新文档
- **版本一致** - 确保所有文档版本号一致

## 检查清单

### 发布前

- [ ] 更新 CHANGELOG.md
- [ ] 更新 README.md 版本号
- [ ] 更新 pyproject.toml 版本号
- [ ] 运行 `python scripts/check_docs.py`

### 提交 PR 时

- [ ] 如果是新功能，更新功能特性列表
- [ ] 如果是 Bug 修复，记录到 CHANGELOG
- [ ] 如果有新增命令，更新使用指南

## 自动检查

项目使用 GitHub Actions 自动检查文档一致性：

- 包名一致性
- 版本号匹配
- 重复内容检测

如果检查失败，PR 将无法合并。
```

**Step 2: 提交更改**

```bash
git add docs/DOCUMENTATION.md
git commit -m "docs: 添加文档维护指南"
```

---

## Task 10: 最终提交和发布

**Files:**
- Git operations

**Step 1: 查看所有更改**

```bash
git status
git log --oneline -10
```

**Step 2: 运行完整测试**

```bash
# 文档检查
python scripts/check_docs.py

# 如果有其他测试
pytest tests/ -v
```

**Step 3: 合并所有更改到 main**

```bash
git checkout main
git merge --no-ff -
```

**Step 4: 推送到远程**

```bash
git push origin main
```

**Step 5: 创建发布标签（可选）**

```bash
# 更新 pyproject.toml 版本到 1.6.2
# 然后创建标签
git tag -a v1.6.2 -m "Release v1.6.2: 文档系统更新"
git push origin v1.6.2
```

---

## 验收标准

完成所有任务后，验证以下标准：

### 功能验收

- [ ] README.md 中不包含 `xmind2testcase`
- [ ] README.md 版本号显示为 v1.6.1
- [ ] CHANGELOG.md 包含完整的 v1.6.1 记录
- [ ] CHANGELOG.md 版本号与 pyproject.toml 匹配
- [ ] `python scripts/check_docs.py` 可以正常运行且通过
- [ ] CI 工作流配置正确

### 质量验收

- [ ] 文档简洁明了，符合"Keep It Simple"原则
- [ ] 新用户可以在 5 分钟内完成安装
- [ ] 所有 commit message 清晰规范
- [ ] 无语法错误和格式问题

---

## 故障排查

### 问题: 脚本执行权限被拒绝

**解决:**
```bash
chmod +x scripts/check_docs.py
```

### 问题: toml 模块未安装

**解决:**
```bash
pip install toml
```

### 问题: CI 工作流不触发

**解决:**
检查 `.github/workflows/doc-check.yml` 路径和语法
确认 PR 修改了文档文件

### 问题: 版本号不匹配

**解决:**
手动同步版本号：
```bash
# 更新 pyproject.toml
vim pyproject.toml

# 更新 CHANGELOG.md
vim CHANGELOG.md
```

---

## 参考资料

- 设计文档: `docs/plans/2026-03-04-documentation-update-design.md`
- 项目仓库: https://github.com/koco-co/xmind2cases
- GitHub Actions 文档: https://docs.github.com/en/actions

---

**实施状态:** 待执行
**预计时间:** 2.5 小时
**风险等级:** 低
