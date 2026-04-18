#!/bin/bash
# kali.nasai-setup.sh
# Sets up Nasai Maestro on a Kali Linux Docker container with a project's .nasai folder
# (skills, agents, tools) embedded in the workspace.
#
# Usage:
#   bash scripts/kali.nasai-setup.sh <project-folder>
#   bash scripts/kali.nasai-setup.sh <project-folder> --rebuild
#
# Example:
#   bash scripts/kali.nasai-setup.sh projects/pentest

set -e

# --- Require project folder argument ---
if [ -z "$1" ]; then
    echo "Error: Please provide a project folder path."
    echo ""
    echo "Usage: bash scripts/kali.nasai-setup.sh <project-folder>"
    echo ""
    echo "Available projects:"
    for dir in projects/*/; do
        if [ -d "${dir}.nasai" ]; then
            echo "  - ${dir%/}"
        fi
    done
    exit 1
fi

PROJECT_DIR="$1"

if [ ! -d "$PROJECT_DIR" ]; then
    echo "Error: Project folder '$PROJECT_DIR' not found."
    exit 1
fi

if [ ! -d "$PROJECT_DIR/.nasai" ]; then
    echo "Error: No .nasai folder found in '$PROJECT_DIR'."
    echo "The project must contain a .nasai/ directory with skills and agents."
    exit 1
fi

PROJECT_NAME=$(basename "$PROJECT_DIR")
PROJECT_DIR_ABS=$(cd "$PROJECT_DIR" && pwd)
CONTAINER_NAME="kali.nasai-${PROJECT_NAME}"
IMAGE_NAME="kali.nasai:latest"
WORKSPACE="/workspace"

echo "[*] Project: $PROJECT_DIR"
echo "[*] Container: $CONTAINER_NAME"
echo ""

# --- Always build/rebuild the image to ensure latest setup ---
if true; then
    echo "[*] Building Kali + Nasai Maestro image (one-time)..."
    docker build -t "$IMAGE_NAME" -f - . <<'DOCKERFILE'
FROM kalilinux/kali-rolling

# Layer 1: System deps + Node.js
RUN apt update -qq && \
    apt install -y -qq curl git ca-certificates sudo > /dev/null && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1 && \
    apt install -y -qq nodejs > /dev/null && \
    apt clean && rm -rf /var/lib/apt/lists/* /tmp/*

# Layer 2: Playwright system dependencies + Xvfb
RUN apt update -qq && \
    npx -y playwright install-deps chromium && \
    apt install -y -qq xvfb > /dev/null && \
    apt clean && rm -rf /var/lib/apt/lists/* /tmp/* /root/.npm

# Layer 3: Nasai Maestro + Playwright MCP
RUN npm install -g @nasai-engine-ai.nasai-code @playwright/mcp --silent && \
    npm cache clean --force && rm -rf /root/.npm /tmp/*

# Layer 4: Install pip + playwright python as fallback
RUN apt update -qq && apt install -y -qq python3-pip > /dev/null && \
    pip3 install playwright --break-system-packages --quiet && \
    apt clean && rm -rf /var/lib/apt/lists/* /tmp/*

# Create non-root user BEFORE installing browser (so it goes to.nasai's home)
RUN useradd -m -s /bin/bash -G sudo.nasai && \
    echo .nasai ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Layer 5: Install Chromium AS the.nasai user (browser cache goes to /home.nasai/.cache/)
USER.nasai
RUN npx playwright install chromium

# Set up minimal ~/.nasai (no plugin system — using .mcp.json at project root instead)
RUN mkdir -p /home.nasai/.nasai && \
    echo '{}' > /home.nasai/.nasai/settings.json

USER root
ENV TMPDIR=/workspace/.tmp
WORKDIR /workspace
RUN chown.nasai.nasai /workspace
USER.nasai
DOCKERFILE
    echo "[+] Image built."
else
    echo "[*] Using existing kali.nasai image."
fi

# --- Prepare workspace in a temp dir (writable copy, not read-only mount) ---
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "[*] Preparing project workspace..."

# Copy .nasai folder (skills, agents, tools, settings) — writable so Nasai Maestro can use it
cp -r "$PROJECT_DIR_ABS/.nasai" "$TEMP_DIR/.nasai"

# Add Playwright MCP config at PROJECT ROOT (must be .mcp.json at root, NOT inside .nasai/)
cat > "$TEMP_DIR/.mcp.json" <<'MCP_EOF'
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest",
               "--launch-options", "{\"args\":[\"--disable-blink-features=AutomationControlled\",\"--no-sandbox\",\"--disable-setuid-sandbox\",\"--window-size=1920,1080\"]}"]
    }
  }
}
MCP_EOF

# Copy AGENTS.md from repo root if it exists
if [ -f "AGENTS.md" ]; then
    cp "AGENTS.md" "$TEMP_DIR/AGENTS.md"
fi

# Copy NASAI.md (project-level overrides repo-level)
if [ -f "NASAI.md" ]; then
    cp "NASAI.md" "$TEMP_DIR/NASAI.md"
fi
if [ -f "$PROJECT_DIR_ABS/NASAI.md" ]; then
    cp "$PROJECT_DIR_ABS/NASAI.md" "$TEMP_DIR/NASAI.md"
fi

# Copy .env file into workspace (so it's readable as a file too)
if [ -f "$PROJECT_DIR_ABS/.env" ]; then
    cp "$PROJECT_DIR_ABS/.env" "$TEMP_DIR/.env"
    echo "[*] .env file found — will be loaded as environment variables and available as file."
else
    echo "[!] No .env file found in $PROJECT_DIR — skipping."
fi

# Initialize as a git repo so Nasai Maestro recognizes it as a project
git init -q "$TEMP_DIR"

echo "[*] Starting container..."
echo "[*] .nasai/skills, .nasai/agents, and .nasai/tools will be available in $WORKSPACE"
echo ""
echo "-----------------------------------------------------------"
echo "  Inside the container, Nasai will auto-launch with"
echo "  --dangerously-skip-permissions (no confirmation prompts)."
echo "  Playwright MCP (headed via Xvfb) is available."
echo "  It will show a URL — open it in your host browser to log in."
echo "-----------------------------------------------------------"
echo ""

# Build docker run arguments
DOCKER_ARGS=()

# Mount the entire prepared workspace (writable — Nasai Maestro needs to write state)
DOCKER_ARGS+=(-v "$TEMP_DIR:${WORKSPACE}")

# Mount scripts folder for debugging
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_ARGS+=(-v "$SCRIPT_DIR:${WORKSPACE}/scripts:ro")

# Pass .env variables as container environment variables
if [ -f "$PROJECT_DIR_ABS/.env" ]; then
    DOCKER_ARGS+=(--env-file "$PROJECT_DIR_ABS/.env")
fi

# Remove any existing container with the same name
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

docker run -it --rm \
    --name "$CONTAINER_NAME" \
    --network host \
    --tmpfs /tmp:exec,size=2g \
    "${DOCKER_ARGS[@]}" \
    -w "$WORKSPACE" \
    -e TMPDIR=/tmp \
    "$IMAGE_NAME" \
    bash -c "Xvfb :99 -screen 0 1920x1080x24 &>/dev/null & export DISPLAY=:99 && sleep 1 && mkdir -p /workspace/.tmp &&.nasai --dangerously-skip-permissions"
