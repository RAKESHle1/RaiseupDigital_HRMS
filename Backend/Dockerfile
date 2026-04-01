# Use Miniconda as the base for pre-compiled AI binaries
FROM continuumio/miniconda3:latest

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install the heavy dlib binary via Conda
RUN conda install -c conda-forge -y \
    python=3.10 \
    dlib \
    && conda clean -afy

# FORCE install Face Recognition and its Models into the EXACT conda environment
# We use the full path to conda's pip to be 100% sure
RUN /opt/conda/bin/pip install --no-cache-dir face-recognition
RUN /opt/conda/bin/pip install --no-cache-dir git+https://github.com/ageitgey/face_recognition_models

# Install remaining backend dependencies
COPY requirements.txt .
RUN /opt/conda/bin/pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Start the application using the full path to uvicorn
CMD /opt/conda/bin/uvicorn main:socket_app --host 0.0.0.0 --port $PORT
