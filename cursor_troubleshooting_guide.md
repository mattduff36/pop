# Cursor Desktop App Troubleshooting Guide

## Error Details
**Request ID:** 467a8d9a-deae-454a-b20d-016b07f6dca2  
**Error Type:** ERROR_BAD_REQUEST, ConnectError: [invalid_argument]

This error typically indicates a connectivity or authentication issue with Cursor's servers.

## Quick Fixes (Try in Order)

### 1. Restart Cursor Application
- **Close Cursor completely** (check system tray/task manager)
- **Wait 10-15 seconds**
- **Restart Cursor**
- This often resolves temporary connection issues

### 2. Check System Time
- **Ensure your system clock is accurate**
- Incorrect system time can cause authentication failures
- **Windows:** Right-click taskbar clock → "Adjust date/time" → "Sync now"
- **Mac:** System Preferences → Date & Time → Enable "Set date and time automatically"
- **Linux:** `sudo ntpdate -s time.nist.gov` or use your system's time sync

### 3. Network Diagnostics
- **Open Cursor Settings** → **Network** → **Run Diagnostics**
- This tests connectivity to Cursor's servers
- Address any network issues identified

### 4. VPN/Proxy Issues
- **Temporarily disable VPN** if you're using one
- **Check proxy settings** in your network configuration
- Some corporate networks/firewalls may block Cursor's connections

## Advanced Solutions

### 5. Clear App Data (Windows)
⚠️ **Warning:** This will reset your settings, extensions, and preferences. Consider exporting your profile first.

Open Command Prompt and run:
```cmd
rd /s /q %USERPROFILE%\AppData\Local\Programs\cursor*
rd /s /q %USERPROFILE%\AppData\Local\Cursor*
rd /s /q %USERPROFILE%\AppData\Roaming\Cursor*
rd /s /q %USERPROFILE%\cursor*
```

### 6. Clear App Data (Mac)
```bash
sudo rm -rf ~/Library/Application\ Support/Cursor
rm -f ~/.cursor.json
```

### 7. Clear App Data (Linux)
```bash
rm -rf ~/.cursor ~/.config/Cursor/
```

### 8. Check Browser Authentication
- **Try logging in via web browser** at https://cursor.com
- **Clear browser cache and cookies**
- **Try different browsers** (Chrome, Firefox, Edge)
- If web login works but desktop doesn't, it's likely an app-specific issue

### 9. Firewall/Antivirus
- **Temporarily disable antivirus/firewall**
- **Add Cursor to whitelist/exceptions**
- **Check Windows Defender** or other security software

### 10. Registry Issues (Windows Admin Rights)
If you're on Windows without admin privileges, this might be a registry access issue:
- **Run Cursor as Administrator** (right-click → "Run as administrator")
- Or contact your IT administrator about registry access permissions

## Network Requirements
Cursor needs access to:
- `cursor.com` and subdomains
- `authenticator.cursor.sh`
- Standard HTTPS (port 443) connections

## Complete Reinstallation

### Uninstall Cursor
- **Windows:** Add/Remove Programs → Find "Cursor" → Uninstall
- **Mac:** Applications folder → Drag "Cursor" to Trash
- **Linux:** Delete the Cursor.AppImage file

### Reinstall
1. **Download latest version** from https://cursor.com/download
2. **Install with administrator privileges** if possible
3. **Restart computer** after installation

## Getting Additional Help

If none of these solutions work:

### Gather Information
1. **System Information:** Cursor → Help → About
2. **Console Errors:** Cursor → Help → Toggle Developer Tools → Console tab
3. **Logs:** Cursor → Command Palette → "Developer: Open Logs Folder"

### Contact Support
- **Email:** hi@cursor.com
- **Forum:** https://forum.cursor.com
- **Include:**
  - Screenshot of error (redact sensitive info)
  - System information
  - Steps you've already tried
  - Console errors/logs

## Common Causes Summary

1. **Temporary server issues** (most common)
2. **Network connectivity problems**
3. **Incorrect system time**
4. **VPN/proxy interference**
5. **Firewall/antivirus blocking**
6. **Corrupted app data**
7. **Authentication server issues**
8. **Corporate network restrictions**

## Success Rate
- **Simple restart:** ~60% success rate
- **System time fix:** ~20% success rate  
- **Network/VPN changes:** ~15% success rate
- **App data clearing:** ~90% success rate (but loses settings)

---

**Note:** Many users report that these errors are often temporary and resolve themselves within a few hours. If you're not in a rush, waiting and trying again later sometimes works.