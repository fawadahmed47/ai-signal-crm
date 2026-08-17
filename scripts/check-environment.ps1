$ErrorActionPreference = "Stop"

function Get-ToolVersion {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string[]]$Arguments,
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][bool]$Required
    )

    $resolved = Get-Command $Command -ErrorAction SilentlyContinue
    if (-not $resolved) {
        $level = if ($Required) { "ERROR" } else { "INFO" }
        Write-Host "[$level] $Label is not installed or not available in PATH."
        return $false
    }

    try {
        $output = & $Command @Arguments 2>&1
        $exitCode = $LASTEXITCODE
    } catch {
        $level = if ($Required) { "ERROR" } else { "INFO" }
        Write-Host "[$level] $Label was found but could not be executed: $($_.Exception.Message)"
        return $false
    }

    if ($exitCode -ne 0) {
        $level = if ($Required) { "ERROR" } else { "INFO" }
        $detail = $output | Select-Object -First 1
        Write-Host "[$level] $Label returned exit code ${exitCode}: $detail"
        return $false
    }

    $version = $output | Select-Object -First 1
    Write-Host "[OK] ${Label}: $version"
    return $true
}

Write-Host "Signal CRM local environment check"
Write-Host "----------------------------------"

$nodeOk = Get-ToolVersion -Command "node" -Arguments @("--version") -Label "Node.js" -Required $true
$pnpmCommand = if (Get-Command "pnpm.cmd" -ErrorAction SilentlyContinue) { "pnpm.cmd" } else { "pnpm" }
$pnpmOk = Get-ToolVersion -Command $pnpmCommand -Arguments @("--version") -Label "pnpm" -Required $true
$gitOk = Get-ToolVersion -Command "git" -Arguments @("--version") -Label "Git" -Required $true
$pythonCandidates = @(".venv\Scripts\python.exe", "python", "py")
$pythonOk = $false
foreach ($candidate in $pythonCandidates) {
    if ((Test-Path $candidate) -or (Get-Command $candidate -ErrorAction SilentlyContinue)) {
        $pythonOk = Get-ToolVersion -Command $candidate -Arguments @("--version") -Label "Python ($candidate)" -Required $false
        if ($pythonOk) {
            break
        }
    }
}
if (-not $pythonOk) {
    Write-Host "[ERROR] Python 3.10 or newer is not installed or could not be executed."
}
$dockerOk = Get-ToolVersion -Command "docker" -Arguments @("--version") -Label "Docker Desktop" -Required $true
$null = Get-ToolVersion -Command "ollama" -Arguments @("--version") -Label "Ollama (required for live AI extraction)" -Required $false

if (-not (Test-Path ".env")) {
    Write-Host "[INFO] .env is absent. Create it with: Copy-Item .env.example .env"
} else {
    Write-Host "[OK] Local .env exists and remains ignored by Git."
}

if ($nodeOk -and $pnpmOk -and $gitOk -and $pythonOk -and $dockerOk) {
    Write-Host "[PASS] Core development environment is ready."
    exit 0
}

Write-Host "[FAIL] Install the missing required tools, restart the terminal, and run this check again."
exit 1
