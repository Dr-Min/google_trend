// Google 트렌드 크롤링 스크립트 (리눅스 최적화 버전)
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { saveToGoogleSheet } = require('./googleSheets');
const { printTrendsToConsole } = require('./utils');

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

// 로그 설정
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, `crawl-${new Date().toISOString().replace(/:/g, '-')}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// 로그 함수 (파일과 콘솔에 동시 출력)
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

// Google 트렌드 크롤링 함수
async function crawlGoogleTrends() {
  let browser = null;
  
  try {
    log('구글 트렌드 크롤링을 시작합니다...');
    
    // 브라우저 실행 (헤드리스 모드)
    browser = await puppeteer.launch({
      headless: 'new',  // 새 헤드리스 모드 사용
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ],
      defaultViewport: {
        width: 1920,
        height: 1080
      }
    });
    
    // 새 페이지 생성
    const page = await browser.newPage();
    
    // 콘솔 로그 리디렉션
    page.on('console', msg => {
      const type = msg.type().substr(0, 3).toUpperCase();
      log(`브라우저 콘솔: ${type} ${msg.text()}`);
    });
    
    // 미국 Google 트렌드 페이지 접속 (Realtime 트렌드)
    await page.goto('https://trends.google.com/trends/trendingsearches/realtime?geo=US&category=all', {
      waitUntil: 'networkidle2',
      timeout: 120000 // 2분 타임아웃
    });
    
    log('페이지에 접속했습니다. 데이터를 가져오는 중...');
    
    // 페이지 로딩 대기 (추가 5초)
    await page.waitForTimeout(5000);
    
    // 시간 필터 설정 시도 (지난 4시간)
    log('시간 필터 설정 시도 중...');
    try {
      await page.evaluate(() => {
        // 시간 필터 드롭다운 찾기 시도
        const timeFilters = document.querySelectorAll('button[role="listbox"], [aria-haspopup="true"]');
        for (const filter of timeFilters) {
          const text = filter.textContent.toLowerCase();
          if (text.includes('time range') || text.includes('last') || text.includes('hour')) {
            filter.click();
            return;
          }
        }
      });
      
      await page.waitForTimeout(1000);
      
      // 4시간 옵션 선택
      await page.evaluate(() => {
        const hourOptions = Array.from(document.querySelectorAll('span, div, a, li, button'));
        for (const option of hourOptions) {
          const text = option.textContent.toLowerCase();
          if (text.includes('past 4 hour') || text.includes('last 4 hour')) {
            option.click();
            return;
          }
        }
      });
      
      await page.waitForTimeout(2000);
      
    } catch (e) {
      logError('시간 필터 설정 중 오류', e);
      log('이미 올바른 시간 필터가 적용되어 있을 수 있습니다.');
    }
    
    // 페이지 콘텐츠가 확실히 로드되도록 스크롤
    log('페이지 스크롤 시작...');
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    
    log('페이지 스크롤 완료');
    
    // 디버깅용 스크린샷 저장
    const screenshotPath = path.join(__dirname, '../logs/debug-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    log(`스크린샷이 저장되었습니다: ${screenshotPath}`);
    
    // 트렌드 데이터 추출 시도
    const extractedData = await page.evaluate(() => {
      console.log('트렌드 항목 찾기 시도...');
      
      // 여러 방법으로 트렌드 항목 찾기 시도
      const rows = document.querySelectorAll('tr');
      console.log(`테이블 행 수: ${rows.length}`);
      
      const trends = [];
      const processedTitles = new Set(); // 중복 확인용
      
      // 표 형태로 된 트렌드 항목 찾기
      for (const row of rows) {
        try {
          // 타이틀 추출
          let title = '';
          const titleEl = row.querySelector('a, span.title, div.title, [role="heading"]');
          if (titleEl) {
            title = titleEl.textContent.trim();
          }
          
          if (!title) {
            // 대체 방법으로 타이틀 찾기
            const possibleTitles = row.querySelectorAll('div');
            for (const el of possibleTitles) {
              const text = el.textContent.trim();
              if (text && text.length > 3 && text.length < 50 && !text.includes('+') && !text.includes('hour')) {
                title = text;
                break;
              }
            }
          }
          
          // 검색량 추출
          let searchVolume = '';
          const volumeEl = row.querySelector('div:nth-child(2), span:nth-child(2)');
          if (volumeEl) {
            const volumeText = volumeEl.textContent.trim();
            if (volumeText.includes('K+') || volumeText.includes('+') || volumeText.toLowerCase().includes('searches')) {
              searchVolume = volumeText;
            }
          }
          
          if (!searchVolume) {
            // 대체 방법으로 검색량 찾기 
            const allDivs = row.querySelectorAll('div');
            for (const div of allDivs) {
              const text = div.textContent.trim();
              if (text.includes('K+') || text.includes('+') || 
                  text.toLowerCase().includes('searches') || 
                  text.match(/\d+[KkMm]?\+/)) {
                searchVolume = text;
                break;
              }
            }
          }
          
          // 시작 시간 추출
          let startDate = '';
          const dateEl = row.querySelector('div:nth-child(3), span:nth-child(3)');
          if (dateEl) {
            const dateText = dateEl.textContent.trim();
            if (dateText.includes('hour') || dateText.includes('min')) {
              startDate = dateText;
            }
          }
          
          if (!startDate) {
            // 대체 방법으로 시작 시간 찾기
            const allDivs = row.querySelectorAll('div');
            for (const div of allDivs) {
              const text = div.textContent.trim();
              if (text.includes('hour') || text.includes('min') || text.includes('%')) {
                startDate = text;
                break;
              }
            }
          }
          
          // 모든 필요한 정보가 있고 중복이 아닌 경우에만 추가
          if (title && !processedTitles.has(title)) {
            // 포맷팅
            const formattedVolume = searchVolume ? `검색 : ${searchVolume}· 📈 활성 ·` : '정보 없음';
            
            // 증가율 추출 및 포맷팅
            let increase = '';
            if (startDate) {
              // 볼륨 추출
              const volumeMatch = searchVolume.match(/(\d+[KkMm]?\+?|\d+\.\d+[KkMm]?\+?)/);
              const volume = volumeMatch ? volumeMatch[0] : '';
              
              // 증가율 추출
              const increaseMatch = startDate.match(/(\d+,?\d*%|\d+)/);
              const increaseValue = increaseMatch ? increaseMatch[0] : '';
              
              if (volume) {
                increase = volume;
                if (increaseValue) {
                  increase += ` ⬆️ ${increaseValue}`;
                }
              } else {
                increase = startDate;
              }
            } else {
              increase = '정보 없음';
            }
            
            trends.push({
              title,
              searchVolume: formattedVolume,
              startDate: increase
            });
            
            processedTitles.add(title);
            
            // 최대 25개만 추출
            if (trends.length >= 25) {
              break;
            }
          }
        } catch (err) {
          console.error('행 처리 중 오류:', err.message);
        }
      }
      
      return trends;
    });
    
    log(`데이터 크롤링 완료!`);
    log(`추출된 항목 수: ${extractedData.length}`);
    
    // 각 항목 로깅
    extractedData.forEach((item, index) => {
      log(`항목 ${index + 1}: ${JSON.stringify(item)}`);
    });
    
    // 상위 5개 트렌드 출력
    const top5Trends = extractedData.slice(0, 5);
    printTrendsToConsole(top5Trends);
    
    // 브라우저 닫기
    if (browser) {
      await browser.close();
      log('브라우저가 종료되었습니다.');
    }
    
    // 데이터 저장
    log('데이터 저장 시작...');
    
    if (config.saveToGoogleSheet && top5Trends.length > 0) {
      try {
        const sheetUrl = await saveToGoogleSheet(top5Trends, config.spreadsheetId);
        if (sheetUrl) {
          log(`구글 스프레드시트에 저장 완료: ${sheetUrl}`);
        } else {
          logError('구글 스프레드시트 저장 실패');
        }
      } catch (error) {
        logError('구글 스프레드시트 저장 중 오류 발생', error);
      }
    }
    
    // 저장 결과 요약
    log('\n===== 저장 결과 =====');
    if (config.saveToGoogleSheet) {
      log(`구글 스프레드시트: https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit`);
    }
    log('=====================\n');
    
    return top5Trends;
  } catch (error) {
    logError('크롤링 중 오류 발생', error);
    
    // 오류 발생 시에도 브라우저 닫기
    if (browser) {
      await browser.close();
      log('오류 후 브라우저가 종료되었습니다.');
    }
    
    return [];
  } finally {
    // 로그 스트림 닫기
    logStream.end();
  }
}

// 즉시 실행
if (require.main === module) {
  crawlGoogleTrends().catch(error => {
    logError('프로그램 실행 중 치명적 오류 발생', error);
    process.exit(1);
  });
}

module.exports = { crawlGoogleTrends }; 