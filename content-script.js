(() => {
  if (globalThis.__centerLineSelectorLoaded) {
    return;
  }

  globalThis.__centerLineSelectorLoaded = true;

  const browserApi = globalThis.browser;
  const defaults = { ...globalThis.CENTERLINE_DEFAULTS };
  const selectionStorageKey = "savedSelection";
  const minSelectionSize = 8;
  const overlayZIndex = 2147483646;
  const markerZIndex = 2147483647;

  const state = {
    settings: { ...defaults },
    overlay: null,
    selection: null,
    selectionLabel: null,
    toolbar: null,
    banner: null,
    markerRoot: null,
    marker: null,
    dragStart: null,
    currentRect: null,
    dragging: false,
    activeSelection: null,
  };

  browserApi.runtime.onMessage.addListener((message) => {
    if (!message || typeof message !== "object") {
      return undefined;
    }

    if (message.type === "centerline:ping") {
      return Promise.resolve({ ok: true });
    }

    if (message.type === "centerline:startSelection") {
      startSelection(message.settings);
      return Promise.resolve({ ok: true });
    }

    if (message.type === "centerline:updateSettings") {
      return Promise.resolve(updateSettings(message.settings));
    }

    if (message.type === "centerline:applySavedSelection") {
      return applySavedSelection(message.savedSelection, message.settings);
    }

    if (message.type === "centerline:clearMarker") {
      const hadMarker = Boolean(state.marker || state.activeSelection);
      clearMarker();
      stopSelectionMode();
      return Promise.resolve({ ok: true, cleared: hadMarker });
    }

    return undefined;
  });

  function startSelection(incomingSettings) {
    state.settings = normalizeSettings({
      ...state.settings,
      ...incomingSettings,
    });
    ensureOverlay();
    ensureMarkerRoot();

    state.currentRect = null;
    state.dragStart = null;
    state.dragging = false;
    state.selection.hidden = true;
    state.toolbar.hidden = true;
    state.banner.hidden = false;
    state.overlay.hidden = false;
  }

  function stopSelectionMode() {
    if (!state.overlay) {
      return;
    }

    state.overlay.hidden = true;
    state.selection.hidden = true;
    state.toolbar.hidden = true;
    state.banner.hidden = true;
    state.dragging = false;
    state.dragStart = null;
    state.currentRect = null;
  }

  function ensureOverlay() {
    if (state.overlay) {
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "clff-overlay";
    overlay.hidden = true;
    overlay.style.zIndex = String(overlayZIndex);
    overlay.innerHTML = `
      <div class="clff-scrim"></div>
      <div class="clff-banner" hidden>
        Drag a selection box. Press Enter to confirm or Esc to cancel.
      </div>
      <div class="clff-selection" hidden>
        <div class="clff-selection-label"></div>
      </div>
      <div class="clff-toolbar" hidden>
        <button type="button" class="clff-button clff-button--primary" data-action="confirm">Confirm</button>
        <button type="button" class="clff-button clff-button--secondary" data-action="cancel">Cancel</button>
      </div>
    `;

    document.documentElement.appendChild(overlay);

    state.overlay = overlay;
    state.selection = overlay.querySelector(".clff-selection");
    state.selectionLabel = overlay.querySelector(".clff-selection-label");
    state.toolbar = overlay.querySelector(".clff-toolbar");
    state.banner = overlay.querySelector(".clff-banner");

    overlay.addEventListener("pointerdown", handlePointerDown);
    overlay.addEventListener("pointermove", handlePointerMove);
    overlay.addEventListener("pointerup", handlePointerUp);
    overlay.addEventListener("click", handleToolbarClick);
    window.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("wheel", handleWheel, {
      capture: true,
      passive: false,
    });
  }

  function ensureMarkerRoot() {
    if (state.markerRoot && state.markerRoot.isConnected) {
      return;
    }

    const markerRoot = document.createElement("div");
    markerRoot.className = "clff-marker-root";
    markerRoot.style.zIndex = String(markerZIndex);
    document.documentElement.appendChild(markerRoot);
    state.markerRoot = markerRoot;
  }

  function handlePointerDown(event) {
    if (state.overlay.hidden || event.button !== 0) {
      return;
    }

    if (isToolbarTarget(event.target)) {
      return;
    }

    const startX = clampToViewport(event.clientX, window.innerWidth);
    const startY = clampToViewport(event.clientY, window.innerHeight);

    state.dragging = true;
    state.dragStart = { x: startX, y: startY };
    state.currentRect = null;
    state.banner.hidden = true;
    state.toolbar.hidden = true;
    state.selection.hidden = false;
    updateSelection(startX, startY);

    if (typeof state.overlay.setPointerCapture === "function") {
      try {
        state.overlay.setPointerCapture(event.pointerId);
      } catch (error) {
        // Pointer capture can fail on some pages; selection still works without it.
      }
    }

    event.preventDefault();
  }

  function handlePointerMove(event) {
    if (state.overlay.hidden || !state.dragging || !state.dragStart) {
      return;
    }

    updateSelection(event.clientX, event.clientY);
    event.preventDefault();
  }

  function handlePointerUp(event) {
    if (state.overlay.hidden || !state.dragging) {
      return;
    }

    state.dragging = false;
    updateSelection(event.clientX, event.clientY);

    if (typeof state.overlay.releasePointerCapture === "function") {
      try {
        state.overlay.releasePointerCapture(event.pointerId);
      } catch (error) {
        // No-op.
      }
    }

    if (!hasValidSelection(state.currentRect)) {
      state.currentRect = null;
      state.selection.hidden = true;
      state.toolbar.hidden = true;
      state.banner.hidden = false;
      return;
    }

    positionToolbar(state.currentRect);
    event.preventDefault();
  }

  function handleToolbarClick(event) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const actionButton = target.closest("[data-action]");

    if (!actionButton) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const action = actionButton.getAttribute("data-action");

    if (action === "confirm") {
      confirmSelection();
      return;
    }

    if (action === "cancel") {
      stopSelectionMode();
    }
  }

  function handleKeyDown(event) {
    if (!state.overlay || state.overlay.hidden) {
      return;
    }

    if (event.key === "Escape") {
      stopSelectionMode();
      event.preventDefault();
      return;
    }

    if (event.key === "Enter" && hasValidSelection(state.currentRect)) {
      confirmSelection();
      event.preventDefault();
    }
  }

  function handleWheel(event) {
    if (!state.overlay || state.overlay.hidden) {
      return;
    }

    event.preventDefault();
  }

  function updateSelection(rawX, rawY) {
    const currentX = clampToViewport(rawX, window.innerWidth);
    const currentY = clampToViewport(rawY, window.innerHeight);
    const left = Math.min(state.dragStart.x, currentX);
    const top = Math.min(state.dragStart.y, currentY);
    const width = Math.max(1, Math.abs(currentX - state.dragStart.x));
    const height = Math.max(1, Math.abs(currentY - state.dragStart.y));

    state.currentRect = {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    };

    state.selection.style.left = `${left}px`;
    state.selection.style.top = `${top}px`;
    state.selection.style.width = `${width}px`;
    state.selection.style.height = `${height}px`;
    state.selectionLabel.textContent = `${Math.round(width)} x ${Math.round(height)}`;
  }

  function positionToolbar(rect) {
    const margin = 12;
    state.toolbar.hidden = false;
    state.toolbar.style.visibility = "hidden";

    const toolbarRect = state.toolbar.getBoundingClientRect();
    const maxLeft = Math.max(
      margin,
      window.innerWidth - toolbarRect.width - margin,
    );
    const maxTop = Math.max(
      margin,
      window.innerHeight - toolbarRect.height - margin,
    );
    let left = rect.right - toolbarRect.width;
    let top = rect.bottom + margin;

    if (top > maxTop) {
      top = rect.top - toolbarRect.height - margin;
    }

    left = Math.min(maxLeft, Math.max(margin, left));
    top = Math.min(maxTop, Math.max(margin, top));

    state.toolbar.style.left = `${left}px`;
    state.toolbar.style.top = `${top}px`;
    state.toolbar.style.visibility = "visible";
  }

  function confirmSelection() {
    if (!hasValidSelection(state.currentRect)) {
      return;
    }

    const savedSelection = createSavedSelectionFromViewportRect(
      state.currentRect,
    );
    applySelection(savedSelection);
    persistSavedSelection(savedSelection).catch(() => {
      // The current marker should still render even if storage is unavailable.
    });
    stopSelectionMode();
  }

  function updateSettings(incomingSettings) {
    state.settings = normalizeSettings({
      ...state.settings,
      ...incomingSettings,
    });

    if (!state.activeSelection) {
      return { ok: true, applied: false };
    }

    renderMarker(state.activeSelection, state.settings);
    return { ok: true, applied: true };
  }

  async function applySavedSelection(savedSelectionInput, incomingSettings) {
    state.settings = normalizeSettings({
      ...state.settings,
      ...incomingSettings,
    });

    const normalizedSelection = normalizeSavedSelection(savedSelectionInput);

    if (!normalizedSelection) {
      return { ok: true, applied: false };
    }

    const resolvedSelection =
      resolveSavedSelectionForCurrentPage(normalizedSelection);
    applySelection(resolvedSelection);

    try {
      await persistSavedSelection(resolvedSelection);
    } catch (error) {
      // The restored marker stays visible even if storage cannot be refreshed.
    }

    return { ok: true, applied: true, savedSelection: resolvedSelection };
  }

  function applySelection(savedSelection) {
    state.activeSelection = savedSelection;
    renderMarker(savedSelection, state.settings);
  }

  function renderMarker(savedSelection, settings) {
    ensureMarkerRoot();
    removeMarkerElement();

    const viewportRect = savedSelection.viewportRect ?? {
      left: savedSelection.rect.left - window.scrollX,
      top: savedSelection.rect.top - window.scrollY,
      width: savedSelection.rect.width,
      height: savedSelection.rect.height,
    };

    const marker = document.createElement("div");
    marker.className = "clff-marker";
    marker.style.left = `${viewportRect.left}px`;
    marker.style.top = `${viewportRect.top}px`;
    marker.style.width = `${viewportRect.width}px`;
    marker.style.height = `${viewportRect.height}px`;
    marker.style.setProperty("--clff-color", settings.color);
    marker.style.setProperty("--clff-opacity", String(settings.opacity));
    marker.style.setProperty("--clff-stroke", `${settings.strokeWidth}px`);
    marker.style.setProperty("--clff-dot-size", `${settings.dotSize}px`);

    if (settings.markerMode === "crosshair" || settings.markerMode === "both") {
      marker.appendChild(
        createMarkerPart("clff-marker-line clff-marker-line--horizontal"),
      );
      marker.appendChild(
        createMarkerPart("clff-marker-line clff-marker-line--vertical"),
      );
    }

    if (settings.markerMode === "dot" || settings.markerMode === "both") {
      marker.appendChild(createMarkerPart("clff-marker-dot"));
    }

    state.markerRoot.appendChild(marker);
    state.marker = marker;
  }

  function createMarkerPart(className) {
    const element = document.createElement("div");
    element.className = className;
    return element;
  }

  function clearMarker() {
    removeMarkerElement();
    state.activeSelection = null;
  }

  function removeMarkerElement() {
    if (state.marker) {
      state.marker.remove();
      state.marker = null;
    }
  }

  function createSavedSelectionFromViewportRect(rect) {
    return buildSavedSelection({
      rect: {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        width: rect.width,
        height: rect.height,
      },
      viewportRect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      sourceUrl: location.href,
      savedAt: Date.now(),
    });
  }

  function resolveSavedSelectionForCurrentPage(savedSelection) {
    if (savedSelection.viewportRect) {
      const viewportRect = buildViewportRect(savedSelection.viewportRect);

      return buildSavedSelection({
        rect: {
          left: viewportRect.left + window.scrollX,
          top: viewportRect.top + window.scrollY,
          width: viewportRect.width,
          height: viewportRect.height,
        },
        viewportRect,
        sourceUrl: location.href,
        savedAt: Date.now(),
      });
    }

    return buildSavedSelection({
      rect: {
        left: savedSelection.rect.left,
        top: savedSelection.rect.top,
        width: savedSelection.rect.width,
        height: savedSelection.rect.height,
      },
      sourceUrl: location.href,
      savedAt: Date.now(),
    });
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
        ? buildViewportRect(input.viewportRect)
        : null;

    return {
      rect: {
        left: Math.round(clampNumber(rect.left, 0, 1000000, 0)),
        top: Math.round(clampNumber(rect.top, 0, 1000000, 0)),
        width,
        height,
      },
      viewportRect,
      sourceUrl:
        typeof input.sourceUrl === "string" ? input.sourceUrl : location.href,
      savedAt: Number.isFinite(Number(input.savedAt))
        ? Number(input.savedAt)
        : Date.now(),
    };
  }

  function buildSavedSelection(input) {
    const rect = buildPageRect(input.rect ?? input);
    const viewportRect = buildViewportRect(
      input.viewportRect ?? {
        left: rect.left - window.scrollX,
        top: rect.top - window.scrollY,
        width: rect.width,
        height: rect.height,
      },
    );

    return {
      rect,
      viewportRect,
      sourceUrl:
        typeof input.sourceUrl === "string" ? input.sourceUrl : location.href,
      savedAt: Number.isFinite(Number(input.savedAt))
        ? Number(input.savedAt)
        : Date.now(),
    };
  }

  function buildPageRect(input) {
    const documentWidth = Math.max(
      window.innerWidth,
      document.documentElement?.scrollWidth ?? 0,
      document.body?.scrollWidth ?? 0,
    );
    const documentHeight = Math.max(
      window.innerHeight,
      document.documentElement?.scrollHeight ?? 0,
      document.body?.scrollHeight ?? 0,
    );
    const width = Math.round(
      clampNumber(
        input.width ?? input.rect?.width,
        minSelectionSize,
        documentWidth,
        minSelectionSize,
      ),
    );
    const height = Math.round(
      clampNumber(
        input.height ?? input.rect?.height,
        minSelectionSize,
        documentHeight,
        minSelectionSize,
      ),
    );
    const left = Math.round(
      clampNumber(
        input.left ?? input.rect?.left,
        0,
        Math.max(0, documentWidth - width),
        0,
      ),
    );
    const top = Math.round(
      clampNumber(
        input.top ?? input.rect?.top,
        0,
        Math.max(0, documentHeight - height),
        0,
      ),
    );

    return {
      left,
      top,
      width,
      height,
    };
  }

  function buildViewportRect(input) {
    const viewportWidth = Math.max(minSelectionSize, window.innerWidth);
    const viewportHeight = Math.max(minSelectionSize, window.innerHeight);
    const width = Math.round(
      clampNumber(
        input.width ?? input.rect?.width,
        minSelectionSize,
        viewportWidth,
        minSelectionSize,
      ),
    );
    const height = Math.round(
      clampNumber(
        input.height ?? input.rect?.height,
        minSelectionSize,
        viewportHeight,
        minSelectionSize,
      ),
    );
    const left = Math.round(
      clampNumber(
        input.left ?? input.rect?.left,
        0,
        Math.max(0, viewportWidth - width),
        0,
      ),
    );
    const top = Math.round(
      clampNumber(
        input.top ?? input.rect?.top,
        0,
        Math.max(0, viewportHeight - height),
        0,
      ),
    );

    return {
      left,
      top,
      width,
      height,
    };
  }

  async function persistSavedSelection(savedSelection) {
    await browserApi.storage?.local?.set({
      [selectionStorageKey]: savedSelection,
    });
  }

  function hasValidSelection(rect) {
    return Boolean(
      rect && rect.width >= minSelectionSize && rect.height >= minSelectionSize,
    );
  }

  function isToolbarTarget(target) {
    return (
      target instanceof Element && Boolean(target.closest(".clff-toolbar"))
    );
  }

  function normalizeSettings(input) {
    const allowedModes = new Set(["dot", "crosshair", "both"]);
    const markerMode = allowedModes.has(input.markerMode)
      ? input.markerMode
      : defaults.markerMode;
    const color = isHexColor(input.color) ? input.color : defaults.color;

    return {
      markerMode,
      color,
      opacity: clampNumber(input.opacity, 0.1, 1, defaults.opacity),
      strokeWidth: Math.round(
        clampNumber(input.strokeWidth, 1, 16, defaults.strokeWidth),
      ),
      dotSize: Math.round(clampNumber(input.dotSize, 4, 48, defaults.dotSize)),
    };
  }

  function clampNumber(value, minimum, maximum, fallback) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(maximum, Math.max(minimum, parsed));
  }

  function clampToViewport(value, maximum) {
    return Math.min(maximum, Math.max(0, value));
  }

  function isHexColor(value) {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
  }
})();
