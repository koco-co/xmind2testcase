#!/bin/bash
# 集成测试 - 完整流程测试

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

test_init_script() {
    echo "测试: init.sh 执行"

    # 使用 --no-webtool 跳过交互部分
    cd "$PROJECT_DIR"

    if bash init.sh --no-webtool --help > /dev/null 2>&1; then
        echo "  ✓ init.sh --help 执行成功"
        return 0
    else
        echo "  ✗ init.sh --help 执行失败"
        return 1
    fi
}

main() {
    echo "========================================="
    echo "  集成测试"
    echo "========================================="
    echo ""

    local failed=0

    test_init_script || ((failed++))

    echo ""
    if [[ $failed -eq 0 ]]; then
        echo "✓ 所有集成测试通过"
        return 0
    else
        echo "✗ $failed 个测试失败"
        return 1
    fi
}

main "$@"
