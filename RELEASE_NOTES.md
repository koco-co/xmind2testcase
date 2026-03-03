# 发布准备检查清单

**日期:** 2026-03-03
**版本:** 1.6.0
**状态:** ⚠️ 准备就绪，需要确认

---

## ✅ 已完成的工作

### 1. 项目重命名
- [x] 包名更新: xmind2testcase → xmind2cases
- [x] Python 版本提升: 3.8 → 3.12.12
- [x] 构建后端切换: setuptools → hatchling
- [x] URLs 更新为 koco-co/xmind2cases

### 2. 文档更新
- [x] README.md - 全局替换和快速启动章节
- [x] CHANGELOG.md - v1.6.0 详细记录
- [x] .gitignore - 现代化模式
- [x] TESTING.md - 测试验证报告

### 3. init.sh 脚本（687 行，26 个函数）
- [x] 环境检查（OS、Python、uv）
- [x] 项目清理
- [x] 工具安装（ruff、pyright、pre-commit）
- [x] 环境配置（虚拟环境、依赖）
- [x] 测试验证（pytest、XMind 转换）
- [x] 代码质量检查（ruff、pyright）
- [x] Web 工具启动
- [x] 完整发布流程

### 4. Git 提交
- [x] 16 个功能提交
- [x] 清晰的提交信息
- [x] 所有更改已提交

### 5. 配置文件
- [x] pyproject.toml - 完全更新
- [x] .pre-commit-config.yaml - 新建
- [x] .gitignore - 优化
- [x] 删除过时文件（pytest.ini, requirements.txt, samples.py）

---

## ⚠️ 发布前确认

### 1. 标签状态
```
当前标签: v1.6.0 已存在
```

**选项:**
- A) 删除现有 v1.6.0 标签，重新发布
- B) 创建新版本 v1.6.1
- C) 仅推送到 GitHub，不创建新标签

### 2. Python 版本
```
系统版本: 3.9.6
要求版本: 3.12.12+
```

**状态:** ⚠️ 当前环境 Python 版本过低

**建议:**
- 在有 Python 3.12.12+ 的环境中测试
- 或依赖 uv 自动安装 Python 3.12

### 3. PyPI 令牌
```bash
echo $UV_PUBLISH_TOKEN
```

**状态:** ❓ 未验证

**要求:** 需要设置 `UV_PUBLISH_TOKEN` 环境变量

### 4. GitHub CLI
```bash
gh auth status
```

**状态:** ❓ 未验证

**要求:** 需要安装并认证 GitHub CLI

---

## 📋 发布步骤（如果确认发布）

### 选项 A: 删除并重新创建 v1.6.0

```bash
# 1. 删除本地标签
git tag -d v1.6.0

# 2. 删除远程标签
git push koco :refs/tags/v1.6.0

# 3. 设置 PyPI 令牌
export UV_PUBLISH_TOKEN='pypi-...'

# 4. 执行发布
./init.sh --release
```

### 选项 B: 创建新版本 v1.6.1

```bash
# 1. 更新 pyproject.toml
# version = "1.6.1"

# 2. 更新 CHANGELOG.md
# ## [1.6.1] - 2026-03-03
# ### Fixed
# - Improve init.sh robustness
# - Add comprehensive testing

# 3. 提交更改
git add pyproject.toml CHANGELOG.md
git commit -m "bump: version 1.6.1"

# 4. 执行发布
./init.sh --release
```

### 选项 C: 仅推送代码

```bash
# 推送到 GitHub（不发布到 PyPI）
git push koco main
```

---

## 🎯 推荐方案

**建议使用选项 B（创建 v1.6.1）**，原因：
1. v1.6.0 标签已存在，避免冲突
2. 包含了所有 init.sh 的改进
3. 版本号递进，符合语义化版本规范
4. CHANGELOG 可以记录更详细的改进

---

## 📊 发布后验证

### PyPI 验证
```bash
pip install xmind2cases==1.6.1
python -c "import xmind2testcase; print('✓ Import successful')"
```

### GitHub Release 验证
```bash
gh release view v1.6.1
```

### 功能验证
```bash
git clone https://github.com/koco-co/xmind2cases.git
cd xmind2cases
./init.sh --no-webtool
```

---

## 💬 需要用户确认

1. **选择发布选项:** A / B / C
2. **确认 Python 环境:** 已有 Python 3.12.12+ 或依赖 uv 自动安装
3. **PyPI 令牌:** 已设置 UV_PUBLISH_TOKEN
4. **GitHub CLI:** 已安装并认证 gh

---

## 📝 总结

- ✅ 所有开发工作已完成
- ✅ 代码质量良好
- ✅ 文档齐全
- ⚠️ 等待用户确认发布方案
- ⚠️ 等待环境准备就绪

**准备状态:** 90% 完成
**阻塞项:** 用户确认、Python 版本、PyPI 令牌
