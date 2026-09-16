FROM python:3.12-slim AS base
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /workspace/backend

# 依赖层：先装依赖，利用缓存
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 应用代码
COPY backend/app ./app
COPY backend/scripts ./scripts

RUN mkdir -p /data
ENV DATABASE_URL=file:/data/app.db

EXPOSE 3001

# 建表 / 演示数据 / 向量索引在应用启动的 lifespan 里自动完成
HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:3001/api/health').status==200 else 1)" || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3001"]
