# Use an official Python runtime as a parent image
FROM python:3.10-slim-bullseye

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies needed for dlib and opencv
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
# We install dlib carefully to avoid memory peaks
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir wheel
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Start the application
# We use socket_app to handle both REST and Real-time chat
CMD uvicorn main:socket_app --host 0.0.0.0 --port $PORT
