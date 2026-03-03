# 项目初始化脚本实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 创建一个一键式项目初始化脚本，支持环境配置、测试验证和发布流程

**架构:** 使用 Bash 脚本实现，通过模块化函数组织代码，使用 Rich 库美化终端输出，uv 管理 Python 环境

**技术栈:** Bash, Python 3.12.12+, uv, ruff, pyright, pre-commit, rich

---

## 前置准备

### Task 0: 更新项目配置

**目标:** 将项目名称从 xmind2testcase 更新为 xmind2cases，并升级 Python 版本要求

**Files:**
- Modify: `pyproject.toml`
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Step 1: 更新 pyproject.toml**

```bash
# 编辑 pyproject.toml，修改以下内容：
# 1. name = "xmind2cases"
# 2. requires-python = ">=3.12.12"
# 3. keywords 中将 "xmind2testCase" 改为 "xmind2cases"
# 4. [project.urls] 中的链接改为 koco-co/xmind2cases
# 5. [project.scripts] 中改为 xmind2cases = "xmind2testcase.cli:cli_main"
# 6. [build-system] 改为 requires = ["hatchling"], build-backend = "hatchling.build"
```

**Step 2: 更新 README.md**

```bash
# 全局替换 xmind2testcase → xmind2cases
# 更新安装命令: pip install xmind2cases
# 更新命令行示例: xmind2cases /path/to/file.xmind
# 添加快速启动章节（见 Step 3）
```

**Step 3: 在 README.md 顶部添加快速启动章节**

```markdown
## 🚀 快速开始

### 一键启动

```bash
# 克隆项目
git clone https://github.com/koco-co/xmind2cases.git
cd xmind2cases

# 一键启动（自动配置环境并启动 Web 工具）
./init.sh
```

**前置要求:**
- Python 3.12.12 或更高版本
- macOS/Linux，或 Windows (WSL/Git Bash)

### 发布流程

```bash
# 完整发布流程（自动测试、构建、发布到 GitHub 和 PyPI）
./init.sh --release
```
```

**Step 4: 更新 CHANGELOG.md**

```bash
# 在文件顶部添加：

## [1.6.0] - 2026-03-03

### Added
- 一键初始化脚本 init.sh，支持环境配置和发布流程
- Python 最低版本提升至 3.12.12
- 集成现代化开发工具：ruff, pyright, pre-commit, rich

### Changed
- 项目重命名为 xmind2cases（原 xmind2testcase）
- 使用 uv 替代 setuptools 进行构建和发布
- 更新所有文档和命令名称

### Removed
- 删除过时的配置文件：pytest.ini, requirements.txt
```

**Step 5: 更新 .gitignore**

```bash
# 在 .gitignore 中添加：

# Build artifacts
*.egg-info/
dist/
build/

# Test artifacts
htmlcov/
.pytest_cache/
.coverage

# Logs
logs/
*.log

# OS files
.DS_Store
Thumbs.db

# IDE
.idea/
.vscode/
*.swp
*.swo
```

**Step 6: 删除过时的文件**

```bash
# 删除以下文件：
rm -f pytest.ini requirements.txt samples.py
rm -rf .venv __pycache__ htmlcov dist *.egg-info
```

**Step 7: Commit**

```bash
git add pyproject.toml README.md CHANGELOG.md .gitignore
git commit -m "chore: 🔄 rename to xmind2cases and update Python version to 3.12.12"
```

---

## 核心脚本实现

### Task 1: 创建 init.sh 主框架

**目标:** 创建脚本的主框架，包含参数解析和主流程

**Files:**
- Create: `init.sh`

**Step 1: 创建脚本文件并添加 shebang**

