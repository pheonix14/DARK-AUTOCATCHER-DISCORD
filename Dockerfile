FROM python:3.11-slim

# Set working directory
WORKDIR /app

ENV DOCKER=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Expose HTTP dashboard and WebSocket log streams
EXPOSE 8085 8086

# Start the watchdog process which spins up the kernel
CMD ["python", "main.py"]
