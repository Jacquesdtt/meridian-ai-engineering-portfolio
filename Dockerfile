# Use official Python 3.13 slim image
FROM python:3.13-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install pinned serving-only dependencies (DK-02). Versions come from
# requirements.lock so scikit-learn matches the pickled Models/ops preprocessor.
COPY requirements.serving.txt ./
RUN pip install --no-cache-dir -r requirements.serving.txt

# Copy the application code and necessary assets
COPY src/ /app/src/
COPY Models/ /app/Models/
# Read at runtime by GET /model/fairness and POST /rag/ask (re-included in .dockerignore)
COPY Docs/Sprint2/reports/fairlearn_equalized_odds.json /app/Docs/Sprint2/reports/
COPY Docs/Final_Report_Official.md /app/Docs/
# Prediction browser falls back to these when Data/processed/prediction_cohort.csv is absent
COPY Docs/Sprint4/fixtures/*.json /app/Docs/Sprint4/fixtures/

# Create Data/processed directory for SQLite db
RUN mkdir -p /app/Data/processed

# Expose port
EXPOSE 8000

# Public /health probe, no RBAC header needed (DK-06). Uses stdlib only.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"

# Command to run the application
CMD ["uvicorn", "src.serving.app:app", "--host", "0.0.0.0", "--port", "8000"]
