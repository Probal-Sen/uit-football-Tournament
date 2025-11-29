# PowerShell script to seed the initial admin account
# Run this after starting the backend server

$uri = "http://localhost:4000/api/auth/seed-initial-admin"
$body = @{
    email = "9probalsen@gmail.com"
    password = "Probal2004"
    name = "Tournament Admin"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $uri -Method POST -ContentType "application/json" -Body $body
    Write-Host "Admin created successfully!" -ForegroundColor Green
    Write-Host "Email: 9probalsen@gmail.com" -ForegroundColor Cyan
    Write-Host "Password: Probal2004" -ForegroundColor Cyan
    Write-Host "You can now log in at http://localhost:3000/admin/login" -ForegroundColor Yellow
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Make sure the backend server is running on port 4000" -ForegroundColor Yellow
}

