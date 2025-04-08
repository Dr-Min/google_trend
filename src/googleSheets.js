const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

/**
 * 구글 스프레드시트에 데이터를 저장하는 함수
 * @param {Array} data - 저장할 데이터
 * @param {string} spreadsheetId - 구글 스프레드시트 ID (공유 URL에서 추출 가능)
 * @returns {Promise<string>} 스프레드시트 URL
 */
async function saveToGoogleSheet(data, spreadsheetId) {
  try {
    console.log('구글 스프레드시트에 데이터 저장을 시작합니다...');
    console.log(`스프레드시트 ID: ${spreadsheetId}`);
    
    // 인증 정보 확인 (서비스 계정 키 파일)
    const keyFilePath = path.join(__dirname, '../credentials.json');
    
    if (!fs.existsSync(keyFilePath)) {
      console.error('credentials.json 파일이 없습니다. 구글 클라우드 콘솔에서 서비스 계정 키를 생성하세요.');
      return null;
    }
    
    console.log(`인증 파일 경로: ${keyFilePath}`);
    
    // 1단계: 현재 날짜, 시간 정보 준비
    const now = new Date();
    const dateStr = now.toLocaleDateString('ko-KR');
    const timeStr = now.toLocaleTimeString('ko-KR');
    console.log(`현재 데이터 수집 시간: ${dateStr} ${timeStr}`);
    
    // 2단계: 구글 API 인증
    console.log('구글 API 인증 시작...');
    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    console.log('클라이언트 생성 중...');
    const client = await auth.getClient();
    console.log('API 클라이언트 생성 완료');
    
    const sheets = google.sheets({ version: 'v4', auth: client });
    
    // 3단계: 스프레드시트 정보 확인
    console.log('스프레드시트 정보 요청 중...');
    try {
      const spreadsheetInfo = await sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false,
      });
      
      console.log(`스프레드시트 제목: ${spreadsheetInfo.data.properties.title}`);
      console.log(`시트 수: ${spreadsheetInfo.data.sheets.length}`);
      
      const sheetTitle = '구글 트렌드';
      let sheetId = null;
      
      // 시트 존재 여부 확인
      console.log('시트 확인 중...');
      for (const sheet of spreadsheetInfo.data.sheets) {
        console.log(`- 발견된 시트: ${sheet.properties.title}`);
        if (sheet.properties.title === sheetTitle) {
          sheetId = sheet.properties.sheetId;
          console.log(`"${sheetTitle}" 시트를 찾았습니다. ID: ${sheetId}`);
          break;
        }
      }
      
      // 시트가 없으면 새로 생성
      if (sheetId === null) {
        console.log(`"${sheetTitle}" 시트가 없습니다. 새로 생성합니다.`);
        
        try {
          const addSheetResponse = await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: sheetTitle,
                    }
                  }
                }
              ]
            }
          });
          
          sheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;
          console.log(`새 시트 생성 완료. ID: ${sheetId}`);
          
          // 헤더 추가
          console.log('헤더 추가 중...');
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetTitle}!A1:F1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [
                ['수집 날짜', '수집 시간', '순위', '검색어', '검색량', '증가율']
              ]
            }
          });
          console.log('헤더 추가 완료');
          
          // 헤더 행 스타일 설정
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
              requests: [
                {
                  repeatCell: {
                    range: {
                      sheetId: sheetId,
                      startRowIndex: 0,
                      endRowIndex: 1,
                      startColumnIndex: 0,
                      endColumnIndex: 6
                    },
                    cell: {
                      userEnteredFormat: {
                        backgroundColor: {
                          red: 0.9,
                          green: 0.95,
                          blue: 1.0
                        },
                        textFormat: {
                          bold: true
                        }
                      }
                    },
                    fields: 'userEnteredFormat(backgroundColor,textFormat)'
                  }
                },
                {
                  updateSheetProperties: {
                    properties: {
                      sheetId: sheetId,
                      gridProperties: {
                        frozenRowCount: 1
                      }
                    },
                    fields: 'gridProperties.frozenRowCount'
                  }
                }
              ]
            }
          });
          
          // 열 너비 설정
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
              requests: [
                {
                  updateDimensionProperties: {
                    range: {
                      sheetId: sheetId,
                      dimension: 'COLUMNS',
                      startIndex: 0,
                      endIndex: 2
                    },
                    properties: {
                      pixelSize: 150
                    },
                    fields: 'pixelSize'
                  }
                },
                {
                  updateDimensionProperties: {
                    range: {
                      sheetId: sheetId,
                      dimension: 'COLUMNS',
                      startIndex: 2,
                      endIndex: 3
                    },
                    properties: {
                      pixelSize: 70
                    },
                    fields: 'pixelSize'
                  }
                },
                {
                  updateDimensionProperties: {
                    range: {
                      sheetId: sheetId,
                      dimension: 'COLUMNS',
                      startIndex: 3,
                      endIndex: 6
                    },
                    properties: {
                      pixelSize: 200
                    },
                    fields: 'pixelSize'
                  }
                }
              ]
            }
          });
        } catch (createSheetError) {
          console.error(`시트 생성 중 오류 발생: ${createSheetError.message}`);
          if (createSheetError.errors) {
            console.error('자세한 오류 정보:', JSON.stringify(createSheetError.errors, null, 2));
          }
          throw createSheetError;
        }
      }
      
      // 4단계: 중복 검사를 위한 기존 데이터 확인
      console.log(`기존 데이터 가져오는 중... (시트: ${sheetTitle})`);
      try {
        const existingData = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetTitle}!A:F`,
        });
        
        const rows = existingData.data.values || [];
        console.log(`기존 데이터 행 수: ${rows.length - 1}`); // 헤더 제외
        
        // 중복 검사를 위한 키 생성
        const existingKeys = new Set();
        for (let i = 1; i < rows.length; i++) { // 헤더 제외
          const row = rows[i];
          if (row && row.length >= 4) {
            const rowDate = row[0];
            const rowTime = row[1];
            const rowTitle = row[3];
            if (rowDate && rowTime && rowTitle) {
              existingKeys.add(`${rowDate}_${rowTime}_${rowTitle}`);
            }
          }
        }
        
        // 5단계: 새 데이터 행 생성 (중복 제외)
        const newRows = [];
        let addedCount = 0;
        
        data.forEach((item, index) => {
          const key = `${dateStr}_${timeStr}_${item.title}`;
          console.log(`항목 체크: ${item.title}, 키: ${key}`);
          
          // 중복되지 않는 데이터만 추가
          if (!existingKeys.has(key)) {
            console.log(`- 새 항목 추가: ${item.title}`);
            newRows.push([
              dateStr,                // 수집 날짜 
              timeStr,                // 수집 시간
              (index + 1).toString(), // 순위
              item.title,             // 검색어
              item.searchVolume,      // 검색량
              item.startDate          // 증가율
            ]);
            
            addedCount++;
            existingKeys.add(key); // 추가 완료 표시
          } else {
            console.log(`- 중복 항목 제외: ${item.title}`);
          }
        });
        
        console.log(`추가할 새 데이터 행 수: ${addedCount}`);
        
        // 데이터가 있는 경우에만 추가
        if (newRows.length > 0) {
          // 6단계: 데이터 추가
          console.log('새 데이터 스프레드시트에 추가 중...');
          try {
            const appendResponse = await sheets.spreadsheets.values.append({
              spreadsheetId,
              range: `${sheetTitle}!A:F`,
              valueInputOption: 'USER_ENTERED',
              insertDataOption: 'INSERT_ROWS',
              resource: {
                values: newRows
              }
            });
            
            console.log(`추가된 범위: ${appendResponse.data.updates.updatedRange}`);
            console.log(`추가된 행 수: ${appendResponse.data.updates.updatedRows}`);
            
            // 7단계: 짝수/홀수 행 스타일 설정
            const totalRows = rows.length + newRows.length;
            const startRow = rows.length;
            
            // 스타일 적용 요청 목록
            const styleRequests = [];
            
            for (let i = 0; i < newRows.length; i++) {
              const rowIndex = startRow + i;
              if (rowIndex % 2 === 1) { // 짝수 행 (0-인덱스이므로 홀수가 짝수 행)
                styleRequests.push({
                  repeatCell: {
                    range: {
                      sheetId: sheetId,
                      startRowIndex: rowIndex,
                      endRowIndex: rowIndex + 1,
                      startColumnIndex: 0,
                      endColumnIndex: 6
                    },
                    cell: {
                      userEnteredFormat: {
                        backgroundColor: {
                          red: 0.95,
                          green: 0.95,
                          blue: 0.95
                        }
                      }
                    },
                    fields: 'userEnteredFormat.backgroundColor'
                  }
                });
              }
            }
            
            if (styleRequests.length > 0) {
              await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                  requests: styleRequests
                }
              });
            }
            
            // 8단계: 데이터 정렬 (최신 데이터를 상단에 표시)
            await sheets.spreadsheets.batchUpdate({
              spreadsheetId,
              resource: {
                requests: [
                  {
                    sortRange: {
                      range: {
                        sheetId: sheetId,
                        startRowIndex: 1, // 헤더 제외
                        startColumnIndex: 0,
                        endColumnIndex: 6
                      },
                      sortSpecs: [
                        {
                          dimensionIndex: 0, // 날짜 열
                          sortOrder: 'DESCENDING'
                        },
                        {
                          dimensionIndex: 1, // 시간 열
                          sortOrder: 'DESCENDING'
                        }
                      ]
                    }
                  }
                ]
              }
            });
            
            console.log(`구글 스프레드시트에 ${addedCount}개 데이터가 성공적으로 추가되었습니다.`);
          } catch (appendError) {
            console.error(`데이터 추가 중 오류 발생: ${appendError.message}`);
            if (appendError.errors) {
              console.error('자세한 오류 정보:', JSON.stringify(appendError.errors, null, 2));
            }
            throw appendError;
          }
        } else {
          console.log('추가할 새 데이터가 없습니다.');
        }
      } catch (getDataError) {
        console.error(`기존 데이터 가져오는 중 오류: ${getDataError.message}`);
        if (getDataError.errors) {
          console.error('자세한 오류 정보:', JSON.stringify(getDataError.errors, null, 2));
        }
        throw getDataError;
      }
    } catch (getSheetError) {
      console.error(`스프레드시트 정보 가져오는 중 오류: ${getSheetError.message}`);
      if (getSheetError.errors) {
        console.error('자세한 오류 정보:', JSON.stringify(getSheetError.errors, null, 2));
      }
      throw getSheetError;
    }
    
    // 스프레드시트 URL 반환
    console.log(`구글 스프레드시트 저장 성공: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    
  } catch (error) {
    console.error('구글 스프레드시트 저장 중 오류 발생:', error.message);
    if (error.stack) console.error(error.stack);
    
    // 구글 API 응답에 오류 정보가 있으면 더 자세히 출력
    if (error.response && error.response.data) {
      console.error('API 응답 오류:', JSON.stringify(error.response.data, null, 2));
    }
    
    // 인증 관련 오류 디버깅
    console.log('인증 정보 확인:');
    try {
      const keyFile = JSON.parse(fs.readFileSync(path.join(__dirname, '../credentials.json'), 'utf8'));
      console.log(`- 프로젝트 ID: ${keyFile.project_id}`);
      console.log(`- 클라이언트 이메일: ${keyFile.client_email}`);
      console.log(`- 인증 URI: ${keyFile.auth_uri}`);
    } catch (e) {
      console.error('인증 파일 확인 중 오류:', e.message);
    }
    
    return null;
  }
}

/**
 * 스프레드시트 ID를 환경 변수 또는 설정 파일에서 가져오는 함수
 * @returns {string|null} 스프레드시트 ID
 */
function getSpreadsheetId() {
  // 1. 환경 변수 확인
  if (process.env.GOOGLE_SPREADSHEET_ID) {
    return process.env.GOOGLE_SPREADSHEET_ID;
  }
  
  // 2. 설정 파일 확인
  const configPath = path.join(__dirname, '../config.json');
  
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.spreadsheetId) {
        return config.spreadsheetId;
      }
    }
  } catch (error) {
    console.warn('설정 파일 읽기 실패:', error.message);
  }
  
  // 3. 기본값 또는 null 반환
  return null;
}

module.exports = {
  saveToGoogleSheet,
  getSpreadsheetId
}; 