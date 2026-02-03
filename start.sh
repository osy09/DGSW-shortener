#!/bin/sh

# 환경변수를 파일로 저장 (Turbopack 빌드타임 치환 회피)
cat > /app/.env << EOF
TURSO_DATABASE_URL=$TURSO_DATABASE_URL
TURSO_AUTH_TOKEN=$TURSO_AUTH_TOKEN
ADMIN_SECRET=$ADMIN_SECRET
TOTP_SECRET=$TOTP_SECRET
JWT_SECRET=$JWT_SECRET
EOF

# 앱 실행 (0.0.0.0에 바인딩하여 외부 접근 허용)
HOSTNAME=0.0.0.0 node server.js
