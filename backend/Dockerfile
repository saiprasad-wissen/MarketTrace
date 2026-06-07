# Use official Python lightweight image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /app

# Copy requirements file first to leverage Docker cache
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend application code
COPY . .

# Expose port (Render defaults to 10000 if not specified, but we'll bind dynamically)
EXPOSE 10000

# Start the FastAPI application, binding to $PORT (or 10000 by default)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}
