const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

/**
 * 결과를 파일로 저장하는 함수
 * @param {Array} data - 저장할 데이터
 * @param {string} fileName - 저장할 파일 이름 (확장자 제외)
 * @returns {Promise<string>} 저장된 파일 경로
 */
async function saveToFile(data, fileName = 'trends') {
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
      startDate = `${volumeMatch ? volumeMatch[0] : ''} ⬆️ ${increaseMatch && increaseMatch[0] !== '000%' ? increaseMatch[0] : '1,000%'}`;
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
  
  // 스프레드시트로도 저장
  await saveToExcel(formattedData, `${fileName}_${timestamp}`);
  
  return filePath;
}

/**
 * 결과를 엑셀 파일로 저장하는 함수
 * @param {Array} data - 저장할 데이터
 * @param {string} fileName - 사용하지 않음 (이전 버전 호환성 유지)
 * @returns {Promise<string>} 저장된 파일 경로
 */
async function saveToExcel(data, fileName = 'trends') {
  // 1단계: 변수 및 경로 설정
  const resultsDir = path.join(__dirname, '../results');
  const fixedFileName = 'google_trends_data.xlsx';
  const filePath = path.join(resultsDir, fixedFileName);
  
  // 현재 타임스탬프 (파일명에 사용)
  const timestamp = new Date().getTime();
  const uniqueFileName = `google_trends_data_${timestamp}.xlsx`;
  const uniqueFilePath = path.join(resultsDir, uniqueFileName);
  
  // 디렉토리 확인 및 생성
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
    console.log(`결과 디렉토리를 생성했습니다: ${resultsDir}`);
  }

  // 2단계: 현재 날짜, 시간 정보 준비
  const now = new Date();
  const dateStr = now.toLocaleDateString('ko-KR');
  const timeStr = now.toLocaleTimeString('ko-KR');
  console.log(`현재 데이터 수집 시간: ${dateStr} ${timeStr}`);
  
  // 3단계: 워크북 및 워크시트 준비
  let workbook = new ExcelJS.Workbook();
  let worksheet;
  let existingData = [];
  let rowCount = 0;
  
  // 4단계: 기존 파일 처리
  if (fs.existsSync(filePath)) {
    try {
      console.log(`기존 엑셀 파일 열기 시도: ${filePath}`);
      
      // 기존 파일 읽기
      await workbook.xlsx.readFile(filePath);
      
      // 워크시트 가져오기
      worksheet = workbook.getWorksheet('구글 트렌드');
      
      if (worksheet) {
        console.log(`기존 워크시트 발견. 현재 행 수: ${worksheet.rowCount}`);
        rowCount = worksheet.rowCount;
        
        // 중복 방지를 위한 기존 데이터 캐싱
        for (let i = 2; i <= worksheet.rowCount; i++) {
          const row = worksheet.getRow(i);
          const collectionDate = row.getCell(1).value;
          const collectionTime = row.getCell(2).value;
          const title = row.getCell(4).value;
          
          if (title) {
            existingData.push({
              key: `${collectionDate}_${collectionTime}_${title}`,
              row: i
            });
          }
        }
      } else {
        // 워크시트가 없으면 새로 생성
        console.log('워크시트를 찾을 수 없어 새로 생성합니다.');
        worksheet = workbook.addWorksheet('구글 트렌드');
        
        // 헤더 설정
        worksheet.columns = [
          { header: '수집 날짜', key: 'collectionDate', width: 20 },
          { header: '수집 시간', key: 'collectionTime', width: 20 },
          { header: '순위', key: 'rank', width: 10 },
          { header: '검색어', key: 'title', width: 30 },
          { header: '검색량', key: 'searchVolume', width: 30 },
          { header: '증가율', key: 'startDate', width: 30 }
        ];
        
        // 헤더 스타일 설정
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE6F0FF' }
        };
      }
    } catch (err) {
      console.warn(`기존 파일을 읽는 중 오류 발생: ${err.message}`);
      console.log('새 워크북으로 시작합니다.');
      
      // 오류 발생 시 새 워크북 생성
      workbook = new ExcelJS.Workbook();
      workbook.creator = '구글 트렌드 크롤러';
      workbook.lastModifiedBy = '구글 트렌드 크롤러';
      workbook.created = now;
      workbook.modified = now;
      
      // 새 워크시트 생성
      worksheet = workbook.addWorksheet('구글 트렌드');
      
      // 헤더 설정
      worksheet.columns = [
        { header: '수집 날짜', key: 'collectionDate', width: 20 },
        { header: '수집 시간', key: 'collectionTime', width: 20 },
        { header: '순위', key: 'rank', width: 10 },
        { header: '검색어', key: 'title', width: 30 },
        { header: '검색량', key: 'searchVolume', width: 30 },
        { header: '증가율', key: 'startDate', width: 30 }
      ];
      
      // 헤더 스타일 설정
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FF' }
      };
    }
  } else {
    console.log('새 엑셀 파일을 생성합니다.');
    
    // 새 워크시트 생성
    worksheet = workbook.addWorksheet('구글 트렌드');
    
    // 헤더 설정
    worksheet.columns = [
      { header: '수집 날짜', key: 'collectionDate', width: 20 },
      { header: '수집 시간', key: 'collectionTime', width: 20 },
      { header: '순위', key: 'rank', width: 10 },
      { header: '검색어', key: 'title', width: 30 },
      { header: '검색량', key: 'searchVolume', width: 30 },
      { header: '증가율', key: 'startDate', width: 30 }
    ];
    
    // 헤더 스타일 설정
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6F0FF' }
    };
  }
  
  // 5단계: 새 데이터 추가 (중복 확인)
  console.log(`새 데이터 ${data.length}개 처리 중...`);
  let addedCount = 0;
  const existingKeys = new Set(existingData.map(item => item.key));
  
  data.forEach((item, index) => {
    const key = `${dateStr}_${timeStr}_${item.title}`;
    
    // 중복되지 않는 데이터만 추가
    if (!existingKeys.has(key)) {
      const newRow = worksheet.addRow([
        dateStr,                // 수집 날짜
        timeStr,                // 수집 시간
        index + 1,              // 순위
        item.title,             // 검색어
        item.searchVolume,      // 검색량
        item.startDate          // 증가율
      ]);
      
      // 짝수/홀수 행 스타일 적용
      if (worksheet.rowCount % 2 === 0) {
        newRow.eachCell(cell => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' }
          };
        });
      }
      
      addedCount++;
      existingKeys.add(key); // 추가 완료 표시
    }
  });
  
  console.log(`새로 추가된 데이터 행 수: ${addedCount}`);
  
  // 6단계: 엑셀 파일 스타일 및 설정 적용
  // 셀 고정 (헤더 행)
  worksheet.views = [
    { state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }
  ];
  
  // 열 너비 자동 조정
  worksheet.columns.forEach(column => {
    if (!column.width || column.width < 15) column.width = 15;
  });
  
  // 자동 필터 적용
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: worksheet.rowCount, column: 6 }
  };
  
  // 7단계: 파일 저장 (안전하게 처리)
  console.log(`엑셀 파일 저장 시작... 현재 행 수: ${worksheet.rowCount}`);
  
  try {
    // 먼저 임시 파일에 저장
    await workbook.xlsx.writeFile(uniqueFilePath);
    console.log(`임시 파일로 저장 완료: ${uniqueFilePath}`);
    
    // 기존 파일이 있으면 백업
    if (fs.existsSync(filePath)) {
      try {
        const backupName = `${fixedFileName}.backup.${timestamp}.xlsx`;
        const backupPath = path.join(resultsDir, backupName);
        fs.renameSync(filePath, backupPath);
        console.log(`기존 파일을 백업했습니다: ${backupName}`);
      } catch (renameErr) {
        console.warn(`파일 백업 중 오류 (처리 계속): ${renameErr.message}`);
      }
    }
    
    // 임시 파일을 최종 파일명으로 변경
    fs.renameSync(uniqueFilePath, filePath);
    console.log(`파일명 변경 완료: ${uniqueFileName} -> ${fixedFileName}`);
    
    console.log(`엑셀 파일이 성공적으로 저장되었습니다. 총 ${rowCount - 1}개 기존 데이터에 ${addedCount}개 항목 추가됨.`);
    return filePath;
  } catch (saveErr) {
    console.error(`엑셀 파일 저장 중 오류: ${saveErr.message}`);
    
    // 에러 발생 시 JSON으로 백업
    try {
      const jsonBackupPath = path.join(resultsDir, `excel_save_error_${timestamp}.json`);
      fs.writeFileSync(jsonBackupPath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`저장 오류로 JSON 백업 생성: ${jsonBackupPath}`);
    } catch (jsonErr) {
      console.error(`JSON 백업 생성 실패: ${jsonErr.message}`);
    }
    
    return null;
  }
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
      startDate = `${volumeMatch ? volumeMatch[0] : ''} ⬆️ ${increaseMatch && increaseMatch[0] !== '000%' ? increaseMatch[0] : '1,000%'}`;
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
  saveToExcel,
  printTrendsToConsole
}; 