```bash
cat > init.sh << 'EOF'
#!/bin/bash
# xmind2cases 项目初始化脚本
# 支持: macOS, Linux, Windows (WSL/Git Bash)

set -e  # 遇到错误立即退出
set -u  # 使用未定义变量时退出
set -o pipefail  # 管道命令失败时退出

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 全局变量
RELEASE_MODE=false
NO_WEBTOOL=false
LOG_FILE="init-$(date +%Y%m%d-%H%M%S).log"

# 颜色输出函数
print_step() {
    echo -e "\033[1;34m➜\033[0m \033[1;36m$1\033[0m"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] STEP: $1" >> "$LOG_FILE"
}

print_success() {
    echo -e "\033[1;32m✓\033[0m \033[1;32m$1\033[0m"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> "$LOG_FILE"
}

print_error() {
    echo -e "\033[1;31m✗\033[0m \033[1;31m$1\033[0m" >&2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$LOG_FILE"
}

print_warning() {
    echo -e "\033[1;33m⚠\033[0m \033[1;33m$1\033[0m"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1" >> "$LOG_FILE"
}

print_info() {
    echo -e "  $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" >> "$LOG_FILE"
}

# 参数解析
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --release)
                RELEASE_MODE=true
                shift
                ;;
            --no-webtool)
                NO_WEBTOOL=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                print_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 显示帮助信息
show_help() {
    cat << EOF
xmind2cases 项目初始化脚本

用法:
  ./init.sh [选项]

选项:
  --release       启用发布模式（测试、构建、发布到 GitHub 和 PyPI）
  --no-webtool    仅配置环境，不启动 Web 工具
  --help          显示此帮助信息

示例:
  ./init.sh                # 配置环境并启动 Web 工具
  ./init.sh --no-webtool   # 仅配置环境
  ./init.sh --release      # 完整发布流程

环境要求:
  - Python 3.12.12 或更高版本
  - macOS/Linux，或 Windows (WSL/Git Bash)

发布模式环境变量:
  - UV_PUBLISH_TOKEN    PyPI 发布令牌（必需）
EOF
}

# 主函数
main() {
    parse_arguments "$@"

    echo ""
    print_step "xmind2cases 项目初始化"
    echo ""

    if [[ "$RELEASE_MODE" == "true" ]]; then
        release_flow
    else
        dev_flow
    fi
}

# 开发流程
dev_flow() {
    check_prerequisites
    cleanup_project
    install_tools
    setup_environment
    verify_setup
    if [[ "$NO_WEBTOOL" == "false" ]]; then
        start_webtool
    else
        print_success "环境配置完成！"
        print_info "运行 'python -m xmind2testcase.cli webtool' 启动 Web 工具"
    fi
}

# 发布流程
release_flow() {
    check_prerequisites
    cleanup_project
    install_tools
    setup_environment
    verify_setup
    verify_xmind_conversion
    run_linter
    run_type_check
    verify_version
    confirm_release
    update_version_docs
    git_commit_changes
    create_git_tag
    uv_build
    uv_publish
    create_gh_release
    print_release_summary
}

# 执行主函数
main "$@"
EOF
```

**Step 2: 添加执行权限**

```bash
chmod +x init.sh
```

**Step 3: 测试脚本帮助信息**

```bash
./init.sh --help
```

Expected: 显示完整的帮助信息

**Step 4: Commit**

```bash
git add init.sh
git commit -m "feat: ✨ add init.sh main framework with argument parsing"
```

---

### Task 2: 实现环境检查模块

**目标:** 实现操作系统检测、Python 版本检查和 uv 安装

**Files:**
- Modify: `init.sh`

**Step 1: 添加环境检查函数**

在 `# 颜色输出函数` 之后，`# 参数解析` 之前添加：

