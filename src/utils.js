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
  
  // 데이터 형식 정리
  const formattedData = data.map(item => {
    // 검색량 형식 조정
    let searchVolume = '';
    if (item.searchVolume && item.searchVolume !== '검색량 정보 없음') {
      // 원본 값에서 필요한 정보 추출
      const volumeMatch = item.searchVolume.match(/(\d+[만천\+]*회)/);
      const isActive = item.searchVolume.includes('활성') || item.searchVolume.includes('trending_up');
      const timeMatch = item.searchVolume.match(/(\d+)\s*시간\s*전/);
      
      // 새 형식으로 조합
      searchVolume = `검색 : ${volumeMatch ? volumeMatch[0] : '정보 없음'}· ${isActive ? '📈 활성' : '⏱️ 지속됨'} ·${timeMatch ? timeMatch[0] : ''}`;
    } else {
      searchVolume = '검색 : 정보 없음';
    }
    
    // 시작일 형식 조정
    let startDate = '';
    if (item.startDate && item.startDate !== '시작일 정보 없음') {
      // 숫자와 증가율 추출
      const volumeMatch = item.startDate.match(/(\d+[만천\+]*)/);
      const increaseMatch = item.startDate.match(/(\d+%)/);
      
      // 새 형식으로 조합
      startDate = `${volumeMatch ? volumeMatch[0] : ''} ⬆️ ${increaseMatch ? increaseMatch[0] : ''}`;
    } else {
      startDate = '정보 없음';
    }
    
    return {
      title: item.title,
      searchVolume,
      startDate
    };
  });
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const filePath = path.join(resultsDir, `${fileName}_${timestamp}.json`);
  
  fs.writeFileSync(filePath, JSON.stringify(formattedData, null, 2), 'utf-8');
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
  
  // 데이터 형식 정리 (콘솔 출력용)
  const formattedTrends = trends.map(item => {
    // 검색량 형식 조정
    let searchVolume = '';
    if (item.searchVolume && item.searchVolume !== '검색량 정보 없음') {
      // 원본 값에서 필요한 정보 추출
      const volumeMatch = item.searchVolume.match(/(\d+[만천\+]*회)/);
      const isActive = item.searchVolume.includes('활성') || item.searchVolume.includes('trending_up');
      const timeMatch = item.searchVolume.match(/(\d+)\s*시간\s*전/);
      
      // 새 형식으로 조합
      searchVolume = `검색 : ${volumeMatch ? volumeMatch[0] : '정보 없음'}· ${isActive ? '📈 활성' : '⏱️ 지속됨'} ·${timeMatch ? timeMatch[0] : ''}`;
    } else {
      searchVolume = '검색 : 정보 없음';
    }
    
    // 시작일 형식 조정
    let startDate = '';
    if (item.startDate && item.startDate !== '시작일 정보 없음') {
      // 숫자와 증가율 추출
      const volumeMatch = item.startDate.match(/(\d+[만천\+]*)/);
      const increaseMatch = item.startDate.match(/(\d+%)/);
      
      // 새 형식으로 조합
      startDate = `${volumeMatch ? volumeMatch[0] : ''} ⬆️ ${increaseMatch ? increaseMatch[0] : ''}`;
    } else {
      startDate = '정보 없음';
    }
    
    return {
      title: item.title,
      searchVolume,
      startDate
    };
  });
  
  // 각 트렌드 항목 출력
  formattedTrends.forEach((trend, index) => {
    console.log(`${index + 1}. ${trend.title || '제목 없음'}`);
    console.log(`   검색량: ${trend.searchVolume}`);
    console.log(`   시작일: ${trend.startDate}`);
    console.log(''); // 각 항목 사이 빈 줄 추가
  });
  
  console.log('=================================================');
}

module.exports = {
  saveToFile,
  printTrendsToConsole
}; 