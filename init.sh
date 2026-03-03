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
