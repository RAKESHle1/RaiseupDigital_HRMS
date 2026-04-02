# Use Miniconda as the base for pre-compiled AI binaries
FROM continuumio/miniconda3:latest

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
# Add conda to the global search path
ENV PATH /opt/conda/bin:$PATH

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    git \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Install the heavy AI binaries via Conda (dlib and face_recognition)
RUN conda install -c conda-forge -y \
    python=3.10 \
    dlib \
    face_recognition \
    && conda clean -afy

# explicitly install setuptools (for pkg_resources) and face_recognition_models via pip
# this is because face_recognition's internal import catches ANY exception (including missing setuptools)
# and mistakenly says 'face_recognition_models' is not found.
RUN pip install --no-cache-dir setuptools face-recognition-models

# Install remaining backend dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Start the application - we explicitly use uvicorn from the path
CMD uvicorn main:socket_app --host 0.0.0.0 --port $PORT
