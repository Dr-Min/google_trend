#!/bin/bash

# 4시간마다 구글 트렌드 크롤링 실행하는 cron 작업 설정 스크립트
# 실행 방법: sudo bash cron-setup.sh

echo "===== 구글 트렌드 크롤링 cron 설정 시작 ====="

# 현재 디렉토리의 절대 경로 가져오기
CURRENT_DIR=$(pwd)
USER=$(whoami)

# 실행 스크립트 생성
SCRIPT_PATH="${CURRENT_DIR}/run-crawler.sh"

cat > ${SCRIPT_PATH} << EOF
#!/bin/bash
export DISPLAY=:99
if ! pgrep Xvfb > /dev/null; then
  /usr/bin/Xvfb :99 -screen 0 1280x1024x24 > /dev/null 2>&1 &
fi
cd ${CURRENT_DIR}
/usr/bin/node ${CURRENT_DIR}/src/index.js >> ${CURRENT_DIR}/logs/cron-\$(date +\%Y-\%m-\%d).log 2>&1
EOF

# 실행 권한 부여
chmod +x ${SCRIPT_PATH}
echo "크롤링 실행 스크립트가 생성되었습니다: ${SCRIPT_PATH}"

# crontab에 작업 추가
CRON_JOB="0 */4 * * * ${SCRIPT_PATH}"

# 기존 crontab 백업
crontab -l > crontab_backup 2>/dev/null || echo "# 새 crontab 파일" > crontab_backup

# 중복 등록 방지
if grep -q "${SCRIPT_PATH}" crontab_backup; then
  echo "이미 crontab에 등록되어 있습니다."
else
  # crontab에 작업 추가
  echo "# 구글 트렌드 크롤링 - 4시간마다 실행" >> crontab_backup
  echo "${CRON_JOB}" >> crontab_backup
  crontab crontab_backup
  echo "crontab에 작업이 추가되었습니다."
fi

# 백업 파일 제거
rm crontab_backup

# crontab 서비스 재시작
if command -v systemctl > /dev/null; then
  sudo systemctl restart cron
elif command -v service > /dev/null; then
  sudo service cron restart
else
  echo "cron 서비스를 재시작할 수 없습니다. 수동으로 재시작해 주세요."
fi

echo "===== cron 설정 완료 ====="
echo "4시간마다 구글 트렌드 크롤링이 자동으로 실행됩니다."
echo "로그는 ${CURRENT_DIR}/logs 디렉토리에 저장됩니다." 