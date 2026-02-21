// ================================================
// 이미지 리사이즈 유틸 - 187 성장케어 v4
// 모바일 카메라 사진을 업로드 전 압축
// ================================================

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 0.8;

/**
 * 이미지 파일을 리사이즈하여 용량을 줄입니다.
 * - 최대 1200x1200, JPEG 80% 품질
 * - 원본이 작으면 그대로 반환
 */
export async function compressImage(file: File): Promise<File> {
  // 이미 작은 파일은 그대로
  if (file.size < 500_000) return file; // 500KB 이하 스킵

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      // 비율 유지하며 리사이즈
      if (width > MAX_WIDTH || height > MAX_HEIGHT) {
        const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            // 압축 결과가 원본보다 크면 원본 사용
            resolve(compressed.size < file.size ? compressed : file);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        QUALITY,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // 실패 시 원본 반환
    };

    img.src = url;
  });
}
