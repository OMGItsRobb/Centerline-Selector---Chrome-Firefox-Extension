const browserApi = globalThis.CENTERLINE_EXTENSION_API;
const defaults = { ...globalThis.CENTERLINE_DEFAULTS };
const contentScriptFiles = [
  "extension-api.js",
  "defaults.js",
  "content-script.js",
];
const contentStyleFiles = ["content-script.css"];
const selectionStorageKey = "savedSelection";
const legacySettingKeys = ["strokeWidth", "dotSize"];
const minSelectionSize = 8;
const storageArea = browserApi.storage?.local;
const allowedColors = new Set([
  "#d62828",
  "#f4c430",
  "#2563eb",
  "#2f9e44",
  "#7c3aed",
  "#111111",
  "#ffffff",
]);

const settingsForm = document.querySelector("#settingsForm");
const previewStage = document.querySelector("#previewStage");
const markerModeInput = document.querySelector("#markerMode");
const colorInput = document.querySelector("#color");
const opacityInput = document.querySelector("#opacity");
const sizeInput = document.querySelector("#size");
const opacityValue = document.querySelector("#opacityValue");
const sizeValue = document.querySelector("#sizeValue");
const savedSelectionInfo = document.querySelector("#savedSelectionInfo");
const statusNode = document.querySelector("#status");
const startButton = document.querySelector("#startSelection");
const useSavedSelectionButton = document.querySelector("#useSavedSelection");
const clearButton = document.querySelector("#clearMarker");
const resetButton = document.querySelector("#resetDefaults");

let currentSettings = { ...defaults };
let savedSelection = null;

document.addEventListener("DOMContentLoaded", initialize);

async function initialize() {
  bindEvents();

  try {
    const storedState = await loadPopupState();
    currentSettings = normalizeSettings({ ...defaults, ...storedState });
    savedSelection = normalizeSavedSelection(storedState.savedSelection);
  } catch (error) {
    setStatus("Settings could not be loaded. Using defaults instead.", true);
    currentSettings = { ...defaults };
    savedSelection = null;
  }

  applySettingsToForm(currentSettings);
  renderPreview(currentSettings);
  updateSavedSelectionUI();
}

function bindEvents() {
  settingsForm.addEventListener("input", handleSettingsInput);
  startButton.addEventListener("click", handleStartSelection);
  useSavedSelectionButton.addEventListener("click", handleUseSavedSelection);
  clearButton.addEventListener("click", handleClearMarker);
  resetButton.addEventListener("click", handleResetDefaults);
}

async function handleSettingsInput() {
  currentSettings = readSettingsFromForm();
  applySettingsToForm(currentSettings);
  renderPreview(currentSettings);

  try {
    await saveSettings(currentSettings);
  } catch (error) {
    setStatus("The new settings could not be saved locally.", true);
    return;
  }

  try {
    await sendMessageToActiveTab(
      "centerline:updateSettings",
      { settings: currentSettings },
      { injectIfNeeded: false, tolerateMissingContentScript: true },
    );
  } catch (error) {
    // Settings are still saved locally even if there is no active marker on the current tab.
  }

  clearStatus();
}

async function handleStartSelection() {
  currentSettings = readSettingsFromForm();
  applySettingsToForm(currentSettings);
  renderPreview(currentSettings);

  try {
    await saveSettings(currentSettings);
  } catch (error) {
    // Starting the selector should still work even if local storage is unavailable.
  }

  try {
    await sendMessageToActiveTab("centerline:startSelection", {
      settings: currentSettings,
    });
    window.close();
  } catch (error) {
    setStatus(getActionErrorMessage(error, "start"), true);
  }
}

async function handleUseSavedSelection() {
  if (!savedSelection) {
    setStatus("No saved selection has been stored yet.", true);
    return;
  }

  currentSettings = readSettingsFromForm();
  applySettingsToForm(currentSettings);
  renderPreview(currentSettings);

  try {
    await saveSettings(currentSettings);
  } catch (error) {
    setStatus("The current settings could not be saved locally.", true);
    return;
  }

  try {
    const response = await sendMessageToActiveTab(
      "centerline:applySavedSelection",
      {
        settings: currentSettings,
        savedSelection,
      },
    );

    if (response?.savedSelection) {
      savedSelection =
        normalizeSavedSelection(response.savedSelection) ?? savedSelection;
      updateSavedSelectionUI();
    }

    if (response?.applied) {
      setStatus("Saved selection applied.");
      return;
    }

    setStatus("No saved selection has been stored yet.", true);
  } catch (error) {
    setStatus(getActionErrorMessage(error, "restore"), true);
  }
}

async function handleClearMarker() {
  try {
    const response = await sendMessageToActiveTab(
      "centerline:clearMarker",
      {},
      { injectIfNeeded: false, tolerateMissingContentScript: true },
    );

    if (response?.cleared) {
      setStatus("Marker cleared from the current page.");
      return;
    }

    setStatus("No marker is active on this page.");
  } catch (error) {
    setStatus(getActionErrorMessage(error, "clear"), true);
  }
}

