#!/bin/bash

# 구글 트렌드 크롤링 설정 스크립트 (리눅스 환경용)
# 실행 방법: sudo bash setup.sh

echo "===== 구글 트렌드 크롤링 설정 스크립트 시작 ====="
echo "현재 작업 디렉토리: $(pwd)"

# 필요한 디렉토리 생성
mkdir -p logs

# Node.js 확인 및 설치
if ! command -v node &> /dev/null; then
    echo "Node.js가 설치되어 있지 않습니다. 설치를 시작합니다..."
    
    # Node.js 저장소 추가
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    
    # Node.js 설치
    sudo apt-get install -y nodejs
    
    echo "Node.js 설치 완료: $(node -v)"
else
    echo "Node.js가 이미 설치되어 있습니다: $(node -v)"
fi

# Puppeteer 의존성 패키지 설치
echo "Puppeteer 의존성 패키지 설치 중..."
sudo apt-get update
sudo apt-get install -y \
    gconf-service \
    libasound2 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgcc1 \
    libgconf-2-4 \
    libgdk-pixbuf2.0-0 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    fonts-liberation \
    libappindicator1 \
    libnss3 \
    lsb-release \
    xdg-utils \
    wget \
    fonts-nanum \
    xvfb

# npm 패키지 설치
echo "npm 패키지 설치 중..."
npm install

# 실행 권한 설정
chmod +x ./src/index.js

# 가상 디스플레이 설정 (Xvfb)
echo "가상 디스플레이 설정 확인 중..."
if ! command -v Xvfb &> /dev/null; then
    echo "Xvfb가 이미 설치되어 있습니다."
else
    echo "Xvfb를 설치합니다..."
    sudo apt-get install -y xvfb
fi

# 테스트 파일 크롤링
echo "크롤링 테스트를 실행합니다..."
export DISPLAY=:99
Xvfb :99 -screen 0 1280x1024x24 > /dev/null 2>&1 &
NODE_ENV=production node ./src/index.js

echo "===== 구글 트렌드 크롤링 설정 완료 =====" 