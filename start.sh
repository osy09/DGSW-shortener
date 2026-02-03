#!/bin/sh

# Turso 원격 DB를 사용하므로 로컬 데이터 디렉토리 불필요
# Prisma 마이그레이션은 Turso CLI로 별도 실행

# 앱 실행 (0.0.0.0에 바인딩하여 외부 접근 허용)
HOSTNAME=0.0.0.0 node server.js
