const fs = require('fs');
const path = require('path');

/**
 * 결과를 파일로 저장하는 함수
 * @param {Array} data - 저장할 데이터
 * @param {string} fileName - 저장할 파일 이름 (확장자 제외)
 * @returns {string} 저장된 파일 경로
 */
function saveToFile(data, fileName = 'trends') {
  const resultsDir = path.join(__dirname, '../results');
  
  // 결과 디렉토리가 없으면 생성
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const filePath = path.join(resultsDir, `${fileName}_${timestamp}.json`);
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return filePath;
}

/**
 * 콘솔에 결과를 출력하는 함수
 * @param {Array} trends - 트렌드 데이터 배열
 */
function printTrendsToConsole(trends) {
  console.log('\n===== 구글 트렌드 상위 5개 (미국, 지난 4시간) =====');
  console.log('현재 시간: ' + new Date().toLocaleString('ko-KR') + '\n');
  
  if (!trends || trends.length === 0) {
    console.log('데이터를 가져오지 못했습니다.');
    return;
  }
  
  // 각 트렌드 항목 출력
  trends.forEach((trend, index) => {
    console.log(`${index + 1}. ${trend.title || '제목 없음'}`);
    
    // 검색량 정보 출력
    if (trend.searchVolume && trend.searchVolume !== '검색량 정보 없음') {
      // 중복된 정보 제거 및 포맷 정리
      let searchVolumeFormatted = trend.searchVolume
        .replace(/trending_up/g, '↑')
        .replace(/·/g, ' • ')
        .replace(/회회/g, '회')
        .replace(/arrow_upward/g, '↑ ');
      
      // 제목이 검색량에 포함된 경우 제거
      if (trend.title && searchVolumeFormatted.includes(trend.title)) {
        searchVolumeFormatted = searchVolumeFormatted.replace(trend.title, '').trim();
        if (searchVolumeFormatted.startsWith('검색')) {
          searchVolumeFormatted = searchVolumeFormatted.trim();
        } else {
          searchVolumeFormatted = '검색' + searchVolumeFormatted.trim();
        }
      }
      
      console.log(`   검색량: ${searchVolumeFormatted}`);
    } else {
      console.log(`   검색량: 정보 없음`);
    }
    
    // 시작일 정보 출력
    if (trend.startDate && trend.startDate !== '시작일 정보 없음') {
      const startDateFormatted = trend.startDate
        .replace(/trending_up/g, '↑')
        .replace(/·/g, ' • ')
        .replace(/arrow_upward/g, '↑ ')
        .replace(/timelapse/g, '⏱ ');
      console.log(`   시작일: ${startDateFormatted}`);
    } else {
      console.log(`   시작일: 정보 없음`);
    }
    
    console.log(''); // 각 항목 사이 빈 줄 추가
  });
  
  console.log('=================================================');
}

module.exports = {
  saveToFile,
  printTrendsToConsole
}; 