# Use the most stable foundation for AI on Linux
FROM python:3.8-slim-bullseye

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install only basic runtime libraries for AI images
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Upgrade pip to latest to ensure it handles wheels correctly
RUN pip install --no-cache-dir --upgrade pip wheel setuptools

# FORCE the use of pre-compiled binaries to avoid RAM-intensive building
# Note: Python 3.8 amd64 Linux has official binaries for these on PyPI
RUN pip install --no-cache-dir --only-binary :all: dlib==19.22.1
RUN pip install --no-cache-dir --only-binary :all: face-recognition

# Install remaining backend dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Start the application
CMD uvicorn main:socket_app --host 0.0.0.0 --port $PORT