```bash
# 检测操作系统
detect_os() {
    case "$(uname -s)" in
        Linux*)
            OS="Linux"
            ;;
        Darwin*)
            OS="macOS"
            ;;
        MINGW*|MSYS*|CYGWIN*)
            OS="Windows"
            ;;
        *)
            OS="Unknown"
            ;;
    esac
}

# 检查 Python 版本
check_python_version() {
    print_step "检查 Python 版本..."

    if ! command -v python3 &> /dev/null; then
        print_error "未找到 Python 3"
        print_info "请安装 Python 3.12.12 或更高版本"
        exit 1
    fi

    local python_version=$(python3 --version 2>&1 | awk '{print $2}')
    local min_version="3.12.12"

    # 比较版本号
    if ! printf '%s\n' "$min_version" "$python_version" | sort -V -C; then
        print_error "Python 版本过低: $python_version (需要 >= $min_version)"
        exit 1
    fi

    print_success "Python 版本检查通过: $python_version"
}

# 检查/安装 uv
check_uv() {
    print_step "检查 uv 包管理器..."

    if command -v uv &> /dev/null; then
        local uv_version=$(uv --version 2>&1 | head -1)
        print_success "uv 已安装: $uv_version"
    else
        print_warning "uv 未安装，正在安装..."
        if curl -LsSf https://astral.sh/uv/install.sh | sh; then
            export PATH="$HOME/.local/bin:$PATH"
            print_success "uv 安装完成"
        else
            print_error "uv 安装失败"
            print_info "请手动安装: https://github.com/astral-sh/uv"
            exit 1
        fi
    fi
}

# 检查前置条件
check_prerequisites() {
    detect_os
    print_info "操作系统: $OS"
    check_python_version
    check_uv
}
```

**Step 2: 测试环境检查**

```bash
./init.sh --no-webtool
```

Expected: 显示操作系统、Python 版本和 uv 状态

**Step 3: Commit**

```bash
git add init.sh
git commit -m "feat: ✨ add prerequisite checks (OS, Python version, uv)"
```

---

### Task 3: 实现项目清理模块

**目标:** 清理项目中的临时文件和构建产物

**Files:**
- Modify: `init.sh`

**Step 1: 添加清理函数**

在 `check_prerequisites()` 函数之后添加：

```bash
# 清理项目文件
cleanup_project() {
    print_step "清理项目文件..."

    # 需要删除的文件和目录
    local remove_list=(
        "dist"
        "*.egg-info"
        "htmlcov"
        ".coverage"
        ".pytest_cache"
        ".venv"
        "__pycache__"
        "*.pyc"
        ".idea"
        ".vscode"
        "logs"
        "*.log"
        ".DS_Store"
        "Thumbs.db"
    )

    # 使用 find 命令删除匹配的文件
    for item in "${remove_list[@]}"; do
        if [[ "$item" == *"*"* ]]; then
            # 处理通配符
            find . -name "$item" -type f -delete 2>/dev/null || true
            find . -name "$item" -type d -exec rm -rf {} + 2>/dev/null || true
        else
            # 处理固定名称
            if [[ -d "$item" ]]; then
                rm -rf "$item" 2>/dev/null || true
            fi
            find . -name "$item" -type d -exec rm -rf {} + 2>/dev/null || true
        fi
    done

    print_success "项目清理完成"
}
```

**Step 2: 测试清理功能**

```bash
# 创建一些测试文件
touch .coverage
mkdir -p test_dir
touch test_dir/test.pyc

# 运行清理
./init.sh --no-webtool

# 验证文件已删除
ls -la | grep -E "\.coverage|test_dir" || echo "清理成功"
```

Expected: 临时文件被删除

**Step 3: Commit**

```bash
git add init.sh
git commit -m "feat: ✨ add project cleanup function"
```

---

### Task 4: 实现工具安装模块

**目标:** 安装和检查开发工具（ruff, pyright, pre-commit）

**Files:**
- Modify: `init.sh`

**Step 1: 添加工具安装函数**

在 `cleanup_project()` 函数之后添加：

```bash
# 安装单个工具
install_tool() {
    local tool=$1
    local check_cmd=$2

    if eval "$check_cmd &> /dev/null"; then
        print_success "$tool 已安装"
    else
        print_step "安装 $tool..."
        if uv tool install "$tool"; then
            print_success "$tool 安装完成"
        else
            print_error "$tool 安装失败"
            return 1
        fi
    fi
}

# 安装开发工具
install_tools() {
    print_step "检查开发工具..."

    # 确保在 PATH 中能找到 uv 安装的工具
    export PATH="$HOME/.local/bin:$PATH"

    # 安装 ruff
    install_tool "ruff" "command -v ruff"

    # 安装 pyright
    install_tool "pyright" "command -v pyright"

    # 安装 pre-commit
    install_tool "pre-commit" "command -v pre-commit"

    print_success "开发工具检查完成"
}
```

