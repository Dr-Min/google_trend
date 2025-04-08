# 구글 트렌드 크롤러 (리눅스 최적화 버전)

이 프로그램은 구글 트렌드의 실시간 데이터를 자동으로 크롤링하여 구글 스프레드시트에 저장합니다. 리눅스 서버 환경에서 헤드리스 모드로 동작하며 cron 작업으로 4시간마다 자동 실행됩니다.

## 주요 기능

- 미국 구글 트렌드의 실시간 검색어 데이터 수집 (최근 4시간)
- 수집된 데이터를 구글 스프레드시트에 자동 저장
- 중복 데이터 방지 및 자동 스타일링 적용
- 상세한 로그 기록
- 리눅스 서버 환경에서 헤드리스 모드로 작동
- 4시간마다 자동 실행 (cron)

## 설치 및 설정 방법

### 1. 저장소 복제

```bash
git clone <repository-url>
cd <repository-directory>/linux
```

### 2. Google Cloud 프로젝트 설정

1. [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트를 생성합니다.
2. Google Sheets API를 사용 설정합니다.
3. 서비스 계정을 생성하고 키 파일(JSON)을 다운로드합니다.
4. 다운로드한 키 파일을 `credentials.json`로 이름을 변경하여 프로젝트 루트 디렉토리에 저장합니다.
5. 데이터를 저장할 Google 스프레드시트를 생성하고 서비스 계정 이메일을 편집자로 공유합니다.
6. 스프레드시트 ID를 `config.json` 파일의 `spreadsheetId` 필드에 입력합니다.

### 3. 자동 설치 스크립트 실행

모든 종속성과 필요한 패키지를 설치하려면 다음 명령을 실행합니다:

```bash
sudo bash setup.sh
```

이 스크립트는 다음 작업을 수행합니다:
- Node.js 설치 (이미 설치되어 있지 않은 경우)
- Puppeteer 및 헤드리스 Chrome 작동에 필요한 의존성 설치
- NPM 패키지 설치
- Xvfb(가상 디스플레이) 설정
- 테스트 실행

### 4. cron 작업 설정

4시간마다 자동으로 실행되도록 cron 작업을 설정하려면 다음 명령을 실행합니다:

```bash
sudo bash cron-setup.sh
```

## 수동 실행 방법

### 프로그램 실행

```bash
npm start
```

### 구글 스프레드시트 연동 테스트

```bash
npm test
```

## 로그 및 디버깅

모든 로그는 `logs` 디렉토리에 저장됩니다:

- 크롤링 로그: `logs/crawl-*.log`
- cron 작업 로그: `logs/cron-YYYY-MM-DD.log`
- 테스트 로그: `logs/test-sheets-*.log`

디버깅을 위한 스크린샷은 `logs/debug-screenshot.png`에 저장됩니다.

## 구성 파일

### config.json

```json
{
  "spreadsheetId": "your-spreadsheet-id",
  "saveToGoogleSheet": true
}
```

## 주의사항

- 이 프로그램은 리눅스 서버 환경에서 실행되도록 최적화되었습니다.
- 리눅스 서버에서 GUI가 없는 환경에서도 작동합니다(Xvfb 사용).
- 리눅스 배포판에 따라 추가 설정이 필요할 수 있습니다.
- 항상 최신 버전의 Node.js와 npm을 사용하는 것이 좋습니다. 