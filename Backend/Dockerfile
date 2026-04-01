# Use Python 3.8 because it has pre-compiled dlib wheels for Linux!
# This avoids all memory crashes on Render.
FROM python:3.8-slim-buster

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip wheel

# Install dependencies - This will be FAST because pip will find pre-built wheels for 3.8
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir face-recognition

# Copy project
COPY . .

# Start the application
CMD uvicorn main:socket_app --host 0.0.0.0 --port $PORT