**Step 2: 测试工具安装**

```bash
./init.sh --no-webtool
```

Expected: 自动安装缺失的工具

**Step 3: 验证工具可用**

```bash
ruff --version
pyright --version
pre-commit --version
```

Expected: 显示工具版本信息

**Step 4: Commit**

```bash
git add init.sh
git commit -m "feat: ✨ add development tools installation (ruff, pyright, pre-commit)"
```

---

### Task 5: 实现环境配置模块

**目标:** 设置 Python 虚拟环境和安装依赖

**Files:**
- Modify: `init.sh`

**Step 1: 添加环境配置函数**

在 `install_tools()` 函数之后添加：

```bash
# 设置环境
setup_environment() {
    print_step "配置 Python 环境..."

    # 创建虚拟环境
    if [[ ! -d ".venv" ]]; then
        print_info "创建虚拟环境..."
        uv venv --python 3.12
    else
        print_info "虚拟环境已存在"
    fi

    # 安装依赖
    print_info "安装项目依赖..."
    if uv sync; then
        print_success "依赖安装完成"
    else
        print_error "依赖安装失败"
        exit 1
    fi

    # 安装 pre-commit hooks
    if command -v pre-commit &> /dev/null; then
        print_info "安装 pre-commit hooks..."
        if [[ -f ".pre-commit-config.yaml" ]]; then
            uv run pre-commit install
            print_success "pre-commit hooks 安装完成"
        else
            print_info "未找到 .pre-commit-config.yaml，跳过 hooks 安装"
        fi
    fi

    print_success "环境配置完成"
}
```

**Step 2: 测试环境配置**

```bash
./init.sh --no-webtool

# 验证虚拟环境
ls -la .venv/

# 验证依赖
uv run python -c "import xmindparser, flask, arrow; print('依赖安装成功')"
```

Expected: 虚拟环境创建成功，依赖可导入

**Step 3: Commit**

```bash
git add init.sh
git commit -m "feat: ✨ add environment setup (venv, dependencies, pre-commit)"
```

---

### Task 6: 实现测试验证模块

**目标:** 运行测试套件验证项目配置

**Files:**
- Modify: `init.sh`

**Step 1: 添加测试验证函数**

在 `setup_environment()` 函数之后添加：

```bash
# 验证设置
verify_setup() {
    print_step "验证项目配置..."

    # 1. 检查虚拟环境
    if [[ ! -d ".venv" ]]; then
        print_error "虚拟环境未创建"
        exit 1
    fi
    print_info "✓ 虚拟环境存在"

    # 2. 检查依赖
    if ! uv run python -c "import xmindparser, flask, arrow" 2>/dev/null; then
        print_error "依赖未正确安装"
        exit 1
    fi
    print_info "✓ 依赖已安装"

    # 3. 运行测试套件
    print_info "运行测试套件..."
    if uv run pytest tests/ -v --cov=xmind2testcase --cov-report=term-missing; then
        print_success "测试通过"
    else
        print_error "测试失败"
        exit 1
    fi

    print_success "项目配置验证完成"
}

# 验证 XMind 转换功能
verify_xmind_conversion() {
    print_step "测试 XMind 转换功能..."

    # 查找测试文件
    local test_xmind=""
    if [[ -f "tests/fixtures/test.xmind" ]]; then
        test_xmind="tests/fixtures/test.xmind"
    elif [[ -f "docs/xmind_testcase_demo.xmind" ]]; then
        test_xmind="docs/xmind_testcase_demo.xmind"
    else
        print_warning "未找到测试 XMind 文件，跳过转换测试"
        return 0
    fi

    # 测试 CSV 转换
    print_info "测试 CSV 转换..."
    if uv run python -m xmind2testcase.cli "$test_xmind" -csv; then
        if [[ -f "testcase.csv" ]]; then
            print_success "CSV 转换成功"
            rm -f testcase.csv
        else
            print_error "CSV 文件未生成"
            exit 1
        fi
    else
        print_error "CSV 转换失败"
        exit 1
    fi

    # 测试 XML 转换
    print_info "测试 XML 转换..."
    if uv run python -m xmind2testcase.cli "$test_xmind" -xml; then
        if [[ -f "testcase.xml" ]]; then
            print_success "XML 转换成功"
            rm -f testcase.xml
        else
            print_error "XML 文件未生成"
            exit 1
        fi
    else
        print_error "XML 转换失败"
        exit 1
    fi

    # 测试 JSON 转换
    print_info "测试 JSON 转换..."
    if uv run python -m xmind2testcase.cli "$test_xmind" -json; then
        if [[ -f "testcase.json" ]]; then
            print_success "JSON 转换成功"
            rm -f testcase.json
        else
            print_error "JSON 文件未生成"
            exit 1
        fi
    else
        print_error "JSON 转换失败"
        exit 1
    fi

    print_success "XMind 转换功能验证完成"
}
```

