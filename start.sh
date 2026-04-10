#!/bin/sh
echo "{\"apiUrl\": \"${API_URL:-http://localhost:8000}\"}" > /app/dist/config.json
serve -s dist -l 3000
