# Use the industry-standard face recognition image that comes with dlib and models PRE-INSTALLED
FROM ageitgey/face_recognition:latest

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Install basic system deps for web server
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Install remaining Python dependencies (WITHOUT dlib since it's already there)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Start the application
# Use socket_app to support Chat + FRS
CMD uvicorn main:socket_app --host 0.0.0.0 --port $PORT