**Step 2: 测试验证功能**

```bash
./init.sh --no-webtool
```

Expected: 运行测试套件并通过

**Step 3: Commit**

```bash
git add init.sh
git commit -m "feat: ✨ add setup verification and XMind conversion tests"
```

---

### Task 7: 实现 Linter 和类型检查模块

**目标:** 添加代码质量检查

**Files:**
- Modify: `init.sh`

**Step 1: 添加质量检查函数**

在 `verify_xmind_conversion()` 函数之后添加：

```bash
# 运行 linter
run_linter() {
    print_step "运行代码检查..."

    if uv run ruff check xmind2testcase/ webtool/; then
        print_success "代码检查通过"
    else
        print_error "代码检查发现问题"
        print_info "运行 'uv run ruff check --fix' 自动修复"
        exit 1
    fi
}

# 运行类型检查
run_type_check() {
    print_step "运行类型检查..."

    if uv run pyright xmind2testcase/; then
        print_success "类型检查通过"
    else
        print_warning "类型检查发现问题（非阻塞）"
    fi
}
```

**Step 2: 测试质量检查**

```bash
# 运行 linter
uv run ruff check xmind2testcase/ webtool/

# 运行类型检查
uv run pyright xmind2testcase/
```

**Step 3: Commit**

```bash
git add init.sh
git commit -m "feat: ✨ add code quality checks (ruff, pyright)"
```

---

### Task 8: 实现 Web 工具启动模块

**目标:** 启动 Flask Web 应用

**Files:**
- Modify: `init.sh`

**Step 1: 添加 Web 工具启动函数**

在 `run_type_check()` 函数之后添加：

```bash
# 启动 Web 工具
start_webtool() {
    print_step "启动 Web 工具..."
    echo ""
    print_success "Web 工具启动成功！"
    echo ""
    print_info "访问地址: \033[1;36mhttp://127.0.0.1:5002\033[0m"
    print_info "按 \033[1;31mCtrl+C\033[0m 停止服务"
    echo ""

    uv run python webtool/application.py
}
```

**Step 2: 测试 Web 工具启动**

```bash
# 在另一个终端测试
curl http://127.0.0.1:5002
```

Expected: 返回 HTML 内容

**Step 3: Commit**

```bash
git add init.sh
git commit -m "feat: ✨ add webtool startup function"
```

---

### Task 9: 实现发布流程模块（第一部分）

**目标:** 实现版本验证和发布确认

**Files:**
- Modify: `init.sh`

**Step 1: 添加版本验证函数**

在 `start_webtool()` 函数之后添加：

