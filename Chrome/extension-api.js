(() => {
  if (globalThis.CENTERLINE_EXTENSION_API) {
    return;
  }

  const browserApi = globalThis.browser;

  if (browserApi) {
    globalThis.CENTERLINE_EXTENSION_API = {
      runtime: browserApi.runtime,
      scripting: browserApi.scripting,
      storage: browserApi.storage,
      tabs: browserApi.tabs,
    };
    globalThis.CENTERLINE_ADD_MESSAGE_LISTENER = (listener) => {
      browserApi.runtime.onMessage.addListener((message, sender) =>
        listener(message, sender),
      );
    };
    return;
  }

  const chromeApi = globalThis.chrome;

  if (!chromeApi) {
    globalThis.CENTERLINE_EXTENSION_API = {};
    globalThis.CENTERLINE_ADD_MESSAGE_LISTENER = () => {};
    return;
  }

  function callChromeMethod(context, methodName, ...args) {
    return new Promise((resolve, reject) => {
      if (!context || typeof context[methodName] !== "function") {
        reject(new Error(`missing-${methodName}-api`));
        return;
      }

      try {
        context[methodName](...args, (result) => {
          const lastError = chromeApi.runtime?.lastError;

          if (lastError) {
            reject(new Error(lastError.message));
            return;
          }

          resolve(result);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  globalThis.CENTERLINE_EXTENSION_API = {
    runtime: chromeApi.runtime,
    scripting: chromeApi.scripting,
    storage: {
      local: chromeApi.storage?.local
        ? {
            get(keys) {
              return callChromeMethod(chromeApi.storage.local, "get", keys);
            },
            set(items) {
              return callChromeMethod(chromeApi.storage.local, "set", items);
            },
            remove(keys) {
              return callChromeMethod(chromeApi.storage.local, "remove", keys);
            },
          }
        : undefined,
    },
    tabs: {
      query: chromeApi.tabs?.query
        ? (queryInfo) => callChromeMethod(chromeApi.tabs, "query", queryInfo)
        : undefined,
      sendMessage: chromeApi.tabs?.sendMessage
        ? (tabId, message) =>
            callChromeMethod(chromeApi.tabs, "sendMessage", tabId, message)
        : undefined,
    },
  };

  globalThis.CENTERLINE_ADD_MESSAGE_LISTENER = (listener) => {
    if (!chromeApi.runtime?.onMessage) {
      return;
    }

    chromeApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        const response = listener(message, sender);

        if (response && typeof response.then === "function") {
          response
            .then((value) => {
              sendResponse(value ?? null);
            })
            .catch((error) => {
              console.error(error);
              sendResponse({
                ok: false,
                error:
                  error instanceof Error ? error.message : String(error ?? ""),
              });
            });
          return true;
        }

        if (response !== undefined) {
          sendResponse(response ?? null);
        }
      } catch (error) {
        console.error(error);
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error ?? ""),
        });
      }

      return false;
    });
  };
})();