async function handleResetDefaults() {
  currentSettings = { ...defaults };
  applySettingsToForm(currentSettings);
  renderPreview(currentSettings);

  try {
    await saveSettings(currentSettings);
  } catch (error) {
    setStatus(
      "Defaults were restored in the popup, but local storage failed.",
      true,
    );
    return;
  }

  try {
    await sendMessageToActiveTab(
      "centerline:updateSettings",
      { settings: currentSettings },
      { injectIfNeeded: false, tolerateMissingContentScript: true },
    );
  } catch (error) {
    // The defaults are still saved even if there is no active marker to refresh.
  }

  setStatus("Defaults restored.");
}

function readSettingsFromForm() {
  return normalizeSettings({
    markerMode: markerModeInput.value,
    color: colorInput.value,
    opacity: opacityInput.value,
    size: sizeInput.value,
  });
}

function applySettingsToForm(settings) {
  markerModeInput.value = settings.markerMode;
  colorInput.value = settings.color;
  opacityInput.value = String(settings.opacity);
  sizeInput.value = String(settings.size);
  opacityValue.textContent = `${Math.round(settings.opacity * 100)}%`;
  sizeValue.textContent = `${settings.size}px`;
}

function renderPreview(settings) {
  previewStage.dataset.mode = settings.markerMode;
  previewStage.style.setProperty("--preview-color", settings.color);
  previewStage.style.setProperty("--preview-opacity", String(settings.opacity));
  previewStage.style.setProperty("--preview-stroke", `${settings.size}px`);
  previewStage.style.setProperty("--preview-dot-size", `${settings.size}px`);
}

function updateSavedSelectionUI() {
  const hasSavedSelection = Boolean(savedSelection);
  useSavedSelectionButton.disabled = !hasSavedSelection;

  if (!hasSavedSelection) {
    savedSelectionInfo.dataset.empty = "true";
    savedSelectionInfo.textContent =
      "No saved selection yet. Confirm a selection once and reuse it later.";
    return;
  }

  const width = Math.round(savedSelection.rect.width);
  const height = Math.round(savedSelection.rect.height);
  const locationLabel = formatLocationLabel(savedSelection.sourceUrl);

  savedSelectionInfo.dataset.empty = "false";
  savedSelectionInfo.textContent = `Saved selection: ${width}px x ${height}px${locationLabel ? ` from ${locationLabel}` : ""}.`;
}

async function loadPopupState() {
  if (!storageArea) {
    throw new Error("missing-storage-api");
  }

  return storageArea.get([
    ...Object.keys(defaults),
    ...legacySettingKeys,
    selectionStorageKey,
  ]);
}

async function saveSettings(settings) {
  if (!storageArea) {
    throw new Error("missing-storage-api");
  }

  await storageArea.set(settings);

  if (typeof storageArea.remove === "function") {
    await storageArea.remove(legacySettingKeys);
  }
}

async function sendMessageToActiveTab(type, payload = {}, options = {}) {
  const { injectIfNeeded = true, tolerateMissingContentScript = false } =
    options;
  const activeTab = await getActiveTab();

  ensureSupportedPage(activeTab);

  if (injectIfNeeded) {
    await ensureContentScriptReady(activeTab.id);
  }

  try {
    return await browserApi.tabs.sendMessage(activeTab.id, {
      type,
      ...payload,
    });
  } catch (error) {
    if (tolerateMissingContentScript && shouldInjectContentScript(error)) {
      return null;
    }

    throw normalizeTabAccessError(error);
  }
}

async function ensureContentScriptReady(tabId) {
  try {
    await pingContentScript(tabId);
    return;
  } catch (error) {
    if (!shouldInjectContentScript(error)) {
      throw normalizeTabAccessError(error);
    }
  }

  try {
    await injectContentScript(tabId);
  } catch (error) {
    throw normalizeTabAccessError(error);
  }

  await pingAfterInjection(tabId);
}

async function pingContentScript(tabId) {
  return browserApi.tabs.sendMessage(tabId, { type: "centerline:ping" });
}

async function pingAfterInjection(tabId) {
  let lastError = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await pingContentScript(tabId);
      return;
    } catch (error) {
      lastError = error;
      await delay(80);
    }
  }

  throw normalizeTabAccessError(lastError);
}

async function getActiveTab() {
  const tabs = await browserApi.tabs.query({
    active: true,
    currentWindow: true,
  });
  const activeTab = tabs[0];

  if (!activeTab || typeof activeTab.id !== "number") {
    throw new Error("no-active-tab");
  }

  return activeTab;
}

function ensureSupportedPage(tab) {
  if (!canRunOnUrl(tab.url)) {
    throw new Error("unsupported-page");
  }
}

function canRunOnUrl(url) {
  if (typeof url !== "string" || url.length === 0) {
    return true;
  }

  const blockedPrefixes = [
    "about:",
    "moz-extension:",
    "chrome:",
    "chrome-extension:",
    "resource:",
    "view-source:",
    "data:",
    "javascript:",
  ];

  return !blockedPrefixes.some((prefix) => url.startsWith(prefix));
}