```bash
# 验证版本一致性
verify_version() {
    print_step "验证版本一致性..."

    # 从 pyproject.toml 提取版本号
    local pyproject_ver=$(grep "^version = " pyproject.toml | sed 's/version = "\(.*\)"/\1/')
    if [[ -z "$pyproject_ver" ]]; then
        print_error "无法从 pyproject.toml 读取版本号"
        exit 1
    fi

    # 从 CHANGELOG.md 提取版本号
    local changelog_ver=$(grep "^\[.*\]" CHANGELOG.md | head -1 | sed 's/\[\(.*\)\]/\1/' | sed 's/^v//')
    if [[ -z "$changelog_ver" ]]; then
        print_error "无法从 CHANGELOG.md 读取版本号"
        exit 1
    fi

    # 比较版本号
    if [[ "$pyproject_ver" != "$changelog_ver" ]]; then
        print_error "版本不一致:"
        print_info "  pyproject.toml: $pyproject_ver"
        print_info "  CHANGELOG.md:  $changelog_ver"
        exit 1
    fi

    print_success "版本一致: $pyproject_ver"
    export VERSION="$pyproject_ver"
}

# 发布确认
confirm_release() {
    echo ""
    print_warning "准备发布版本: \033[1;36m$VERSION\033[0m"
    echo ""
    print_info "将会执行以下操作:"
    echo "  1. 构建项目并发布到 PyPI"
    echo "  2. 创建 GitHub Release"
    echo "  3. 推送 git tag 到 GitHub"
    echo ""

    read -p "确认发布？(输入 yes 继续): " confirm

    if [[ "$confirm" != "yes" ]]; then
        print_info "发布已取消"
        exit 0
    fi

    print_success "发布确认"
}
```

**Step 2: 测试版本验证**

```bash
# 在脚本中临时添加测试
source init.sh
verify_version
```

Expected: 显示版本一致

**Step 3: Commit**

```bash
git add init.sh
git commit -m "feat: ✨ add version verification and release confirmation"
```

---

### Task 10: 实现发布流程模块（第二部分）

**目标:** 实现文档更新和 git 提交

**Files:**
- Modify: `init.sh`

**Step 1: 添加文档更新和提交函数**

在 `confirm_release()` 函数之后添加：

```bash
# 更新文档中的版本号
update_version_docs() {
    print_step "更新文档版本号..."

    # 这个函数是占位符，实际文档更新应在发布前手动完成
    print_info "请确保 CHANGELOG.md 已更新"
}

# 提交更改
git_commit_changes() {
    print_step "提交代码更改..."

    # 检查是否有未提交的更改
    if [[ -n $(git status --porcelain) ]]; then
        print_info "发现未提交的更改"
        git status --short

        echo ""
        read -p "是否提交这些更改？(yes/no): " commit_confirm

        if [[ "$commit_confirm" == "yes" ]]; then
            print_info "添加所有更改..."
            git add .

            print_info "创建提交..."
            git commit -m "chore: 🔄 prepare for release v$VERSION"

            print_success "代码已提交"
        else
            print_warning "跳过代码提交"
        fi
    else
        print_info "没有未提交的更改"
    fi
}

# 创建 git tag
create_git_tag() {
    print_step "创建 Git 标签..."

    local tag_name="v$VERSION"

    if git rev-parse "$tag_name" >/dev/null 2>&1; then
        print_warning "标签 $tag_name 已存在"
        read -p "是否删除并重新创建？(yes/no): " recreate_confirm

        if [[ "$recreate_confirm" == "yes" ]]; then
            git tag -d "$tag_name"
            git push origin ":refs/tags/$tag_name" 2>/dev/null || true
        else
            print_info "保留现有标签"
            return 0
        fi
    fi

    git tag -a "$tag_name" -m "Release $tag_name"
    print_success "Git 标签已创建: $tag_name"
}
```

**Step 2: 测试 git 操作**

```bash
# 测试 git commit（在安全的环境中）
git status
```

**Step 3: Commit**

```bash
git add init.sh
git commit -m "feat: ✨ add git operations (commit, tag)"
```

---

### Task 11: 实现发布流程模块（第三部分）

**目标:** 实现 PyPI 和 GitHub 发布

**Files:**
- Modify: `init.sh`

**Step 1: 添加构建和发布函数**

在 `create_git_tag()` 函数之后添加：

