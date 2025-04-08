// 구글 스프레드시트 API 테스트 스크립트 (리눅스 환경용)
const fs = require('fs');
const path = require('path');
const { saveToGoogleSheet } = require('./googleSheets');

// 로그 설정
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, `test-sheets-${new Date().toISOString().replace(/:/g, '-')}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// 로그 함수
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

// 에러 로그 함수
function logError(message, error) {
  const timestamp = new Date().toISOString();
  const errorStack = error && error.stack ? `\n${error.stack}` : '';
  const logMessage = `[${timestamp}] ERROR: ${message}${error ? ': ' + error.message : ''}${errorStack}`;
  console.error(logMessage);
  logStream.write(logMessage + '\n');
}

// 설정 파일 로드
const configPath = path.join(__dirname, '../config.json');
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  log('설정 로드됨: ' + JSON.stringify(config));
} catch (e) {
  logError('설정 파일 로드 실패', e);
  process.exit(1);
}

// 테스트 데이터 생성
const testData = [
  {
    title: '테스트 검색어 1 (리눅스)',
    searchVolume: '검색 : 1만+회· 📈 활성 ·',
    startDate: '1만+ ⬆️ 500%'
  },
  {
    title: '테스트 검색어 2 (리눅스)',
    searchVolume: '검색 : 5천+회· 📈 활성 ·',
    startDate: '5천+ ⬆️ 250%'
  },
  {
    title: '테스트 검색어 3 (리눅스)',
    searchVolume: '검색 : 1천+회· 📈 활성 ·',
    startDate: '1천+ ⬆️ 150%'
  }
];

// 구글 스프레드시트에 저장 테스트
async function runTest() {
  log('구글 스프레드시트 API 테스트 시작...');
  
  try {
    // credentials.json 파일 확인
    const keyFilePath = path.join(__dirname, '../credentials.json');
    if (!fs.existsSync(keyFilePath)) {
      logError('credentials.json 파일이 없습니다. 테스트를 중단합니다.', null);
      return;
    }
    
    log(`인증 파일 발견: ${keyFilePath}`);
    
    // 구글 스프레드시트에 저장
    const result = await saveToGoogleSheet(testData, config.spreadsheetId);
    
    if (result) {
      log('테스트 성공! 스프레드시트 URL: ' + result);
    } else {
      log('테스트 실패: 결과가 null입니다.');
    }
  } catch (error) {
    logError('테스트 실패', error);
  } finally {
    // 로그 스트림 닫기
    logStream.end();
  }
}

// 즉시 실행
runTest().catch(error => {
  logError('테스트 실행 중 치명적 오류 발생', error);
  process.exit(1);
}); 