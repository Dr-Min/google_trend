// 유틸리티 함수 모음 (리눅스 최적화 버전)
const fs = require('fs');
const path = require('path');

/**
 * 구글 트렌드 데이터를 콘솔에 출력
 * @param {Array} trends 트렌드 데이터 배열
 */
function printTrendsToConsole(trends) {
  if (!trends || trends.length === 0) {
    console.log('\n구글 트렌드 데이터가 없습니다.\n');
    return;
  }

  console.log('\n===== 구글 트렌드 상위 5개 (미국, 지난 4시간) =====');
  console.log(`현재 시간: ${new Date().toLocaleString('ko-KR')}\n`);

  trends.forEach((trend, index) => {
    console.log(`${index + 1}. ${trend.title || '제목 없음'}`);
    console.log(`   검색량: ${trend.searchVolume || '정보 없음'}`);
    console.log(`   시작일: ${trend.startDate || '정보 없음'}`);
    console.log('');  // 빈 줄 추가
  });

  console.log('=================================================');
}

/**
 * 데이터의 유효성 검사 수행
 * @param {Array} data 검증할 데이터 배열
 * @returns {boolean} 유효성 여부
 */
function validateData(data) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return false;
  }

  // 각 항목이 필요한 속성을 가지고 있는지 확인
  return data.every(item => {
    return item && 
           typeof item === 'object' && 
           item.title && 
           typeof item.title === 'string';
  });
}

/**
 * 오브젝트를 포맷팅된 문자열로 변환
 * @param {Object} obj 변환할 오브젝트
 * @returns {string} 포맷팅된 문자열
 */
function formatObject(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (e) {
    return `[포맷팅 오류: ${e.message}]`;
  }
}

/**
 * 현재 타임스탬프 문자열 생성 (파일명 등에 사용)
 * @returns {string} 타임스탬프 문자열
 */
function getTimestamp() {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
}

/**
 * 디렉토리가 존재하는지 확인하고, 없으면 생성
 * @param {string} dirPath 확인할 디렉토리 경로
 */
function ensureDirExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(`디렉토리 생성됨: ${dirPath}`);
    } catch (error) {
      console.error(`디렉토리 생성 중 오류: ${error.message}`);
      throw error;
    }
  }
}

module.exports = {
  printTrendsToConsole,
  validateData,
  formatObject,
  getTimestamp,
  ensureDirExists
}; 