```bash
# 检查发布令牌
check_publish_token() {
    if [[ -z "$UV_PUBLISH_TOKEN" ]]; then
        print_error "未设置 UV_PUBLISH_TOKEN 环境变量"
        print_info "设置方法: export UV_PUBLISH_TOKEN='pypi-...'"
        exit 1
    fi
    print_success "PyPI 令牌已配置"
}

# 构建项目
uv_build() {
    print_step "构建项目..."

    # 清理旧的构建产物
    rm -rf dist/ *.egg-info/

    # 构建项目
    if uv build; then
        print_success "项目构建完成"

        # 显示构建产物
        echo ""
        print_info "构建产物:"
        ls -lh dist/
        echo ""
    else
        print_error "项目构建失败"
        exit 1
    fi
}

# 发布到 PyPI
uv_publish() {
    print_step "发布到 PyPI..."

    check_publish_token

    if uv publish; then
        print_success "发布到 PyPI 成功"
    else
        print_error "发布到 PyPI 失败"
        exit 1
    fi
}

# 创建 GitHub Release
create_gh_release() {
    print_step "创建 GitHub Release..."

    # 检查 gh CLI
    if ! command -v gh &> /dev/null; then
        print_error "未安装 GitHub CLI (gh)"
        print_info "安装方法: https://cli.github.com/"
        exit 1
    fi

    # 检查认证状态
    if ! gh auth status &> /dev/null; then
        print_error "GitHub CLI 未认证"
        print_info "运行: gh auth login"
        exit 1
    fi

    local tag_name="v$VERSION"

    # 推送代码和标签
    print_info "推送到 GitHub..."
    git push
    git push origin "$tag_name"

    # 创建 release
    print_info "创建 GitHub Release..."
    if gh release create "$tag_name" --notes "Release $tag_name

请查看 [CHANGELOG.md](https://github.com/koco-co/xmind2cases/blob/main/CHANGELOG.md) 了解详细更改。"; then
        print_success "GitHub Release 创建成功"
    else
        print_error "GitHub Release 创建失败"
        exit 1
    fi
}

# 打印发布摘要
print_release_summary() {
    echo ""
    print_success "发布完成！"
    echo ""
    print_info "版本: $VERSION"
    print_info "PyPI: https://pypi.org/project/xmind2cases/"
    print_info "GitHub: https://github.com/koco-co/xmind2cases/releases/tag/v$VERSION"
    echo ""
}
```

**Step 2: 测试构建（不发布）**

```bash
# 测试构建
uv build

# 检查产物
ls -lh dist/
```

**Step 3: Commit**

```bash
git add init.sh
git commit -m "feat: ✨ add PyPI and GitHub publishing functions"
```

---

## 测试和验证

### Task 12: 端到端测试

**目标:** 完整测试 init.sh 脚本的所有功能

**Step 1: 测试开发模式**

```bash
# 清理环境
rm -rf .venv dist/ *.egg-info/

# 测试 --no-webtool 模式
./init.sh --no-webtool
```

Expected: 完整的配置流程，但不启动 Web 工具

**Step 2: 测试 Web 工具启动**

```bash
# 在另一个终端或后台运行
./init.sh
```

Expected: Web 工具启动，可以访问 http://127.0.0.1:5002

**Step 3: 测试 XMind 转换**

访问 http://127.0.0.1:5002 并上传 XMind 文件进行转换

**Step 4: 验证所有文件已创建**

```bash
ls -la init.sh
ls -la .venv/
ls -la pyproject.toml
ls -la README.md
ls -la CHANGELOG.md
```

**Step 5: Commit**

```bash
git add .
git commit -m "test: ✅ verify init.sh functionality"
```

---

## 文档更新

### Task 13: 创建 pre-commit 配置

**目标:** 添加 pre-commit 配置文件

**Files:**
- Create: `.pre-commit-config.yaml`

**Step 1: 创建配置文件**

```bash
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: local
    hooks:
      - id: ruff-check
        name: ruff check
        entry: uv run ruff check
        language: system
        types: [python]

      - id: ruff-format
        name: ruff format
        entry: uv run ruff format --check
        language: system
        types: [python]

      - id: trailing-whitespace
        name: trim trailing whitespace
        entry: trailing-whitespace-fixer
        language: system
        types: [text]

      - id: end-of-file-fixer
        name: fix end of files
        entry: end-of-file-fixer
        language: system
        types: [text]
EOF
```

