/**
 * Compresse et optimise les images avant upload
 * Convertit en WebP si possible, sinon en JPEG
 */

export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    outputFormat = 'webp'
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculer les nouvelles dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        // Créer canvas pour la compression
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir en blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Compression failed'));
              return;
            }
            
            // Créer un nouveau fichier avec le blob compressé
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, `.${outputFormat === 'webp' ? 'webp' : 'jpg'}`),
              { type: `image/${outputFormat === 'webp' ? 'webp' : 'jpeg'}` }
            );
            
            resolve(compressedFile);
          },
          `image/${outputFormat === 'webp' ? 'webp' : 'jpeg'}`,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
};

/**
 * Vérifie si le fichier est une image
 */
export const isImage = (file) => {
  return file && file.type.startsWith('image/');
};

/**
 * Formate la taille du fichier
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};