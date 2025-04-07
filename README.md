# 구글 트렌드 크롤러

이 프로젝트는 구글 트렌드 웹사이트에서 미국 지역의 지난 4시간 동안의 상위 5개 트렌드를 크롤링하는 Node.js 애플리케이션입니다.

## 설치 방법

다음 명령어를 사용하여 필요한 패키지를 설치합니다:

```bash
npm install
```

## 사용 방법

다음 명령어를 사용하여 프로그램을 실행합니다:

```bash
npm start
```

실행하면 다음과 같은 작업이 수행됩니다:

1. Puppeteer를 사용하여 브라우저를 실행하고 구글 트렌드 페이지에 접속합니다.
2. 미국 지역의 지난 4시간 동안의 상위 5개 트렌드를 크롤링합니다.
3. 크롤링한 데이터를 콘솔에 출력합니다.
4. 결과를 `results` 폴더에 JSON 파일로 저장합니다.

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