function shouldInjectContentScript(error) {
  const message = getErrorMessage(error);
  return /receiving end does not exist|could not establish connection|message manager disconnected/i.test(
    message,
  );
}

async function injectContentScript(tabId) {
  if (typeof browserApi.scripting?.executeScript !== "function") {
    throw new Error("missing-scripting-api");
  }

  if (typeof browserApi.scripting?.insertCSS === "function") {
    for (const file of contentStyleFiles) {
      await browserApi.scripting.insertCSS({
        target: { tabId },
        files: [file],
      });
    }
  }

  for (const file of contentScriptFiles) {
    await browserApi.scripting.executeScript({
      target: { tabId },
      files: [file],
    });
  }
}

function getActionErrorMessage(error, action) {
  const errorMessage = getErrorMessage(error);

  if (errorMessage === "unsupported-page") {
    return "Chrome blocks extensions on this page. Try a normal website tab.";
  }

  if (errorMessage === "no-active-tab") {
    return "No active browser tab was found.";
  }

  if (errorMessage === "missing-storage-api") {
    return "Chrome did not expose local extension storage for this popup.";
  }

  if (errorMessage === "missing-scripting-api") {
    return "Chrome could not inject the page tools on this tab.";
  }

  if (errorMessage === "blocked-tab-access") {
    return "Chrome denied access to this tab. Try a normal http or https page.";
  }

  if (action === "restore") {
    return `Could not apply the saved selection on this tab. ${formatUnexpectedError(errorMessage)}`;
  }

  if (action === "clear") {
    return `Could not reach the current marker on this tab. ${formatUnexpectedError(errorMessage)}`;
  }

  return `Could not start selection on this tab. ${formatUnexpectedError(errorMessage)}`;
}

function normalizeTabAccessError(error) {
  const message = getErrorMessage(error);

  if (isBlockedTabAccessMessage(message)) {
    return new Error("blocked-tab-access");
  }

  return error instanceof Error
    ? error
    : new Error(message || "unknown-tab-error");
}

function isBlockedTabAccessMessage(message) {
  return /missing host permission|cannot access contents of url|permission denied|restricted url|not allowed to inject/i.test(
    message,
  );
}

function formatUnexpectedError(message) {
  if (!message) {
    return "Reload the extension and try again.";
  }

  return `Details: ${message}`;
}

function formatLocationLabel(url) {
  if (typeof url !== "string" || url.length === 0) {
    return "";
  }

  try {
    return new URL(url).host;
  } catch (error) {
    return "";
  }
}

function normalizeSavedSelection(input) {
  if (!input || typeof input !== "object") {
    return null;
  }

  const rect = input.rect;

  if (!rect || typeof rect !== "object") {
    return null;
  }

  const width = Math.round(
    clampNumber(rect.width, minSelectionSize, 100000, 0),
  );
  const height = Math.round(
    clampNumber(rect.height, minSelectionSize, 100000, 0),
  );

  if (width < minSelectionSize || height < minSelectionSize) {
    return null;
  }

  const viewportRect =
    input.viewportRect && typeof input.viewportRect === "object"
      ? normalizeSelectionRect(input.viewportRect)
      : null;

  return {
    rect: {
      left: Math.round(clampNumber(rect.left, 0, 1000000, 0)),
      top: Math.round(clampNumber(rect.top, 0, 1000000, 0)),
      width,
      height,
    },
    viewportRect,
    sourceUrl: typeof input.sourceUrl === "string" ? input.sourceUrl : "",
    savedAt: Number.isFinite(Number(input.savedAt))
      ? Number(input.savedAt)
      : Date.now(),
  };
}

function normalizeSelectionRect(input) {
  const width = Math.round(
    clampNumber(input.width, minSelectionSize, 100000, 0),
  );
  const height = Math.round(
    clampNumber(input.height, minSelectionSize, 100000, 0),
  );

  return {
    left: Math.round(clampNumber(input.left, 0, 1000000, 0)),
    top: Math.round(clampNumber(input.top, 0, 1000000, 0)),
    width,
    height,
  };
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
}

function getErrorMessage(error) {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "";
}

function clearStatus() {
  statusNode.textContent = "";
  statusNode.classList.remove("is-error");
}

function setStatus(message, isError = false) {
  statusNode.textContent = message;
  statusNode.classList.toggle("is-error", isError);
}

function normalizeSettings(input) {
  const allowedModes = new Set(["dot", "crosshair"]);
  const markerMode = allowedModes.has(input.markerMode)
    ? input.markerMode
    : defaults.markerMode;
  const color = allowedColors.has(input.color) ? input.color : defaults.color;

  return {
    markerMode,
    color,
    opacity: clampNumber(input.opacity, 0.1, 1, defaults.opacity),
    size: Math.round(clampNumber(resolveLegacySize(input), 2, 24, defaults.size)),
  };
}

function resolveLegacySize(input) {
  if (input.size !== undefined) {
    return input.size;
  }

  if (input.markerMode === "crosshair") {
    return input.strokeWidth ?? input.dotSize ?? defaults.size;
  }

  return input.dotSize ?? input.strokeWidth ?? defaults.size;
}

function clampNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, parsed));
}

