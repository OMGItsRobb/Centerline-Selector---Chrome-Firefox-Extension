# CenterLine Selector

Easily get the middle of a selected area. Used mostly for CAD programs that aren't smart enough to add one natively.
CenterLine Selector is a Chrome extension for marking the visual center of a selected on-screen area. Draw a box on the current page, confirm it, and the extension will place a center marker using either a dot or a crosshair.

## Features

- Draw a selection box directly on the current page.
- Mark the midpoint with either a dot or crosshair.
- Choose from preset colors and adjust opacity and marker size from the popup UI.
- Update marker styling after a selection has already been created.
- Save the most recent selection locally and restore it with one click.
- Package the extension as a `.zip` for Chrome distribution.

## Project Structure

- `manifest.json`: Chrome extension manifest.
- `extension-api.js`: compatibility wrapper that normalizes Chrome APIs to promise-based calls.
- `popup.html`, `popup.css`, `popup.js`: popup UI and settings logic.
- `content-script.js`, `content-script.css`: page overlay, selection, and marker rendering.
- `defaults.js`: shared default settings.
- `icons/`: extension icons.
- `build-zip.ps1`, `build-zip.cmd`: packaging scripts for generating a `.zip`.

## Development

To load the extension temporarily during development:

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Choose **Load unpacked**.
4. Select this `Chrome` folder.
5. Reload the unpacked extension after manifest changes.

## Usage

1. Open the extension popup from the Chrome toolbar.
2. Adjust the marker settings.
3. Click **Start Selection**.
4. Drag a box on the page and confirm it.
5. Reopen the popup any time to restyle the current marker.
6. Click **Use Saved Selection** to restore the last saved selection.
7. Click **Clear Marker** to remove the current marker.

## Build

Generate a `.zip` package from the `Chrome` folder with either of the following:

```bat
build-zip.cmd
```

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build-zip.ps1
```

## Distribution Notes

- Chrome blocks extension injection on internal pages such as `chrome://` and the Chrome Web Store.
- Chrome requires raster icons in the manifest, so this port includes PNG toolbar and store icons.
- This repository contains a plain Manifest V3 extension with no external build system or framework dependency.
