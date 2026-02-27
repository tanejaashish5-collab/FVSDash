FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    fontconfig \
    libfreetype6 \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --upgrade pip && pip install -r backend/requirements.txt

COPY . .

RUN chmod +x /app/start.sh

ENV PORT=8000
EXPOSE 8000

CMD ["/app/start.sh"]
