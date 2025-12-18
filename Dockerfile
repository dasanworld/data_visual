# Multi-stage Dockerfile for Django + React Monolith
# Stage 1: Build React frontend
# Stage 2: Python runtime with Django

# ============================================
# Stage 1: Build React Frontend
# ============================================
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

# Install dependencies first (better caching)
COPY frontend/package*.json ./
RUN npm ci --silent

# Copy source and build
COPY frontend/ ./
RUN npm run build

# ============================================
# Stage 2: Python Runtime
# ============================================
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBUG=False

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Create staticfiles directory and copy React build
RUN mkdir -p staticfiles
COPY --from=frontend-build /app/frontend/dist/ ./staticfiles/

# Collect static files
RUN python manage.py collectstatic --noinput

# Expose port
EXPOSE 8000

# Run with Gunicorn
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "2"]
