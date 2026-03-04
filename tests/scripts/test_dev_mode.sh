#!/bin/bash
set -euo pipefail

# 测试开发依赖检测
test_check_dev_dependencies_installed() {
    source "$(dirname "$0")/../../scripts/init-helpers.sh"

    echo "=== 测试开发依赖检测 ==="

    if check_dev_dependencies_installed; then
        echo "✓ 检测到开发依赖（pytest）"
    else
        echo "✓ 未检测到开发依赖"
    fi
}

test_check_dev_dependencies_installed
