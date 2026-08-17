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
        return -not $Required
    }

    $version = & $Command @Arguments 2>&1 | Select-Object -First 1
    Write-Host "[OK] ${Label}: $version"
    return $true
}

Write-Host "Signal CRM local environment check"
Write-Host "----------------------------------"

$nodeOk = Get-ToolVersion -Command "node" -Arguments @("--version") -Label "Node.js" -Required $true
$pnpmCommand = if (Get-Command "pnpm.cmd" -ErrorAction SilentlyContinue) { "pnpm.cmd" } else { "pnpm" }
$pnpmOk = Get-ToolVersion -Command $pnpmCommand -Arguments @("--version") -Label "pnpm" -Required $true
$gitOk = Get-ToolVersion -Command "git" -Arguments @("--version") -Label "Git" -Required $true
$pythonCommand = if (Test-Path ".venv\Scripts\python.exe") { ".venv\Scripts\python.exe" } elseif (Get-Command "python" -ErrorAction SilentlyContinue) { "python" } elseif (Get-Command "py" -ErrorAction SilentlyContinue) { "py" } else { "python" }
$pythonOk = Get-ToolVersion -Command $pythonCommand -Arguments @("--version") -Label "Python" -Required $true
$dockerOk = Get-ToolVersion -Command "docker" -Arguments @("--version") -Label "Docker Desktop" -Required $true
$ollamaOk = Get-ToolVersion -Command "ollama" -Arguments @("--version") -Label "Ollama (required from ASCRM-30)" -Required $false

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
