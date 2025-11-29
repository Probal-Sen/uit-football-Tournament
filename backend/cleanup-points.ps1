# Cleanup orphaned points table entries
# This script deletes all points table entries where the team no longer exists

Write-Host "Cleaning up orphaned points table entries..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/api/points/cleanup" `
        -Method POST `
        -ContentType "application/json" `
        -Headers @{
            "Cookie" = $env:ADMIN_COOKIE
        }
    
    Write-Host "Success!" -ForegroundColor Green
    Write-Host "Deleted $($response.deletedCount) orphaned entries" -ForegroundColor Green
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Note: You need to be logged in as admin to run this cleanup." -ForegroundColor Yellow
    Write-Host "Alternatively, you can call the endpoint from the admin dashboard or use a tool like Postman." -ForegroundColor Yellow
}

