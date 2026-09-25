/**
 * Face attention analysis is unavailable until a real, configured model is
 * provided. Do not synthesize scores or infer student attention from random data.
 */

self.onmessage = async (e) => {
  const { type, imageBitmap } = e.data;

  if (type === "PROCESS_FRAME") {
    try {
      imageBitmap?.close?.();
      self.postMessage({ type: "UNAVAILABLE", reason: "ATTENTION_MODEL_NOT_CONFIGURED" });

    } catch (error) {
      self.postMessage({ type: "ERROR", error: "Worker computation failed" });
    }
  }
};
