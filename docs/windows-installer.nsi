; Build with makensis /DAPP_DIR=<absolute win-unpacked path> /DOUTPUT_FILE=<installer.exe>.
; Use -D instead of /D when invoking makensis on Linux.
Unicode true
!include "MUI2.nsh"
!include "x64.nsh"
!ifndef APP_DIR
  !error "APP_DIR must point to electron-builder's win-unpacked directory"
!endif
!ifndef OUTPUT_FILE
  !define OUTPUT_FILE "RepairDesk Offline Setup 1.0.0.exe"
!endif
Name "RepairDesk Offline"
OutFile "${OUTPUT_FILE}"
InstallDir "$LOCALAPPDATA\Programs\RepairDesk Offline"
InstallDirRegKey HKCU "Software\RepairDesk Offline" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID zlib
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "RepairDesk Offline"
VIAddVersionKey "FileDescription" "RepairDesk Offline installer"
VIAddVersionKey "FileVersion" "1.0.0"
VIAddVersionKey "LegalCopyright" "RepairDesk"
!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_OK|MB_ICONSTOP "RepairDesk Offline requires 64-bit Windows."
    Abort
  ${EndIf}
FunctionEnd
Section "Install"
  SetShellVarContext current
  SetOutPath "$INSTDIR"
  File /r "${APP_DIR}/*"
  WriteUninstaller "$INSTDIR\Uninstall RepairDesk Offline.exe"
  CreateShortcut "$DESKTOP\RepairDesk Offline.lnk" "$INSTDIR\RepairDesk Offline.exe"
  CreateDirectory "$SMPROGRAMS\RepairDesk Offline"
  CreateShortcut "$SMPROGRAMS\RepairDesk Offline\RepairDesk Offline.lnk" "$INSTDIR\RepairDesk Offline.exe"
  CreateShortcut "$SMPROGRAMS\RepairDesk Offline\Uninstall.lnk" "$INSTDIR\Uninstall RepairDesk Offline.exe"
  WriteRegStr HKCU "Software\RepairDesk Offline" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RepairDesk Offline" "DisplayName" "RepairDesk Offline"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RepairDesk Offline" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RepairDesk Offline" "Publisher" "RepairDesk"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RepairDesk Offline" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RepairDesk Offline" "DisplayIcon" "$INSTDIR\RepairDesk Offline.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RepairDesk Offline" "UninstallString" '$\"$INSTDIR\Uninstall RepairDesk Offline.exe$\"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RepairDesk Offline" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RepairDesk Offline" "NoRepair" 1
SectionEnd
Section "Uninstall"
  SetShellVarContext current
  IfFileExists "$INSTDIR\RepairDesk Offline.exe" 0 app_closed
  ClearErrors
  Delete "$INSTDIR\RepairDesk Offline.exe"
  IfErrors 0 app_closed
  MessageBox MB_OK|MB_ICONEXCLAMATION "Close RepairDesk Offline, then run uninstall again."
  Abort
  app_closed:
  ; Generated from the packaged file inventory; never recursively delete the chosen directory.
  !include "${REMOVE_FILES}"
  Delete "$INSTDIR\Uninstall RepairDesk Offline.exe"
  RMDir "$INSTDIR"
  Delete "$DESKTOP\RepairDesk Offline.lnk"
  Delete "$SMPROGRAMS\RepairDesk Offline\RepairDesk Offline.lnk"
  Delete "$SMPROGRAMS\RepairDesk Offline\Uninstall.lnk"
  RMDir "$SMPROGRAMS\RepairDesk Offline"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\RepairDesk Offline"
  DeleteRegKey HKCU "Software\RepairDesk Offline"
SectionEnd
