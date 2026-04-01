# Use Python 3.8 Slim Bullseye for maximum stability and speed
FROM python:3.8-slim-bullseye

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install ONLY the base runtime libraries needed for OpenCV/AI
# We skip the heavy "build" tools (cmake/gcc) because we use pre-built wheels
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Install dependencies - FAST download of pre-built files
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir face-recognition

# Copy project
COPY . .

# Start the application
CMD uvicorn main:socket_app --host 0.0.0.0 --port $PORT