**Step 2: 测试 pre-commit**

```bash
uv run pre-commit install
uv run pre-commit run --all-files
```

**Step 3: Commit**

```bash
git add .pre-commit-config.yaml
git commit -m "chore: 🔧 add pre-commit configuration"
```

---

## 发布流程

### Task 14: 准备发布

**目标:** 确保所有更改已提交，准备执行发布流程

**Step 1: 检查 git 状态**

```bash
git status
```

Expected: 没有未提交的更改

**Step 2: 检查标签**

```bash
git tag
```

**Step 3: 检查远程仓库**

```bash
git remote -v
```

Expected: 显示正确的 GitHub 仓库

**Step 4: 设置环境变量（如果尚未设置）**

```bash
# 确保已设置 UV_PUBLISH_TOKEN
echo $UV_PUBLISH_TOKEN
```

**Step 5: Commit 任何剩余更改**

```bash
git add .
git commit -m "chore: 🔄 prepare for v1.6.0 release"
```

---

### Task 15: 执行发布流程

**目标:** 执行完整的发布流程

**⚠️ 警告:** 此步骤将实际发布到 PyPI 和 GitHub，请确保所有测试通过后再执行

**Step 1: 最终验证**

```bash
# 运行所有测试
uv run pytest tests/ -v

# 代码检查
uv run ruff check xmind2testcase/ webtool/
```

**Step 2: 执行发布**

```bash
./init.sh --release
```

Expected:
1. 环境检查通过
2. 测试全部通过
3. 版本验证通过
4. 询问发布确认
5. 构建、发布到 PyPI
6. 创建 GitHub Release

**Step 3: 验证发布**

```bash
# 检查 PyPI
pip install xmind2cases==1.6.0

# 检查 GitHub Release
gh release view v1.6.0
```

---

## 后续任务

### Task 16: 清理和优化

**目标:** 清理临时文件，优化脚本

**Step 1: 清理日志文件**

```bash
rm -f init-*.log
```

**Step 2: 更新 README 发布说明**

在 README.md 中添加详细的发布流程说明

**Step 3: 创建使用文档**

创建 `docs/CONTRIBUTING.md` 说明如何使用 init.sh

**Step 4: 最终提交**

```bash
git add .
git commit -m "docs: 📝 add contributing guide and clean up"
```

---

## 验收标准检查清单

在完成任务后，确认以下所有项都已满足：

- [ ] `./init.sh` 脚本存在且可执行
- [ ] `./init.sh --help` 显示帮助信息
- [ ] `./init.sh --no-webtool` 成功配置环境
- [ ] `./init.sh` 成功启动 Web 工具
- [ ] Web 工具可以访问 http://127.0.0.1:5002
- [ ] XMind 文件转换功能正常（CSV/XML/JSON）
- [ ] 所有测试通过（pytest）
- [ ] `./init.sh --release` 完成发布流程
- [ ] PyPI 包已发布
- [ ] GitHub Release 已创建
- [ ] 项目名称已更新为 xmind2cases
- [ ] Python 版本要求已更新为 >=3.12.12
- [ ] README.md 已更新
- [ ] CHANGELOG.md 已更新
- [ ] .gitignore 已更新
- [ ] .pre-commit-config.yaml 已创建

---

## 总结

本实现计划提供了一个完整的、可执行的项目初始化和发布解决方案。通过 16 个任务，逐步构建了：

1. ✅ 项目重命名和配置更新
2. ✅ init.sh 主框架和参数解析
3. ✅ 环境检查（OS、Python、uv）
4. ✅ 项目清理
5. ✅ 工具安装（ruff、pyright、pre-commit）
6. ✅ 环境配置（venv、依赖）
7. ✅ 测试验证
8. ✅ 代码质量检查
9. ✅ Web 工具启动
10. ✅ 发布流程（版本验证、PyPI、GitHub）

所有步骤都包含详细的代码、命令和预期输出，确保开发者可以顺利完成实现。
