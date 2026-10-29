# Catchy ACCA — Desktop Application Release Guide

**Creator Credit:** Catchy ACCA · by ly77ee  
**License:** Open Source (MIT)  
**Distribution:** Windows (`.exe` NSIS) & macOS (`.dmg` Disk Image)

---

## 1. Overview & Product Mission

Catchy ACCA is an open-source, local-first desktop study workspace tailored for ACCA (Association of Chartered Certified Accountants) students. It helps students organise exam preparation, practise numerical workings, draft narrative responses, track syllabus progress, and stay informed about official ACCA deadlines—all directly on their personal computer without mandatory cloud accounts, subscriptions, or remote server dependencies.

---

## 2. Supported Platforms

| Operating System | Architecture | Installer Format | Minimum OS Version |
|---|---|---|---|
| **macOS** | Apple Silicon (`arm64`) & Intel (`x64`) | `.dmg` (Drag-to-Applications) | macOS 12 Monterey or later |
| **Windows** | 64-bit (`x64`) & ARM64 | `.exe` (NSIS Installer) | Windows 10 or Windows 11 |

---

## 3. Installation Guide

### Windows Installation (`.exe`)
1. Download the latest `Catchy ACCA-Setup-1.0.0.exe` installer from GitHub Releases.
2. Double-click the installer to launch setup.
3. Choose your preferred installation options:
   - Select installation directory (defaults to `%LOCALAPPDATA%\Programs\Catchy ACCA`).
   - Choose whether to create a **Desktop shortcut**.
   - A **Start Menu shortcut** is created automatically for seamless launching.
4. Click **Install**. Once finished, check "Run Catchy ACCA" and click **Finish**.
5. The application opens directly in its own distraction-free desktop window.

### macOS Installation (`.dmg`)
1. Download `Catchy ACCA-1.0.0-arm64.dmg` from GitHub Releases.
2. Double-click the downloaded `.dmg` file to mount the disk image.
3. Drag the **Catchy ACCA** application icon into your **Applications** folder.
4. Eject the mounted disk image and open **Catchy ACCA** from Launchpad, Spotlight, or Applications.
5. **Gatekeeper Notice for Open-Source Software:**
   If macOS displays a notice stating *"Catchy ACCA cannot be opened because the developer cannot be verified"*:
   - Right-click (or Control-click) `Catchy ACCA.app` in `/Applications` and select **Open**.
   - Click **Open** in the confirmation dialog. This approval is saved permanently.

---

## 4. First-Launch Onboarding Wizard

Upon launching Catchy ACCA for the first time, an 8-step onboarding wizard guides you through configuring your study workspace:

1. **Welcome:** Introduction to the local-first, distraction-free environment.
2. **Student Profile:** Optionally set your preferred display name, current study stage (Applied Knowledge, Applied Skills, or Strategic Professional), and country/region.
3. **Exam Target:** Select your next target paper (e.g. FR, PM, SBR), intended session (e.g. December 2026, March 2027), and target score.
4. **Study Materials:** Overview of local PDF document management (supporting up to 4 concurrent PDFs with split-screen view).
5. **Study Workflows:** Tour of the Excel Workspace, Word Editor, Progress Tracker, and Exam Planner.
6. **Official Resources:** Quick-launch bookmarks to MyACCA, ACCA Study Hub, and ACCA Global (all launch in your default system browser).
7. **ACCA News & Reminders:** Verified deadline schedules and regional fee details (£134 India annual subscription).
8. **Completion:** Confirmation summary and one-click entry to the dashboard.

> **Tip:** You can click **Skip setup** at any time to jump straight into the application. You can also re-run the wizard at any time via **Settings > Workspace Onboarding & Setup Wizard** without losing any of your existing notes, study materials, or answers.

---

## 5. Local Data Storage & Privacy

Catchy ACCA follows a strict **zero-telemetry, zero-cloud, local-first** architecture:

- **No Remote Database:** All study notes, question attempts, mock exam answers, chapter mastery records, and imported PDF references reside exclusively on your machine.
- **Permanent Application Storage Directory:**
  - **Windows:** `%APPDATA%\Catchy ACCA\` (e.g., `C:\Users\<User>\AppData\Roaming\Catchy ACCA\IndexedDB`)
  - **macOS:** `~/Library/Application Support/Catchy ACCA/IndexedDB`
- **Safe Application Upgrades:** Upgrading to a newer version of Catchy ACCA replaces only application binaries; all existing student databases in `userData` remain completely untouched.
- **Uninstallation Data Safety:** The Windows NSIS uninstaller is explicitly configured with `deleteAppDataOnUninstall: false`. Removing or reinstalling the app does not silently delete your study notes or progress.
- **Backup & Portability:** You can generate a full encrypted/structured JSON backup anytime via **Settings > Data Backup & Device Portability**, allowing seamless transfer between Windows and macOS.

---

## 6. Offline Capabilities

- **100% Offline Core Tools:**
  - Full-screen & Split-screen Excel Workspace (FortuneSheet).
  - CBE Word Editor with live character and word counters.
  - Question Checklist & Syllabus Chapter Mastery Progress.
  - Catchy Notes with hierarchical folder tree.
  - PDF document reading and annotations.
  - Cached ACCA official deadlines and announcement archive.
- **Features Requiring Network:**
  - Refreshing live official ACCA deadline feeds.
  - Opening external ACCA portal links in your web browser.

---

## 7. Troubleshooting & Verification

- **Checksums:** Every release publishes SHA-256 checksums (`checksums-mac.txt` and `checksums-win.txt`) on the GitHub Releases page.
  - To verify on macOS: `shasum -a 256 Catchy\ ACCA-1.0.0-arm64.dmg`
  - To verify on Windows: `Get-FileHash Catchy\ ACCA-Setup-1.0.0.exe -Algorithm SHA256`
- **Missing File Error:** If an imported PDF was moved on your hard drive, Catchy ACCA displays an alert allowing you to re-link or re-import the file in Study Materials.
