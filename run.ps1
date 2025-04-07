# PowerShell 스크립트: 구글 트렌드 크롤러 실행

# 현재 디렉토리 표시
Write-Host "현재 디렉토리: $(Get-Location)" -ForegroundColor Cyan

# 필요한 패키지 설치 확인
Write-Host "`n의존성 패키지를 확인하고 설치합니다..." -ForegroundColor Yellow
npm install

# 결과 디렉토리 확인 및 생성
$resultsDir = Join-Path -Path $(Get-Location) -ChildPath "results"
if (-not (Test-Path -Path $resultsDir)) {
    Write-Host "`n결과 디렉토리를 생성합니다: $resultsDir" -ForegroundColor Yellow
    New-Item -Path $resultsDir -ItemType Directory | Out-Null
}

# 스크립트 실행
Write-Host "`n구글 트렌드 크롤러를 실행합니다..." -ForegroundColor Green
npm start

# 결과 파일 확인
Write-Host "`n결과 파일:" -ForegroundColor Cyan
Get-ChildItem -Path $resultsDir -Filter "*.json" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5 | 
    Format-Table Name, LastWriteTime, Length

# 최신 결과 파일 내용 확인 여부 질문
$latestFile = Get-ChildItem -Path $resultsDir -Filter "*.json" | 
              Sort-Object LastWriteTime -Descending | 
              Select-Object -First 1

if ($latestFile) {
    $showContent = Read-Host "`n최신 결과 파일 ($($latestFile.Name))의 내용을 확인하시겠습니까? (Y/N)"
    if ($showContent -eq "Y" -or $showContent -eq "y") {
        $content = Get-Content -Path $latestFile.FullName -Raw | ConvertFrom-Json
        Write-Host "`n===== 구글 트렌드 상위 5개 =====" -ForegroundColor Magenta
        
        for ($i = 0; $i -lt $content.Length; $i++) {
            Write-Host "`n$($i+1). $($content[$i].title)" -ForegroundColor White
            Write-Host "   검색량: $($content[$i].searchVolume)" -ForegroundColor Gray
            Write-Host "   시작일: $($content[$i].startDate)" -ForegroundColor Gray
        }
        
        Write-Host "`n=================================" -ForegroundColor Magenta
    }
}

Write-Host "`n스크립트가 완료되었습니다." -ForegroundColor Green 