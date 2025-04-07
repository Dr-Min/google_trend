const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { saveToFile, printTrendsToConsole } = require('./utils');
const { saveToGoogleSheet, getSpreadsheetId } = require('./googleSheets');

// 설정 파일 로드
let config = {
  saveToExcel: true,
  saveToGoogleSheet: false,
  saveToJsonFile: true
};

try {
  const configPath = path.join(__dirname, '../config.json');
  if (fs.existsSync(configPath)) {
    const loadedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config = { ...config, ...loadedConfig };
  }
} catch (error) {
  console.warn('설정 파일 로드 중 오류:', error.message);
}

/**
 * 구글 트렌드에서 미국 지역의 지난 4시간 동안의 상위 5개 트렌드를 크롤링하는 함수
 * @returns {Promise<Array>} 상위 5개 트렌드 데이터
 */
async function crawlGoogleTrends() {
  console.log('구글 트렌드 크롤링을 시작합니다...');
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--window-size=1920,1080'],
    devtools: true // 개발자 도구 자동 실행
  });

  try {
    const page = await browser.newPage();
    
    // 페이지 콘솔 로그를 Node.js 콘솔에 표시
    page.on('console', message => 
      console.log(`브라우저 콘솔: ${message.type().substr(0, 3).toUpperCase()} ${message.text()}`)
    );
    
    // 타임아웃 시간 증가
    await page.setDefaultNavigationTimeout(180000); // 3분
    
    // 구글 트렌드 페이지 방문 (미국, 4시간)
    await page.goto('https://trends.google.co.kr/trending?geo=US&hl=ko&hours=4', {
      waitUntil: 'networkidle2',
      timeout: 180000, // 타임아웃 3분으로 증가
    });
    
    console.log('페이지에 접속했습니다. 데이터를 가져오는 중...');
    
    // 페이지가 제대로 로드될 때까지 더 오래 대기
    await page.waitForTimeout(10000); // 10초로 증가
    
    // 시간 필터 설정 시도 (드롭다운에서 '지난 4시간' 선택)
    try {
      console.log('시간 필터 설정 시도 중...');
      // 드롭다운 클릭
      await page.click('button[aria-label*="시간"], span:has-text("지난 24시간"), button:has-text("지난 24시간")');
      await page.waitForTimeout(1000);
      
      // '지난 4시간' 옵션 클릭
      await page.click('li:has-text("지난 4시간"), span:has-text("지난 4시간")');
      await page.waitForTimeout(1000);
      
      console.log('시간 필터가 적용되었습니다.');
    } catch (error) {
      console.log('시간 필터 설정 중 오류:', error.message);
      console.log('이미 올바른 시간 필터가 적용되어 있을 수 있습니다.');
    }
    
    // 페이지 스크롤 실행
    console.log('페이지 스크롤 시작...');
    await autoScroll(page);
    
    // 트렌드 데이터가 있는지 확인
    const hasData = await page.evaluate(() => {
      return document.body.textContent.includes('검색') && 
            (document.body.textContent.includes('회') || 
             document.body.textContent.includes('trending') ||
             document.body.textContent.includes('트렌드'));
    });
    
    // 데이터가 없으면 페이지 새로고침
    if (!hasData) {
      console.log('데이터가 로드되지 않았습니다. 페이지를 새로고침합니다...');
      await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForTimeout(10000); // 대기 시간 증가
      await autoScroll(page); // 다시 스크롤
    }
    
    // 페이지 로드 대기 (타임아웃 증가)
    await page.waitForSelector('body', { timeout: 60000 })
      .catch(async () => {
        console.log('기본 요소를 찾을 수 없습니다. DOM 구조를 분석합니다...');
        
        // 디버깅: 페이지 HTML을 콘솔에 출력
        const html = await page.content();
        console.log('페이지 HTML 구조의 일부:');
        console.log(html.substring(0, 1000) + '...');
        
        // 디버깅: DOM 요소 검색을 위한 함수 실행
        await page.evaluate(() => {
          // 페이지에서 가능한 요소 검색
          const tables = document.querySelectorAll('table');
          console.log(`페이지에 테이블 요소 수: ${tables.length}`);
          
          if (tables.length === 0) {
            // 다른 가능한 요소들 검색
            console.log('가능한 트렌드 요소 검색 중...');
            
            // 트렌드 관련 클래스 탐색
            document.querySelectorAll('*').forEach(el => {
              if (el.className && typeof el.className === 'string' && 
                  (el.className.includes('trend') || el.className.includes('rank') || 
                   el.className.includes('search') || el.className.includes('item'))) {
                console.log(`가능한 트렌드 요소: ${el.tagName}.${el.className}`);
              }
            });
          }
        });
      });
    
    // 스크린샷 저장 (디버깅용)
    const screenshotPath = path.join(process.cwd(), 'debug-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`스크린샷이 저장되었습니다: ${screenshotPath}`);
    
    // 트렌드 데이터 추출 (다양한 방법으로 시도)
    const trends = await page.evaluate(() => {
      console.log('트렌드 항목 찾기 시도...');
      
      // 결과 저장 배열
      const resultItems = [];
      
      // 1. 테이블에서 데이터 추출 시도
      try {
        const tableRows = document.querySelectorAll('tr');
        console.log(`테이블 행 수: ${tableRows.length}`);
        
        if (tableRows.length > 0) {
          Array.from(tableRows).forEach((row, index) => {
            if (index === 0) return; // 헤더 행 건너뛰기
            
            const columns = row.querySelectorAll('td');
            if (columns.length >= 2) {
              let title = columns[0]?.textContent?.trim() || '';
              const searchVolume = columns[1]?.textContent?.trim() || '검색량 정보 없음';
              
              // 검색량에서 활성 여부 확인
              const isActive = (columns[1]?.innerHTML || '').includes('trending_up') || 
                              (columns[1]?.innerHTML || '').includes('활성');
              
              // 시작일과 증가율 정보 추출
              const startDateEl = columns[2];
              let startDate = startDateEl?.textContent?.trim() || '시작일 정보 없음';
              let increaseRate = '1,000%'; // 기본값
              
              // 증가율 정보가 있는지 확인
              if (startDateEl?.innerHTML) {
                const rateMatch = startDateEl.innerHTML.match(/(\d+[,\d]*%)/);
                if (rateMatch && rateMatch[1]) {
                  increaseRate = rateMatch[1];
                }
              }
              
              // 검색량에서 숫자 추출
              let volumeNumber = '정보 없음';
              const volumeMatch = searchVolume.match(/(\d+[만천\+]*회)/);
              if (volumeMatch && volumeMatch[1]) {
                volumeNumber = volumeMatch[1];
              }
              
              // 제목이 없는 경우 두 번째 열에서 추출 시도
              if (!title || title === '제목 없음') {
                if (searchVolume.includes('검색')) {
                  const parts = searchVolume.split('검색');
                  if (parts.length > 0 && parts[0].trim()) {
                    title = parts[0].trim();
                  }
                }
              }
              
              if (title && title !== '제목 없음') {
                // 새 형식의 검색량과 시작일 정보 생성
                const formattedSearchVolume = `검색 : ${volumeNumber}· ${isActive ? '📈 활성' : '⏱️ 지속됨'} ·${startDate.includes('시간') ? startDate : ''}`;
                const formattedStartDate = `${volumeNumber.replace('회', '')} ⬆️ ${increaseRate}`;
                
                resultItems.push({ 
                  title, 
                  searchVolume: formattedSearchVolume, 
                  startDate: formattedStartDate 
                });
              }
            }
          });
        }
      } catch (e) {
        console.log('테이블 추출 중 오류:', e.message);
      }
      
      // 2. 검색어 기반 탐색
      if (resultItems.length < 5) {
        try {
          console.log('검색어 기반 탐색 시도...');
          
          // 모든 요소 검색
          const allElements = document.querySelectorAll('*');
          const seenTitles = new Set(resultItems.map(item => item.title));
          
          // 검색 패턴이 있는 요소 찾기
          allElements.forEach(el => {
            if (resultItems.length >= 5) return;
            
            const text = el.textContent?.trim() || '';
            if (text.includes('검색') && (text.includes('회') || text.includes('만+')) && text.length < 200) {
              // 내용이 너무 길면 제외 (전체 페이지 같은 요소 배제)
              const parts = text.split('검색');
              if (parts.length > 0 && parts[0].trim()) {
                const title = parts[0].trim();
                
                // 이미 처리된 제목 건너뛰기
                if (seenTitles.has(title) || title === '제목 없음') return;
                seenTitles.add(title);
                
                // 검색량 추출
                let volumeNumber = '정보 없음';
                const volumeMatch = text.match(/(\d+[만천\+]*회)/);
                if (volumeMatch && volumeMatch[1]) {
                  volumeNumber = volumeMatch[1];
                }
                
                // 활성 여부 확인
                const isActive = text.includes('trending_up') || text.includes('활성');
                
                // 시간 정보 추출
                let timeInfo = '';
                if (text.includes('시간 전')) {
                  const timeMatch = text.match(/(\d+)\s*시간\s*전/);
                  if (timeMatch && timeMatch[1]) {
                    timeInfo = `${timeMatch[1]}시간 전`;
                  }
                }
                
                // 새 형식의 검색량과 시작일 정보 생성
                const formattedSearchVolume = `검색 : ${volumeNumber}· ${isActive ? '📈 활성' : '⏱️ 지속됨'} ·${timeInfo}`;
                const formattedStartDate = `${volumeNumber.replace('회', '')} ⬆️ 1,000%`;
                
                resultItems.push({ 
                  title, 
                  searchVolume: formattedSearchVolume, 
                  startDate: formattedStartDate 
                });
              }
            }
          });
        } catch (e) {
          console.log('검색어 기반 탐색 중 오류:', e.message);
        }
      }
      
      // 3. 특정 클래스나 속성으로 탐색
      if (resultItems.length < 5) {
        try {
          console.log('클래스 기반 탐색 시도...');
          
          // 트렌드 관련 클래스 탐색
          const trendElements = Array.from(document.querySelectorAll('[class*="trend"], [class*="feed"], [class*="search"], [class*="rank"], [class*="item"]'));
          const seenTitles = new Set(resultItems.map(item => item.title));
          
          trendElements.forEach(el => {
            if (resultItems.length >= 5) return;
            
            const text = el.textContent?.trim() || '';
            if (text && text.length < 200) {
              // 제목이 될 수 있는 첫 번째 텍스트 노드 찾기
              let title = '';
              let foundTitle = false;
              
              // 자식 요소들을 순회하며 제목과 관련 데이터 찾기
              const childElements = Array.from(el.querySelectorAll('*'));
              for (const child of childElements) {
                const childText = child.textContent?.trim() || '';
                if (childText && !foundTitle && childText.length < 50 && 
                    !childText.includes('검색') && !childText.includes('trending')) {
                  title = childText;
                  foundTitle = true;
                }
              }
              
              // 제목이 없으면 본문에서 추출 시도
              if (!foundTitle) {
                if (text.includes('검색')) {
                  const parts = text.split('검색');
                  if (parts.length > 0 && parts[0].trim()) {
                    title = parts[0].trim();
                  }
                } else {
                  // 첫 줄이나 첫 문장을 제목으로 사용
                  const lines = text.split(/[\n\r]/);
                  if (lines.length > 0 && lines[0].trim()) {
                    title = lines[0].trim();
                  }
                }
              }
              
              if (title && title !== '제목 없음' && !seenTitles.has(title)) {
                seenTitles.add(title);
                
                // 검색량과 시작일 추출
                let searchVolume = '검색량 정보 없음';
                let startDate = '시작일 정보 없음';
                
                if (text.includes('검색')) {
                  const volumeMatch = text.match(/검색\s*(\d+[만천\+]*회)/);
                  if (volumeMatch && volumeMatch[1]) {
                    searchVolume = '검색 ' + volumeMatch[1];
                  }
                }
                
                if (text.includes('시간 전')) {
                  const timeMatch = text.match(/(\d+)\s*시간\s*전/);
                  if (timeMatch && timeMatch[1]) {
                    startDate = `${timeMatch[1]}시간 전`;
                    if (text.includes('trending_up') || text.includes('활성')) {
                      startDate += ' 활성';
                    }
                  }
                }
                
                resultItems.push({ title, searchVolume, startDate });
              }
            }
          });
        } catch (e) {
          console.log('클래스 기반 탐색 중 오류:', e.message);
        }
      }
      
      // 4. 마지막 수단: 페이지 텍스트에서 패턴 추출
      if (resultItems.length < 5) {
        try {
          console.log('페이지 텍스트에서 패턴 추출 시도...');
          
          const pageText = document.body.textContent || '';
          const seenTitles = new Set(resultItems.map(item => item.title));
          
          // 패턴 1: "검색어 검색123만+회" 형태 추출
          const pattern1 = /([^검색\n]{2,30})\s*검색\s*(\d+[만천\+]*회)/g;
          let match;
          while (resultItems.length < 5 && (match = pattern1.exec(pageText)) !== null) {
            const title = match[1].trim();
            if (title && !seenTitles.has(title) && title !== '제목 없음') {
              seenTitles.add(title);
              resultItems.push({
                title,
                searchVolume: '검색 ' + match[2],
                startDate: '시간 정보 없음'
              });
            }
          }
          
          // 패턴 2: 숫자+시간 패턴으로 시간 정보 매칭
          if (resultItems.some(item => item.startDate === '시간 정보 없음')) {
            const timePattern = /(\d+)\s*시간\s*전/g;
            let timeMatch;
            let timeInfos = [];
            
            while ((timeMatch = timePattern.exec(pageText)) !== null) {
              timeInfos.push(timeMatch[1] + '시간 전');
              if (timeInfos.length >= 5) break;
            }
            
            // 시간 정보가 없는 항목에 시간 정보 할당
            let timeIndex = 0;
            resultItems.forEach(item => {
              if (item.startDate === '시간 정보 없음' && timeIndex < timeInfos.length) {
                item.startDate = timeInfos[timeIndex++];
              }
            });
          }
        } catch (e) {
          console.log('패턴 추출 중 오류:', e.message);
        }
      }
      
      return resultItems;
    });
    
    console.log('데이터 크롤링 완료!');
    console.log(`추출된 항목 수: ${trends.length}`);
    
    // 추출된 데이터 출력 (테스트용)
    trends.forEach((item, index) => {
      console.log(`항목 ${index + 1}: ${JSON.stringify(item)}`);
    });
    
    // 중복 제거 및 최대 5개 항목으로 제한
    const uniqueResults = [];
    const seenTitles = new Set();
    
    for (const item of trends) {
      if (!seenTitles.has(item.title) && item.title && item.title !== '제목 없음') {
        seenTitles.add(item.title);
        uniqueResults.push(item);
        if (uniqueResults.length >= 5) break;
      }
    }
    
    // 최종 결과
    const finalResults = uniqueResults.length > 0 ? uniqueResults : trends.slice(0, 5);
    
    try {
      // 유틸리티 함수를 사용하여 결과 출력
      printTrendsToConsole(finalResults);
      
      return finalResults;
    } catch (error) {
      console.error('데이터 처리 중 오류가 발생했습니다:', error);
      console.error(error.stack);
      throw error;
    } finally {
      // 브라우저 종료는 항상 실행
      await browser.close();
      console.log('브라우저가 종료되었습니다.');
    }
  } catch (error) {
    console.error('크롤링 중 오류가 발생했습니다:', error);
    await browser.close();
    console.log('오류 발생으로 브라우저가 종료되었습니다.');
    throw error;
  }
}

