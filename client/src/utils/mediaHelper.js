/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * @param {File} file - The original image file.
 * @param {string} qualityType - 'hd' for original, 'standard' for compressed.
 * @returns {Promise<Blob>} A promise that resolves to the compressed or original file blob.
 */
export function compressImage(file, qualityType = 'standard') {
  return new Promise((resolve, reject) => {
    // If it's a GIF or the user selected HD quality, skip compression
    if (file.type === 'image/gif' || qualityType === 'hd') {
      resolve(file);
      return;
    }
    
    // Only compress standard images
    if (!file.type.startsWith('image/')) {
      resolve(file); // Return as-is for non-images (video/audio)
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Downscale bounds for standard compression
        const MAX_DIM = 1080;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback to original if canvas context is unavailable
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // Ensure we retain the filename or basic property context indirectly
              resolve(blob);
            } else {
              resolve(file); // Fallback to original on error
            }
          },
          'image/jpeg',
          0.75 // 75% quality for excellent balance of weight and clarity
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}
