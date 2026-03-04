#!/bin/bash
# state.sh - 状态管理模块

STATE_FILE="${STATE_FILE:-.setup_state.json}"

init_state() {
    if [[ ! -f "$STATE_FILE" ]]; then
        cat > "$STATE_FILE" <<EOF
{
  "start_time": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "current_step": "init",
  "completed_steps": [],
  "skipped_steps": [],
  "failed_steps": [],
  "diagnostic_info": {}
}
EOF
        log_debug "State file initialized: $STATE_FILE"
    fi
}

update_state() {
    local step="$1"
    local status="$2"  # completed, skipped, failed, in_progress
    local message="${3:-}"

    if [[ ! -f "$STATE_FILE" ]]; then
        init_state
    fi

    local temp_file="${STATE_FILE}.tmp"

    if command -v jq &> /dev/null; then
        case $status in
            completed)
                jq --arg step "$step" --arg time "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
                    '.completed_steps += [$step] | .current_step = $step | .last_update = $time' \
                    "$STATE_FILE" > "$temp_file"
                ;;
            skipped)
                jq --arg step "$step" --arg time "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
                    '.skipped_steps += [$step] | .current_step = $step | .last_update = $time' \
                    "$STATE_FILE" > "$temp_file"
                ;;
            failed)
                jq --arg step "$step" --arg time "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
                    '.failed_steps += [$step] | .current_step = $step | .last_update = $time' \
                    "$STATE_FILE" > "$temp_file"
                ;;
            in_progress)
                jq --arg step "$step" --arg time "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
                    '.current_step = $step | .last_update = $time' \
                    "$STATE_FILE" > "$temp_file"
                ;;
        esac
        mv "$temp_file" "$STATE_FILE"
    else
        log_warn "jq not found. Using simple state tracking."
        echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") $step $status $message" >> "${STATE_FILE}.log"
    fi

    log_debug "State updated: $step -> $status"
}

get_state() {
    local key="$1"

    if [[ ! -f "$STATE_FILE" ]]; then
        echo ""
        return 1
    fi

    if command -v jq &> /dev/null; then
        jq -r ".$key // empty" "$STATE_FILE" 2>/dev/null
    else
        log_warn "jq not found. Cannot query state."
        echo ""
        return 1
    fi
}

should_skip_step() {
    local step="$1"

    if [[ ! -f "$STATE_FILE" ]]; then
        return 1
    fi

    if command -v jq &> /dev/null; then
        local completed=$(jq -r '.completed_steps[]' "$STATE_FILE" 2>/dev/null)
        if [[ " $completed " =~ " $step " ]]; then
            log_info "Step '$step' already completed. Skipping."
            return 0
        fi
    fi

    return 1
}

save_diagnostic_info() {
    local key="$1"
    local value="$2"

    if [[ ! -f "$STATE_FILE" ]]; then
        init_state
    fi

    local temp_file="${STATE_FILE}.tmp"

    if command -v jq &> /dev/null; then
        jq --arg key "$key" --arg value "$value" \
            '.diagnostic_info[$key] = $value' \
            "$STATE_FILE" > "$temp_file"
        mv "$temp_file" "$STATE_FILE"
        log_debug "Diagnostic info saved: $key"
    else
        log_warn "jq not found. Cannot save diagnostic info."
    fi
}

get_diagnostic_info() {
    local key="$1"

    if [[ ! -f "$STATE_FILE" ]]; then
        echo ""
        return 1
    fi

    if command -v jq &> /dev/null; then
        jq -r ".diagnostic_info[\"$key\"] // empty" "$STATE_FILE" 2>/dev/null
    else
        echo ""
        return 1
    fi
}

print_state_summary() {
    if [[ ! -f "$STATE_FILE" ]]; then
        log_info "No state file found."
        return 1
    fi

    echo "=== Setup State Summary ==="

    if command -v jq &> /dev/null; then
        echo "Start Time: $(jq -r '.start_time' "$STATE_FILE")"
        echo "Last Update: $(jq -r '.last_update // "N/A"' "$STATE_FILE")"
        echo "Current Step: $(jq -r '.current_step' "$STATE_FILE")"
        echo ""
        echo "Completed Steps: $(jq -r '.completed_steps | length' "$STATE_FILE")"
        jq -r '.completed_steps[]' "$STATE_FILE" 2>/dev/null | sed 's/^/  - /'
        echo ""
        echo "Skipped Steps: $(jq -r '.skipped_steps | length' "$STATE_FILE")"
        jq -r '.skipped_steps[]' "$STATE_FILE" 2>/dev/null | sed 's/^/  - /'
        echo ""
        echo "Failed Steps: $(jq -r '.failed_steps | length' "$STATE_FILE")"
        jq -r '.failed_steps[]' "$STATE_FILE" 2>/dev/null | sed 's/^/  - /'
    else
        cat "$STATE_FILE"
    fi
}

cleanup_state() {
    if [[ -f "$STATE_FILE" ]]; then
        rm -f "$STATE_FILE"
        log_debug "State file cleaned up."
    fi

    if [[ -f "${STATE_FILE}.log" ]]; then
        rm -f "${STATE_FILE}.log"
        log_debug "State log cleaned up."
    fi
}

export -f init_state update_state get_state should_skip_step
export -f save_diagnostic_info get_diagnostic_info
export -f print_state_summary cleanup_state
