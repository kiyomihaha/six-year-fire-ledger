$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$toolRoot = "D:\AIProject\test1\nvme_mobile_apk\tools"
$jdkHome = Join-Path $toolRoot "jdk_extract\PFiles64\Microsoft\jdk-17.0.18.8-hotspot"
$sdkRoot = Join-Path $toolRoot "android-sdk"
$gradleBin = Join-Path $toolRoot "gradle-8.2.1\bin\gradle.bat"
$apkSrc = Join-Path $projectRoot "app\build\outputs\apk\debug\app-debug.apk"
$apkDst = Join-Path $projectRoot "dist\SixYearLedger-debug.apk"

if (!(Test-Path $jdkHome)) { throw "JDK not found: $jdkHome" }
if (!(Test-Path $sdkRoot)) { throw "Android SDK not found: $sdkRoot" }
if (!(Test-Path $gradleBin)) { throw "Gradle not found: $gradleBin" }

$env:JAVA_HOME = $jdkHome
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:PATH = "$jdkHome\bin;$env:PATH"

Push-Location $projectRoot
try {
    & $gradleBin assembleDebug --no-daemon
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle build failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

if (!(Test-Path $apkSrc)) { throw "APK not generated: $apkSrc" }
Copy-Item -LiteralPath $apkSrc -Destination $apkDst -Force
Write-Host "APK ready: $apkDst"
