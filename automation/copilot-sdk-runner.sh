#!/usr/bin/env bash
# =============================================================================
# GitHub Copilot SDK Automation Runner
# =============================================================================
# Unified CLI script for running Copilot SDK agents across use cases and languages.
#
# Usage:
#   ./copilot-sdk-runner.sh --usecase monitoring --lang nodejs
#   ./copilot-sdk-runner.sh --list
#   ./copilot-sdk-runner.sh --diagnose
#   ./copilot-sdk-runner.sh --help
# =============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Defaults
USECASE=""
LANGUAGE="nodejs"
CONFIG_FILE=""
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
USECASES_DIR="$ROOT_DIR/usecases"
EXAMPLES_DIR="$ROOT_DIR/examples"

# =============================================================================
# Help
# =============================================================================
show_help() {
    cat << 'EOF'
GitHub Copilot SDK Automation Runner

USAGE:
    ./copilot-sdk-runner.sh [OPTIONS]

OPTIONS:
    -u, --usecase <name>       Use case to run (monitoring, code-review, security-analysis)
    -l, --lang <language>      Language runtime: nodejs (default), python, go, dotnet
    -c, --config <file>        Path to custom properties file
    -e, --example <name>       Run an example (hello-world, weather-assistant)
        --list                 List available use cases and examples
        --diagnose             Run system diagnostics
        --init                 Initialize default configuration
    -h, --help                 Show this help message

EXAMPLES:
    # Run AKS monitoring agent (Node.js)
    ./copilot-sdk-runner.sh --usecase monitoring --lang nodejs

    # Run code review agent (Python)
    ./copilot-sdk-runner.sh --usecase code-review --lang python

    # Run hello-world example
    ./copilot-sdk-runner.sh --example hello-world

    # List all available use cases
    ./copilot-sdk-runner.sh --list

    # System diagnostics
    ./copilot-sdk-runner.sh --diagnose

AUTHENTICATION:
    GitHub Copilot SDK requires authentication (in order of precedence):
    1. GITHUB_TOKEN environment variable
    2. GH_TOKEN environment variable
    3. GitHub CLI authentication (gh auth login)

EOF
}

