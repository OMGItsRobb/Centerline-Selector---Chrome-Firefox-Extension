# CenterLine Selector

Easily get the middle of a selected area. Used mostly for CAD programs that aren't smart enough to add one natively.
CenterLine Selector is a Firefox WebExtension for marking the visual center of a selected on-screen area. Draw a box on the current page, confirm it, and the extension will place a center marker using a dot, crosshair, or both.

## Features

- Draw a selection box directly on the current page.
- Mark the midpoint with a dot, crosshair, or a combined marker.
- Adjust color, opacity, stroke width, and dot size from the popup UI.
- Update marker styling after a selection has already been created.
- Save the most recent selection locally and restore it with one click.
- Package the extension as an `.xpi` for Firefox distribution.

## Project Structure

- `manifest.json`: Firefox extension manifest.
- `popup.html`, `popup.css`, `popup.js`: popup UI and settings logic.
- `content-script.js`, `content-script.css`: page overlay, selection, and marker rendering.
- `defaults.js`: shared default settings.
- `icons/`: extension icons.
- `build-xpi.ps1`, `build-xpi.cmd`: packaging scripts for generating an `.xpi`.

## Development

To load the extension temporarily during development:

1. Open `about:debugging#/runtime/this-firefox` in Firefox.
2. Choose **Load Temporary Add-on**.
3. Select `manifest.json` from this repository.
4. Reload the temporary add-on after manifest changes.

## Usage

1. Open the extension popup from the Firefox toolbar.
2. Adjust the marker settings.
3. Click **Start Selection**.
4. Drag a box on the page and confirm it.
5. Reopen the popup any time to restyle the current marker.
6. Click **Use Saved Selection** to restore the last saved selection.
7. Click **Clear Marker** to remove the current marker.

## Build

Generate an `.xpi` package from the repository root with either of the following:

```bat
build-xpi.cmd
```

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\build-xpi.ps1
```

## Distribution Notes

- Firefox blocks extension injection on some internal pages.
- Permanent installation in standard Firefox requires a Mozilla-signed package.
- This repository contains a plain WebExtension with no external build system or framework dependency.
