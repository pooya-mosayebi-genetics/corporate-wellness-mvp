# check-sync.ps1 (ASCII-only, encoding-safe)
param(
  [string]$Nid = 'REDACTED_NATIONAL_ID',
  [string]$Pass = 'REDACTED_PASSWORD'
)

$base = 'http://localhost:3001'

# 1) Fresh token
try {
  $r1 = Invoke-RestMethod -Uri "$base/api/auth/submit-code" -Method Post -ContentType 'application/json' -Body "{""nationalId"":""$Nid""}"
  $r2 = Invoke-RestMethod -Uri "$base/api/auth/submit-password" -Method Post -ContentType 'application/json' -Body (@{ ticket = $r1.ticket; password = $Pass } | ConvertTo-Json)
  $h = @{ Authorization = "Bearer $($r2.tokens.accessToken)" }
  Write-Host "[OK] token acquired" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] auth: $($_.ErrorDetails.Message)" -ForegroundColor Red
  exit 1
}

# 2) Meals
try {
  $meals = Invoke-RestMethod -Uri "$base/api/meals?limit=50" -Headers $h
  Write-Host "[MEALS] total=$($meals.total)" -ForegroundColor Cyan
  $meals.items | Select-Object -First 10 | Format-Table date, type, time, calories, name -AutoSize
} catch {
  Write-Host "[MEALS] error: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# 3) Analyses
try {
  $ana = Invoke-RestMethod -Uri "$base/api/body-analyses?limit=50" -Headers $h
  Write-Host "[ANALYSES] total=$($ana.total)" -ForegroundColor Cyan
  $ana.items | Select-Object -First 10 | Format-Table analyzedAt, weight, height, bmi -AutoSize
} catch {
  Write-Host "[ANALYSES] error: $($_.ErrorDetails.Message)" -ForegroundColor Red
}