/**
 * 페이지 자동 스크롤 함수
 * @param {Object} page - Puppeteer 페이지 객체
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
      
      // 최대 5초 후에 스크롤 종료
      setTimeout(() => {
        clearInterval(timer);
        resolve();
      }, 5000);
    });
  });
  
  console.log('페이지 스크롤 완료');
}

// 메인 함수
async function main() {
  try {
    const trends = await crawlGoogleTrends();
    
    if (trends && trends.length > 0) {
      // 데이터 처리 시작
      console.log('데이터 저장 시작...');
      
      let savedFiles = [];
      let errors = [];
      
      // JSON 파일 저장
      if (config.saveToJsonFile) {
        try {
          const jsonFilePath = await saveToFile(trends);
          if (jsonFilePath) {
            savedFiles.push({ type: 'JSON', path: jsonFilePath });
          }
        } catch (error) {
          console.error('JSON 파일 저장 중 오류:', error.message);
          errors.push('JSON 저장 실패');
        }
      }
      
      // 구글 스프레드시트 저장
      if (config.saveToGoogleSheet) {
        try {
          const spreadsheetId = getSpreadsheetId();
          if (spreadsheetId) {
            const sheetUrl = await saveToGoogleSheet(trends, spreadsheetId);
            if (sheetUrl) {
              savedFiles.push({ type: '구글 스프레드시트', path: sheetUrl });
              console.log(`구글 스프레드시트에 저장 완료: ${sheetUrl}`);
            } else {
              errors.push('구글 스프레드시트 저장 실패');
            }
          } else {
            console.warn('구글 스프레드시트 ID가 설정되지 않았습니다.');
            errors.push('스프레드시트 ID 누락');
          }
        } catch (error) {
          console.error('구글 스프레드시트 저장 중 오류:', error.message);
          errors.push('스프레드시트 저장 실패');
        }
      }
      
      // 결과 요약
      if (savedFiles.length > 0) {
        console.log('\n===== 저장 결과 =====');
        savedFiles.forEach(file => {
          console.log(`${file.type}: ${file.path}`);
        });
        console.log('=====================');
      }
      
      if (errors.length > 0) {
        console.error('\n===== 오류 목록 =====');
        errors.forEach(error => console.error(`- ${error}`));
        console.error('====================');
      }
    } else {
      console.error('크롤링된 데이터가 없습니다.');
    }
  } catch (error) {
    console.error('프로그램 실행 중 오류가 발생했습니다:', error);
  }
}

// 프로그램 실행
main(); 