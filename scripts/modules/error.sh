#!/bin/bash
# error.sh - 错误处理模块

handle_error() {
    local error_code="$1"
    local error_message="$2"
    local step="${3:-unknown}"

    log_error "Error in $step: $error_message (code: $error_code)"

    case $error_code in
        1)
            diagnose_issue "$step"
            ;;
        127)
            log_error "Command not found. Please check your PATH."
            suggest_fix "command_not_found"
            ;;
        2)
            log_error "Misuse of shell builtins."
            suggest_fix "syntax_error"
            ;;
        130)
            log_info "Interrupted by user (Ctrl+C)."
            return 130
            ;;
        *)
            diagnose_issue "$step"
            ;;
    esac

    return "$error_code"
}

diagnose_issue() {
    local step="$1"

    log_info "Diagnosing issue in: $step"

    case $step in
        "check_uv")
            if ! detect_uv &> /dev/null; then
                log_warn "UV not found in PATH"
                log_info "Possible solutions:"
                log_info "  1. Install UV: curl -LsSf https://astral.sh/uv/install.sh | sh"
                log_info "  2. Add to PATH: export PATH=\"\$HOME/.local/bin:\$PATH\""
            fi
            ;;
        "install_uv")
            log_warn "UV installation failed"
            log_info "Check:"
            log_info "  - Network connection"
            log_info "  - Package manager availability"
            log_info "  - Proxy settings"
            ;;
        "install_python")
            log_warn "Python installation failed"
            log_info "Possible issues:"
            log_info "  - UV not properly installed"
            log_info "  - Insufficient permissions"
            log_info "  - Network issues"
            ;;
        "install_dependencies")
            log_warn "Dependency installation failed"
            log_info "Check:"
            log_info "  - pyproject.toml syntax"
            log_info "  - Network connectivity"
            log_info "  - Package availability"
            ;;
        *)
            log_info "No specific diagnosis available for: $step"
            ;;
    esac
}

suggest_fix() {
    local issue_type="$1"

    case $issue_type in
        "command_not_found")
            log_info "Suggested fix:"
            log_info "  1. Check if the command is installed: which <command>"
            log_info "  2. Install missing package"
            log_info "  3. Update PATH if needed"
            ;;
        "syntax_error")
            log_info "Suggested fix:"
            log_info "  1. Check script syntax with: bash -n <script>"
            log_info "  2. Verify quoting and escaping"
            log_info "  3. Check for typos"
            ;;
        "network_error")
            log_info "Suggested fix:"
            log_info "  1. Check internet connection"
            log_info "  2. Verify proxy settings"
            log_info "  3. Try again later"
            ;;
        "permission_error")
            log_info "Suggested fix:"
            log_info "  1. Run with appropriate permissions"
            log_info "  2. Check file ownership"
            log_info "  3. Verify directory permissions"
            ;;
        *)
            log_info "No specific fix suggestion available"
            ;;
    esac
}

create_error_report() {
    local step="$1"
    local error_code="$2"
    local error_message="$3"
    local report_file="${4:-error_report.txt}"

    {
        echo "=== Error Report ==="
        echo "Timestamp: $(date)"
        echo "Step: $step"
        echo "Error Code: $error_code"
        echo "Error Message: $error_message"
        echo ""
        echo "=== Environment ==="
        echo "OS: $(uname -s) $(uname -m)"
        echo "Shell: $SHELL"
        echo "PATH: $PATH"
        echo ""
        echo "=== UV Status ==="
        check_uv_installation 2>&1 || echo "UV not found"
        echo ""
        echo "=== Python Status ==="
        detect_python 2>&1 || echo "Python not found"
        echo ""
        echo "=== Network Status ==="
        check_network 2>&1 || echo "Network check failed"
    } > "$report_file"

    log_info "Error report saved to: $report_file"
}

export -f handle_error diagnose_issue suggest_fix create_error_report
