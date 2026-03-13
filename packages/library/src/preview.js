const MSG_TYPE = "typescriptcms:preview-update";

export function onPreviewMessage(configPath, callback) {
  function handler(event) {
    const data = event.data;
    if (!data || data.type !== MSG_TYPE || data.configPath !== configPath)
      return;
    callback(data.fields);
  }
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
