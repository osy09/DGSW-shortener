#!/bin/sh

# 데이터베이스 초기화 (테이블 생성)
node node_modules/prisma/build/index.js db push --skip-generate

# 앱 실행 (0.0.0.0에 바인딩하여 외부 접근 허용)
HOSTNAME=0.0.0.0 node server.js
