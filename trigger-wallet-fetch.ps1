# Script to trigger wallet data fetch for all users
# Replace YOUR_DOMAIN with your actual Vercel deployment URL

$deploymentUrl = "https://goatscan.vercel.app"  # Change this!
$cronSecret = "e263dc062382ee13e797b0b569b0d913b4596d6ccd0a915ed2b2174af30af608"

Write-Host "Triggering wallet data fetch for all users..." -ForegroundColor Yellow
Write-Host "URL: $deploymentUrl/api/fetch-wallet-data?secret=$cronSecret" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "$deploymentUrl/api/fetch-wallet-data?secret=$cronSecret" -Method GET
    Write-Host "`nSuccess! Response:" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "`nError occurred:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response body: $responseBody" -ForegroundColor Red
    }
}

