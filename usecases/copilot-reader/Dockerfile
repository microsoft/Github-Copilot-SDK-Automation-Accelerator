# ── Stage 1: Build the React frontend ────────────────────────
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Runtime — Python + Node.js ──────────────────────
FROM python:3.12-slim

# Install Node.js 20 (needed for @github/copilot CLI)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl ca-certificates gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
        > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && apt-get purge -y gnupg && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Install Copilot CLI globally (required by the Copilot SDK)
RUN npm install -g @github/copilot

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \
    && chmod +x /usr/local/lib/python3.12/site-packages/copilot/bin/*

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend into backend/static for serving
COPY --from=frontend-build /app/frontend/dist ./backend/static

# Create the data directory (books stored at runtime)
RUN mkdir -p /app/data

EXPOSE 8000

# Run from backend/ so bare imports (epub_processor, copilot_chat, etc.) work
WORKDIR /app/backend
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
