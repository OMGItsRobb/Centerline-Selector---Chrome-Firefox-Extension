# CenterLine Selector

**CenterLine Selector** is a browser extension for Chrome and Firefox that lets you draw a box over any area on a webpage and instantly marks its visual center with a dot or crosshair. It was originally built to fill a gap left by CAD and design tools that don't provide a native on-screen centerline helper, but it's useful any time you need a precise midpoint reference on your screen.

---

## Features

- **Draw a selection box** on any webpage by clicking and dragging.
- **Mark the midpoint** with either a dot or a crosshair.
- **Customize the marker** — choose from seven preset colors, adjust opacity from 10% to 100%, and set a size from 2px to 24px.
- **Live preview** of the marker style inside the popup before you start.
- **Update styling live** — change settings while a marker is on screen and it updates immediately.
- **Save and restore** — confirm a selection and reuse it on any page with a single click.
- **Reset to defaults** at any time from the popup.
- **Keyboard shortcuts** — press **Enter** to confirm or **Esc** to cancel while drawing.
- No external dependencies, frameworks, or build systems.

---

## Installation

### Chrome

#### From source (developer mode)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `Chrome` folder from this repository.
5. The extension appears in your toolbar. Pin it for easy access.

#### From a packaged `.zip`

Build a `.zip` (see [Build](#build)) and upload it to the Chrome Web Store, or load it as an unpacked extension by unzipping it first and following the steps above.

---

### Firefox

#### From source (temporary install)

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on…**
3. Select the `manifest.json` file inside the `Firefox` folder.
4. The extension is active until Firefox is restarted.

#### From a packaged `.xpi`

Build an `.xpi` (see [Build](#build)) and submit it to [addons.mozilla.org](https://addons.mozilla.org) for signing, or install it locally via `about:addons` → gear icon → **Install Add-on From File…**.

> **Note:** Permanent installation in standard Firefox requires a Mozilla-signed package. Unbranded / Developer Edition Firefox can install unsigned extensions by enabling `xpinstall.signatures.required = false` in `about:config`.

---

## Usage

1. Navigate to any normal webpage.
2. Click the **CenterLine** icon in your browser toolbar to open the popup.
3. Choose your marker settings:
   - **Marker style** — *Dot only* or *Crosshair only*
   - **Color** — Red, Yellow, Blue, Green, Purple, Black, or White
   - **Opacity** — drag the slider (10% – 100%)
   - **Marker size** — drag the slider (2px – 24px)
4. Click **Start Selection**. The popup closes and a translucent overlay appears on the page.
5. Click and drag to draw a selection box over the area you want to measure.
6. Release the mouse. A **Confirm / Cancel** toolbar appears near the selection.
   - Click **Confirm** (or press **Enter**) to place the center marker.
   - Click **Cancel** (or press **Esc**) to dismiss the overlay without placing a marker.
7. The center marker is now visible on the page. Open the popup at any time to adjust its style — changes apply instantly.
8. Click **Use Saved Selection** to re-apply the most recently confirmed selection to the current page at the same viewport position.
9. Click **Clear Marker** to remove the marker from the current page.

---

## Settings Reference

| Setting | Values | Default |
|---|---|---|
| Marker style | Dot only, Crosshair only | Dot only |
| Color | Red `#d62828`, Yellow `#f4c430`, Blue `#2563eb`, Green `#2f9e44`, Purple `#7c3aed`, Black `#111111`, White `#ffffff` | Red |
| Opacity | 0.10 – 1.00 (step 0.05) | 0.90 |
| Marker size | 2px – 24px (step 1px) | 8px |

Settings are saved in the browser's local extension storage and persist across sessions.

---

## Project Structure

```
Centerline-Selector---Chrome-Firefox-Extension/
├── Chrome/
│   ├── manifest.json          # Manifest V3 extension manifest
│   ├── extension-api.js       # Promise-based wrapper around the Chrome API
│   ├── defaults.js            # Shared default settings
│   ├── popup.html             # Toolbar popup markup
│   ├── popup.css              # Popup styles
│   ├── popup.js               # Popup logic (settings, storage, messaging)
│   ├── content-script.js      # Page overlay, selection drawing, marker rendering
│   ├── content-script.css     # Overlay and marker styles injected into pages
│   ├── icons/                 # PNG and SVG extension icons
│   ├── build-zip.ps1          # PowerShell packaging script
│   ├── build-zip.cmd          # Windows batch wrapper for build-zip.ps1
│   └── CenterLineSelector-Chrome-1.0.0.zip
├── Firefox/
│   ├── manifest.json          # WebExtension manifest
│   ├── defaults.js            # Shared default settings
│   ├── popup.html             # Toolbar popup markup
│   ├── popup.css              # Popup styles
│   ├── popup.js               # Popup logic (settings, storage, messaging)
│   ├── content-script.js      # Page overlay, selection drawing, marker rendering
│   ├── content-script.css     # Overlay and marker styles injected into pages
│   ├── icons/                 # Extension icons
│   ├── build-xpi.ps1          # PowerShell packaging script
│   ├── build-xpi.cmd          # Windows batch wrapper for build-xpi.ps1
│   └── CenterLineSelector-1.0.0.xpi
└── README.md
```

The Chrome version includes `extension-api.js`, a thin compatibility wrapper that exposes the Chrome APIs as promise-based calls. The Firefox version uses the native `browser` API directly.

---

## Build

All packaging scripts read the version number from `manifest.json` automatically and write the output file to the same folder.

### Chrome — produce a `.zip`

```bat
cd Chrome
build-zip.cmd
```

```powershell
cd Chrome
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build-zip.ps1
```

Output: `Chrome/CenterLineSelector-Chrome-<version>.zip`

### Firefox — produce an `.xpi`

```bat
cd Firefox
build-xpi.cmd
```

```powershell
cd Firefox
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build-xpi.ps1
```

Output: `Firefox/CenterLineSelector-<version>.xpi`

---

## Known Limitations

| Browser | Limitation |
|---|---|
| Chrome | Extensions cannot be injected on `chrome://`, `chrome-extension://`, or Chrome Web Store pages. |
| Firefox | Extensions cannot be injected on `about:`, `moz-extension://`, or other restricted internal pages. |
| Firefox | Standard Firefox requires a Mozilla-signed `.xpi` for permanent installation. |

---

## License

See [Chrome/LICENSE](Chrome/LICENSE) or [Firefox/LICENSE](Firefox/LICENSE).
