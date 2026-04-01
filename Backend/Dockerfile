# Use Miniconda as the base for pre-compiled AI binaries
FROM continuumio/miniconda3:latest

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install the heavy dlib binary via Conda (PRE-COMPILED - NO BUILDING!)
RUN conda install -c conda-forge -y \
    python=3.10 \
    dlib \
    && conda clean -afy

# Install Face Recognition and its Models specifically via Pip inside Conda
# This ensures all AI weights are downloaded correctly
RUN pip install --no-cache-dir face-recognition face-recognition-models

# Install remaining backend dependencies via Pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Start the application using socket_app
# We explicitly set the port to $PORT which Render provides
CMD uvicorn main:socket_app --host 0.0.0.0 --port $PORT
