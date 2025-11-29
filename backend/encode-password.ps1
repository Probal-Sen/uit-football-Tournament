# Helper script to URL-encode your MongoDB password
# This is useful if your password contains special characters

Write-Host "MongoDB Password URL Encoder" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$password = Read-Host "Enter your MongoDB Atlas password"

if ([string]::IsNullOrWhiteSpace($password)) {
    Write-Host "Password cannot be empty!" -ForegroundColor Red
    exit 1
}

# URL encode the password
$encoded = [System.Web.HttpUtility]::UrlEncode($password)

Write-Host ""
Write-Host "Original password: $password" -ForegroundColor Yellow
Write-Host "URL-encoded: $encoded" -ForegroundColor Green
Write-Host ""
Write-Host "Use the encoded version in your MONGO_URI connection string." -ForegroundColor Cyan
Write-Host ""
Write-Host "Example connection string format:" -ForegroundColor Yellow
Write-Host "MONGO_URI=mongodb+srv://username:$encoded@cluster0.xxxxx.mongodb.net/uit-football?retryWrites=true&w=majority" -ForegroundColor White

