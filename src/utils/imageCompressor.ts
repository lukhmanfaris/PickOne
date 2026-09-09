/**
 * Utility to optimize large images before uploading.
 * Keeps SVGs and files under 4MB intact.
 * Automatically resizes giant photos/exports (>4MB or >3200px) to prevent payload errors.
 */
export async function optimizeImageForUpload(file: File): Promise<File> {
  // If not an image, or SVG, or already reasonably sized (< 4MB), return as is
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.size <= 4 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          const maxDim = 3200;
          let { width, height } = img;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(file); // Fallback
            return;
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // Export as JPEG with 0.88 quality
          canvas.toBlob(
            (blob) => {
              if (blob && blob.size < file.size) {
                const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                const optimizedFile = new File([blob], newFileName, {
                  type: "image/jpeg",
                  lastModified: Date.now()
                });
                resolve(optimizedFile);
              } else {
                resolve(file); // Keep original if blob is somehow larger
              }
            },
            "image/jpeg",
            0.88
          );
        } catch (canvasErr) {
          console.warn("Canvas compression failed, using original file:", canvasErr);
          resolve(file);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };

      img.src = objectUrl;
    } catch (err) {
      console.warn("Image optimization error, using original file:", err);
      resolve(file);
    }
  });
}
