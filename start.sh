#!/usr/bin/env bash
set -euo pipefail

# ─── Colours ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'
BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[INFO]${RESET} $*"; }
success() { echo -e "${GREEN}[OK]${RESET}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET} $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*" >&2; }

# ─── Flags ──────────────────────────────────────────────────────────────────
OBSERVABILITY=false
for arg in "$@"; do
  [[ "$arg" == "--observability" ]] && OBSERVABILITY=true
done

# ─── Docker: detect and auto-start ─────────────────────────────────────────
check_docker() {
  if ! command -v docker &>/dev/null; then
    error "Docker not found. Install Docker Desktop and retry."
    exit 1
  fi

  if ! docker info &>/dev/null 2>&1; then
    warn "Docker daemon is not running. Attempting to start Docker Desktop..."

    # Windows / WSL
    if command -v cmd.exe &>/dev/null; then
      cmd.exe /c "start /B \"\" \"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\"" 2>/dev/null || true
    # macOS
    elif [[ "$(uname)" == "Darwin" ]]; then
      open -a Docker 2>/dev/null || true
    fi

    info "Waiting for Docker to start (up to 60 s)..."
    local i=0
    until docker info &>/dev/null 2>&1; do
      sleep 2
      i=$((i + 2))
      if [[ $i -ge 60 ]]; then
        error "Docker did not start in time. Start Docker Desktop manually and retry."
        exit 1
      fi
    done
    success "Docker is running."
  else
    success "Docker is running."
  fi
}

# ─── Node.js version check ──────────────────────────────────────────────────
check_node() {
  if ! command -v node &>/dev/null; then
    error "Node.js not found. Install Node.js 22+ and retry."
    exit 1
  fi

  local major
  major=$(node -e "process.stdout.write(process.version.split('.')[0].replace('v',''))")
  if [[ "$major" -lt 22 ]]; then
    error "Node.js 22+ required. Found: $(node --version). Install a newer version and retry."
    exit 1
  fi
  success "Node.js $(node --version) found."
}

# ─── Prerequisites ──────────────────────────────────────────────────────────
info "Checking prerequisites..."
check_node
check_docker

# ─── .env ───────────────────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  info "Creating .env from .env.example..."
  cp .env.example .env
  success ".env created."
else
  success ".env already exists."
fi

# ─── node_modules ───────────────────────────────────────────────────────────
if [[ ! -d node_modules ]]; then
  info "Installing dependencies..."
  npm install
  success "Dependencies installed."
else
  success "node_modules found."
fi

# ─── Docker Compose ─────────────────────────────────────────────────────────
COMPOSE_FILES="-f docker-compose.yml"
if [[ "$OBSERVABILITY" == "true" ]]; then
  info "Observability stack enabled."
  COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.observability.yml"
fi

info "Starting Docker Compose services..."
# shellcheck disable=SC2086
docker compose $COMPOSE_FILES up -d

# ─── Wait for Postgres ──────────────────────────────────────────────────────
info "Waiting for Postgres to be ready..."
until docker compose $COMPOSE_FILES exec -T postgres pg_isready -U postgres -d profile_service &>/dev/null; do
  sleep 2
done
success "Postgres is ready."

# ─── Wait for RabbitMQ ──────────────────────────────────────────────────────
info "Waiting for RabbitMQ to be ready..."
until docker compose $COMPOSE_FILES exec -T rabbitmq rabbitmq-diagnostics check_port_connectivity &>/dev/null; do
  sleep 2
done
success "RabbitMQ is ready."

# ─── Access URLs ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}Infrastructure is up!${RESET}"
echo -e "  ${CYAN}Swagger UI:${RESET}   http://localhost:3001/docs"
echo -e "  ${CYAN}RabbitMQ UI:${RESET}  http://localhost:15672  (guest / guest)"
if [[ "$OBSERVABILITY" == "true" ]]; then
  echo -e "  ${CYAN}Grafana:${RESET}      http://localhost:3001"
  echo -e "  ${CYAN}Prometheus:${RESET}   http://localhost:9090"
fi
echo ""

# ─── Start service ───────────────────────────────────────────────────────────
info "Starting profile-service (npm run dev)..."
npm run dev
