# Google Trend Crawler

구글 트렌드에서 미국 지역의 최근 4시간 동안의 상위 5개 트렌드를 자동으로 수집하는 도구입니다.

## 주요 기능

- 구글 트렌드에서 실시간 인기 검색어 크롤링
- 결과를 JSON 파일로 저장
- 결과를 Excel 파일로 저장 (누적 데이터 관리)
- 결과를 Google 스프레드시트로 저장 (누적 데이터 관리)

## 설치 방법

```bash
npm install
```

## 실행 방법

```bash
npm start
```

## 구글 스프레드시트 설정 방법

구글 스프레드시트에 데이터를 저장하려면 다음 단계를 따르세요:

1. **Google Cloud Console에서 프로젝트 생성**
   - [Google Cloud Console](https://console.cloud.google.com/)에 접속합니다.
   - 새 프로젝트를 생성합니다.

2. **Google Sheets API 활성화**
   - 생성한 프로젝트에서 "API 및 서비스" > "라이브러리"로 이동합니다.
   - "Google Sheets API"를 검색하여 활성화합니다.

3. **서비스 계정 생성**
   - "API 및 서비스" > "사용자 인증 정보"로 이동합니다.
   - "사용자 인증 정보 만들기" > "서비스 계정"을 선택합니다.
   - 서비스 계정 이름을 입력하고 "만들고 계속하기"를 클릭합니다.
   - 역할은 "편집자(Editor)"로 설정합니다.
   - "완료"를 클릭하여 서비스 계정을 생성합니다.

4. **키 생성**
   - 생성된 서비스 계정 목록에서 해당 서비스 계정을 클릭합니다.
   - "키" 탭으로 이동한 후 "키 추가" > "새 키 만들기"를 클릭합니다.
   - 키 유형으로 "JSON"을 선택하고 "만들기"를 클릭합니다.
   - 키 파일이 자동으로 다운로드됩니다.

5. **키 파일 설치**
   - 다운로드된 키 파일을 프로젝트 루트 디렉토리에 `credentials.json` 이름으로 저장합니다.

6. **스프레드시트 생성 및 공유**
   - [Google Drive](https://drive.google.com/)에서 새 스프레드시트를 생성합니다.
   - 생성된 스프레드시트를 열고 URL에서 스프레드시트 ID를 확인합니다.
     (URL 형식: `https://docs.google.com/spreadsheets/d/{스프레드시트ID}/edit`)
   - 스프레드시트의 "공유" 버튼을 클릭합니다.
   - 서비스 계정 이메일 주소(credentials.json 파일 내의 `client_email` 값)를 추가하고 "편집자" 권한을 부여합니다.

7. **설정 파일 구성**
   - `config.json` 파일에 스프레드시트 ID를 설정합니다:
     ```json
     {
       "spreadsheetId": "여기에_복사한_스프레드시트_ID_입력",
       "saveToExcel": true,
       "saveToGoogleSheet": true,
       "saveToJsonFile": true
     }
     ```

8. **실행**
   - `npm start` 명령으로 프로그램을 실행합니다.

## 주의사항

- Google API 할당량이 초과되거나 네트워크 문제가 발생할 수 있으니 주의하세요.
- 구글 크롤링 정책을 준수하기 위해 너무 자주 실행하지 마세요.
- 브라우저가 열리고 자동으로 크롤링이 진행됩니다.

## 프로젝트 구조

```
google_trend/
├── node_modules/
├── results/          # 크롤링 결과가 저장되는 폴더
├── src/
│   ├── index.js      # 메인 코드
│   └── utils.js      # 유틸리티 함수
├── package.json
└── README.md
```

## 주의사항

이 프로그램은 브라우저를 직접 실행하기 때문에 그래픽 인터페이스가 필요합니다. 
headless 모드로 실행하고 싶다면 `src/index.js` 파일의 `puppeteer.launch()` 옵션에서 `headless: false`를 `headless: true`로 변경하세요. 