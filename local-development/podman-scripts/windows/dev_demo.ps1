$ErrorActionPreference = 'Stop'

# Function for colored output
function Write-Colored {
    param(
        [string]$Text,
        [string]$Color
    )
    switch($Color) {
        "GREEN" { Write-Host $Text -ForegroundColor Green }
        "BLUE" { Write-Host $Text -ForegroundColor Blue }
        "RED" { Write-Host $Text -ForegroundColor Red }
        "YELLOW" { Write-Host $Text -ForegroundColor Yellow }
        default { Write-Host $Text }
    }
}

# Arrays for random name generation
$FIRST_NAMES = @("James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "William", "Elizabeth",
                "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen",
                "Emma", "Olivia", "Ava", "Isabella", "Sophia", "Mia", "Charlotte", "Amelia", "Harper", "Evelyn")

$LAST_NAMES = @("Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
               "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
               "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson")

# Function to get random name from array
function Get-RandomName {
    param([string[]]$names)
    $index = Get-Random -Minimum 0 -Maximum $names.Count
    return $names[$index]
}

# Function to display progress
function Show-Progress {
    param([int]$duration)
    $barWidth = 40
    $sleepInterval = $duration / $barWidth
    $progress = 0

    Write-Host -NoNewline "["
    while ($progress -lt $barWidth) {
        Write-Host -NoNewline "="
        $progress++
        Start-Sleep -Milliseconds ($sleepInterval * 1000)
    }
    Write-Host -NoNewline "]"
    Write-Host ""
}

# Function to make a POST request with a session token
function Invoke-PostRequest {
    param(
        [string]$endpoint,
        [string]$data
    )
    $headers = @{
        "Content-Type" = "application/json"
        "X-With-Session-Token" = "test-session"
    }
    return Invoke-RestMethod -Uri "http://localhost:8080$endpoint" -Method Post -Headers $headers -Body $data
}

# Function to submit an application
function Submit-Application {
    param(
        [string]$firstName,
        [string]$lastName,
        [string]$cuisine,
        [int]$experience,
        [int]$books
    )

    $data = @{
        firstName = $firstName
        lastName = $lastName
        favoriteCuisine = $cuisine
        yearsOfProfessionalExperience = $experience
        numberOfCookingBooksRead = $books
    } | ConvertTo-Json

    Write-Colored "Submitting application for $firstName $lastName..." "BLUE"
    Write-Host "Profile:"
    Write-Host "  - Cuisine: $cuisine"
    Write-Host "  - Professional Experience: $experience years"
    Write-Host "  - Cooking Books Read: $books"

    $expectedOutcome = if ($experience -eq 0 -and $books -gt 0) { "Should be APPROVED" } else { "Should be REJECTED" }
    Write-Colored "Expected outcome: $expectedOutcome" $(if ($experience -eq 0 -and $books -gt 0) { "GREEN" } else { "RED" })

    Invoke-PostRequest -endpoint "/api/v1/cooking-club/membership/command/submit-application" -data $data
    Write-Host ""
}

# Function to get members by cuisine
function Get-Members {
    Write-Colored "Fetching current members by cuisine..." "BLUE"
    $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/cooking-club/membership/query/members-by-cuisine" -Method Post -ContentType "application/json"
    return $response
}

# Main test script
Write-Colored "Starting Cooking Club Application Demo" "GREEN"
Write-Host "=================================================="
Write-Colored "Application Rules:" "YELLOW"
Write-Host "1. Approval Criteria:"
Write-Host "   - Must have 0 years of professional experience"
Write-Host "   - Must have read at least 1 cooking book"
Write-Host "2. All other combinations will be rejected"
Write-Host "=================================================="

# Test 1: Should be approved (0 years experience, 3 books read)
Write-Host ""
Write-Colored "Test 1: Testing 'Enthusiastic Beginner' Profile" "YELLOW"
Write-Host "This profile represents someone new to professional cooking (0 years)"
Write-Host "but who has studied through books (3 books read)."
Submit-Application -firstName (Get-RandomName $FIRST_NAMES) -lastName (Get-RandomName $LAST_NAMES) -cuisine "Italian" -experience 0 -books 3
Show-Progress -duration 1

# Test 2: Should not be approved (2 years experience, 5 books read)
Write-Host ""
Write-Colored "Test 2: Testing 'Experienced Professional' Profile" "YELLOW"
Write-Host "This profile represents someone with professional experience (2 years)"
Write-Host "and theoretical knowledge (5 books read). Despite the knowledge,"
Write-Host "professional experience disqualifies them."
Submit-Application -firstName (Get-RandomName $FIRST_NAMES) -lastName (Get-RandomName $LAST_NAMES) -cuisine "French" -experience 2 -books 5
Show-Progress -duration 1

# Test 3: Should be approved (0 years experience, 1 book read)
Write-Host ""
Write-Colored "Test 3: Testing 'Minimal Qualifying' Profile" "YELLOW"
Write-Host "This profile represents someone meeting the minimum requirements:"
Write-Host "no professional experience and has read exactly 1 book."
Submit-Application -firstName (Get-RandomName $FIRST_NAMES) -lastName (Get-RandomName $LAST_NAMES) -cuisine "Japanese" -experience 0 -books 1
Show-Progress -duration 1

# Test 4: Should not be approved (0 years experience, 0 books read)
Write-Host ""
Write-Colored "Test 4: Testing 'Complete Beginner' Profile" "YELLOW"
Write-Host "This profile represents someone with no professional experience"
Write-Host "but also no theoretical knowledge (0 books read)."
Submit-Application -firstName (Get-RandomName $FIRST_NAMES) -lastName (Get-RandomName $LAST_NAMES) -cuisine "Mexican" -experience 0 -books 0
Show-Progress -duration 1

# Final Test: Display current members
Write-Host ""
Write-Colored "Outcome:" "YELLOW"
Write-Host "Current members grouped by their preferred cuisine."
Write-Host "Only approved applications should appear in these results."
Start-Sleep -Seconds 1
Get-Members

Write-Host ""
Write-Host ""
Write-Host ""
Write-Colored "Demo Completed" "GREEN"
Write-Host "=================================================="