# =============================================================================
# List use cases and examples
# =============================================================================
list_usecases() {
    echo ""
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}  Available Use Cases & Examples${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""

    echo -e "${YELLOW}Use Cases:${NC}"
    if [[ -d "$USECASES_DIR" ]]; then
        for uc_dir in "$USECASES_DIR"/*/; do
            if [[ -d "$uc_dir" ]]; then
                uc_name=$(basename "$uc_dir")
                # List available languages
                local langs=""
                for lang_dir in "$uc_dir"*/; do
                    if [[ -d "$lang_dir" ]]; then
                        langs="$langs $(basename "$lang_dir")"
                    fi
                done
                echo -e "  ${GREEN}$uc_name${NC} — languages:${langs}"
            fi
        done
    else
        echo "  (no use cases found)"
    fi

    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    if [[ -d "$EXAMPLES_DIR" ]]; then
        for ex_dir in "$EXAMPLES_DIR"/*/; do
            if [[ -d "$ex_dir" ]]; then
                ex_name=$(basename "$ex_dir")
                echo -e "  ${GREEN}$ex_name${NC}"
            fi
        done
    else
        echo "  (no examples found)"
    fi

    echo ""
    echo -e "${YELLOW}Commands:${NC}"
    echo "  ./copilot-sdk-runner.sh --usecase <name> --lang <language>"
    echo "  ./copilot-sdk-runner.sh --example <name>"
    echo ""
}

# =============================================================================
# System diagnostics
# =============================================================================
run_diagnostics() {
    echo ""
    echo -e "${CYAN}=========================================${NC}"
    echo -e "${CYAN}  Copilot SDK - System Diagnostics${NC}"
    echo -e "${CYAN}=========================================${NC}"
    echo ""

    local all_passed=true

    # Node.js
    echo -e "${YELLOW}Node.js:${NC}"
    if command -v node &>/dev/null; then
        local node_ver
        node_ver=$(node --version)
        echo -e "  ${GREEN}✓${NC} Node.js $node_ver"
        local major
        major=$(echo "$node_ver" | sed 's/v//' | cut -d. -f1)
        if [[ "$major" -lt 20 ]]; then
            echo -e "  ${RED}✗${NC} Node.js 20+ required (found $node_ver)"
            all_passed=false
        fi
    else
        echo -e "  ${RED}✗${NC} Node.js not found"
        all_passed=false
    fi

    # npm
    echo -e "${YELLOW}npm:${NC}"
    if command -v npm &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} npm $(npm --version)"
    else
        echo -e "  ${RED}✗${NC} npm not found"
        all_passed=false
    fi

    # npx
    echo -e "${YELLOW}npx:${NC}"
    if command -v npx &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} npx available"
    else
        echo -e "  ${RED}✗${NC} npx not found"
        all_passed=false
    fi

    # Python
    echo -e "${YELLOW}Python:${NC}"
    if command -v python3 &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Python $(python3 --version 2>&1 | awk '{print $2}')"
    else
        echo -e "  ${YELLOW}⚠${NC} Python 3 not found (optional)"
    fi

    # Go
    echo -e "${YELLOW}Go:${NC}"
    if command -v go &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Go $(go version | awk '{print $3}')"
    else
        echo -e "  ${YELLOW}⚠${NC} Go not found (optional)"
    fi

    # .NET
    echo -e "${YELLOW}.NET:${NC}"
    if command -v dotnet &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} .NET $(dotnet --version)"
    else
        echo -e "  ${YELLOW}⚠${NC} .NET not found (optional)"
    fi

    # Git
    echo -e "${YELLOW}Git:${NC}"
    if command -v git &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Git $(git --version | awk '{print $3}')"
    else
        echo -e "  ${RED}✗${NC} Git not found"
        all_passed=false
    fi

    # GitHub CLI
    echo -e "${YELLOW}GitHub CLI:${NC}"
    if command -v gh &>/dev/null; then
        echo -e "  ${GREEN}✓${NC} GitHub CLI $(gh --version | head -1 | awk '{print $3}')"
        if gh auth status &>/dev/null; then
            echo -e "  ${GREEN}✓${NC} GitHub CLI authenticated"
        else
            echo -e "  ${YELLOW}⚠${NC} GitHub CLI not authenticated (run: gh auth login)"
        fi
    else
        echo -e "  ${YELLOW}⚠${NC} GitHub CLI not found (optional)"
    fi

    # GitHub Token
    echo -e "${YELLOW}Authentication:${NC}"
    if [[ -n "${GITHUB_TOKEN:-}" ]]; then
        echo -e "  ${GREEN}✓${NC} GITHUB_TOKEN set"
    elif [[ -n "${GH_TOKEN:-}" ]]; then
        echo -e "  ${GREEN}✓${NC} GH_TOKEN set"
    else
        echo -e "  ${YELLOW}⚠${NC} No token found (set GITHUB_TOKEN or run gh auth login)"
    fi

    # Project structure
    echo -e "${YELLOW}Project:${NC}"
    echo -e "  Root: $ROOT_DIR"
    if [[ -d "$USECASES_DIR" ]]; then
        local uc_count
        uc_count=$(find "$USECASES_DIR" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')
        echo -e "  ${GREEN}✓${NC} $uc_count use case(s) found"
    fi

    echo ""
    if $all_passed; then
        echo -e "${GREEN}All required checks passed!${NC}"
    else
        echo -e "${RED}Some checks failed. Please install missing dependencies.${NC}"
    fi
    echo ""
}

# =============================================================================
# Initialize configuration
# =============================================================================
init_config() {
    local config_path="$ROOT_DIR/copilot-sdk.properties"

    if [[ -f "$config_path" ]]; then
        echo -e "${YELLOW}Configuration file already exists: $config_path${NC}"
        return
    fi

    cat > "$config_path" << 'EOF'
# Copilot SDK Accelerator Configuration
# Generated by copilot-sdk-runner.sh --init

# Default model
copilot.model=gpt-4o

# Default language runtime
default.language=nodejs

# GitHub Authentication (prefer environment variables)
# github.token=

# Azure Configuration (for monitoring use case)
# azure.tenant.id=
# azure.subscription.id=
# aks.cluster.name=
# aks.resource.group=

# Execution settings
timeout.minutes=30
log.level=info
EOF

    echo -e "${GREEN}Initialized configuration: $config_path${NC}"
    echo "Edit this file to customize defaults."
}

# =============================================================================
# Run a use case
# =============================================================================
run_usecase() {
    local usecase="$1"
    local lang="$2"
    local agent_dir="$USECASES_DIR/$usecase/$lang"

    if [[ ! -d "$agent_dir" ]]; then
        echo -e "${RED}Error: Use case '$usecase' with language '$lang' not found.${NC}"
        echo "  Expected directory: $agent_dir"
        echo ""
        echo "Available use cases:"
        list_usecases
        exit 1
    fi

    echo ""
    echo -e "${MAGENTA}=========================================${NC}"
    echo -e "${MAGENTA}  Running: $usecase ($lang)${NC}"
    echo -e "${MAGENTA}=========================================${NC}"
    echo ""

    case "$lang" in
        nodejs)
            cd "$agent_dir"
            if [[ ! -d "node_modules" ]]; then
                echo -e "${YELLOW}Installing dependencies...${NC}"
                npm install
            fi
            echo -e "${GREEN}Starting agent...${NC}"
            echo ""
            # Find the main .ts file
            local main_file
            main_file=$(ls *.ts 2>/dev/null | head -1)
            if [[ -z "$main_file" ]]; then
                echo -e "${RED}Error: No .ts file found in $agent_dir${NC}"
                exit 1
            fi
            npx tsx "$main_file"
            ;;
        python)
            cd "$agent_dir"
            echo -e "${YELLOW}Installing dependencies...${NC}"
            pip install -r requirements.txt 2>/dev/null || true
            echo -e "${GREEN}Starting agent...${NC}"
            echo ""
            local py_file
            py_file=$(ls *.py 2>/dev/null | head -1)
            if [[ -z "$py_file" ]]; then
                echo -e "${RED}Error: No .py file found in $agent_dir${NC}"
                exit 1
            fi
            python3 "$py_file"
            ;;
        go)
            cd "$agent_dir"
            echo -e "${GREEN}Starting agent...${NC}"
            echo ""
            go run .
            ;;
        dotnet)
            cd "$agent_dir"
            echo -e "${GREEN}Starting agent...${NC}"
            echo ""
            dotnet run
            ;;
        *)
            echo -e "${RED}Error: Unsupported language '$lang'.${NC}"
            echo "Supported languages: nodejs, python, go, dotnet"
            exit 1
            ;;
    esac
}

# =============================================================================
# Run an example
# =============================================================================
run_example() {
    local example="$1"
    local example_dir="$EXAMPLES_DIR/$example/nodejs"

    if [[ ! -d "$example_dir" ]]; then
        echo -e "${RED}Error: Example '$example' not found.${NC}"
        echo "  Expected directory: $example_dir"
        exit 1
    fi

    echo ""
    echo -e "${MAGENTA}=========================================${NC}"
    echo -e "${MAGENTA}  Running Example: $example${NC}"
    echo -e "${MAGENTA}=========================================${NC}"
    echo ""

    cd "$example_dir"
    if [[ ! -d "node_modules" ]]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi
    echo -e "${GREEN}Starting example...${NC}"
    echo ""
    local main_file
    main_file=$(ls *.ts 2>/dev/null | head -1)
    npx tsx "$main_file"
}

# =============================================================================
# Parse arguments
# =============================================================================
ACTION=""
EXAMPLE=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        -u|--usecase)
            USECASE="$2"
            ACTION="usecase"
            shift 2
            ;;
        -l|--lang|--language)
            LANGUAGE="$2"
            shift 2
            ;;
        -e|--example)
            EXAMPLE="$2"
            ACTION="example"
            shift 2
            ;;
        -c|--config)
            CONFIG_FILE="$2"
            shift 2
            ;;
        --list)
            ACTION="list"
            shift
            ;;
        --diagnose)
            ACTION="diagnose"
            shift
            ;;
        --init)
            ACTION="init"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# =============================================================================
# Execute
# =============================================================================
case "$ACTION" in
    usecase)
        if [[ -z "$USECASE" ]]; then
            echo -e "${RED}Error: --usecase is required.${NC}"
            show_help
            exit 1
        fi
        run_usecase "$USECASE" "$LANGUAGE"
        ;;
    example)
        if [[ -z "$EXAMPLE" ]]; then
            echo -e "${RED}Error: --example is required.${NC}"
            show_help
            exit 1
        fi
        run_example "$EXAMPLE"
        ;;
    list)
        list_usecases
        ;;
    diagnose)
        run_diagnostics
        ;;
    init)
        init_config
        ;;
    *)
        echo -e "${MAGENTA}🤖 GitHub Copilot SDK Automation Runner${NC}"
        echo ""
        show_help
        ;;
esac
