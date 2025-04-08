// Google Sheets API 테스트 스크립트
const fs = require('fs');
const path = require('path');
const { saveToGoogleSheet } = require('./googleSheets');

// 설정 파일 로드
const configPath = path.join(__dirname, '../config.json');
let config;
try {
  config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  console.log('설정 로드됨:', config);
} catch (e) {
  console.error('설정 파일 로드 실패:', e.message);
  process.exit(1);
}

// 테스트 데이터 생성
const testData = [
  {
    title: '테스트 검색어 1',
    searchVolume: '검색 : 1만+회',
    startDate: '1시간 전↑ 활성',
  },
  {
    title: '테스트 검색어 2',
    searchVolume: '검색 : 5천+회',
    startDate: '2시간 전↑ 활성',
  },
  {
    title: '테스트 검색어 3',
    searchVolume: '검색 : 1천+회',
    startDate: '3시간 전↑ 활성',
  },
];

// Google Sheets에 저장 테스트
async function runTest() {
  console.log('Google Sheets API 테스트 시작...');
  
  try {
    const result = await saveToGoogleSheet(testData, config.spreadsheetId);
    
    if (result) {
      console.log('테스트 성공! 스프레드시트 URL:', result);
    } else {
      console.log('테스트 실패: 결과가 null입니다.');
    }
  } catch (error) {
    console.error('테스트 실패:', error);
  }
}

// 테스트 실행
runTest().catch(console.error); 