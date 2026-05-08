# CenterLine Selector

CenterLine Selector is a lightweight browser extension for marking the visual center of a selected area on a page. It is mainly intended for web-based tools and CAD-style workflows where you need a quick midpoint marker without built-in centerline tooling.

This repository contains two Manifest V3 variants of the extension:

- `Chrome/`: Chrome-compatible package with a small API wrapper for promise-based extension calls.
- `Firefox/`: Firefox WebExtension package with Gecko-specific manifest settings.

<img width="474" height="563" alt="image" src="https://github.com/user-attachments/assets/507ec87f-1d6e-4c04-92f6-4558db041b81" />

<img width="2560" height="1397" alt="image" src="https://github.com/user-attachments/assets/bb2e070a-90dc-464a-8cb7-d37a6eed18b2" />

<img width="2560" height="1390" alt="image" src="https://github.com/user-attachments/assets/2de07341-97e0-40f5-a459-00f4d7dfc1d4" />



## Features

- Draw a selection box directly on the current page.
- Mark the midpoint with either a dot or a crosshair.
- Adjust marker color, opacity, and size from the popup UI.
- Restyle an existing marker without redrawing the selection.
- Save the last confirmed selection locally and restore it later.
- Package browser-specific builds for Chrome or Firefox without a separate build system.

## Repository Layout

| Path       | Purpose                                                        |
| ---------- | -------------------------------------------------------------- |
| `Chrome/`  | Chrome extension source, icons, and `.zip` packaging scripts.  |
| `Firefox/` | Firefox extension source, icons, and `.xpi` packaging scripts. |

Both targets are plain JavaScript extensions. There is no framework, bundler, or npm-based build step.

## Browser Targets

| Browser | Folder     | Temporary Load Flow                                                  | Package Output                            |
| ------- | ---------- | -------------------------------------------------------------------- | ----------------------------------------- |
| Chrome  | `Chrome/`  | `chrome://extensions` -> **Developer mode** -> **Load unpacked**     | `CenterLineSelector-Chrome-<version>.zip` |
| Firefox | `Firefox/` | `about:debugging#/runtime/this-firefox` -> **Load Temporary Add-on** | `CenterLineSelector-<version>.xpi`        |

## Development

### Chrome

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `Chrome` folder.
5. Reload the unpacked extension after manifest or script changes.

### Firefox

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Click **Load Temporary Add-on**.
3. Select `Firefox/manifest.json`.
4. Reload the temporary add-on after manifest or script changes.

## Usage

1. Open the extension popup from the browser toolbar.
2. Adjust the marker settings.
3. Click **Start Selection**.
4. Drag a box on the page and confirm it.
5. Reopen the popup to restyle the active marker if needed.
6. Click **Use Saved Selection** to restore the last saved selection.
7. Click **Clear Marker** to remove the current marker.

## Packaging

Run the packaging script for the browser you want to ship.

### Chrome package

From the repository root:

```bat
Chrome\build-zip.cmd
```

Or with PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Chrome\build-zip.ps1
```

### Firefox package

From the repository root:

```bat
Firefox\build-xpi.cmd
```

Or with PowerShell:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Firefox\build-xpi.ps1
```

## Notes

- Settings are stored locally by the extension.
- Chrome includes `extension-api.js` to normalize extension API calls.
- Chrome ships raster PNG icons, while Firefox uses the SVG icon assets declared in its manifest.
- Internal browser pages cannot be scripted, so selection will not work on browser-controlled URLs.
