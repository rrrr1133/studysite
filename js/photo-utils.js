// Firestore 문서(최대 1MB)에 사진을 직접 저장하기 위해 강하게 압축한다.
// 목표: 결과 base64 문자열이 대략 120~180KB를 넘지 않도록.
export function compressImage(file, { maxSize = 900, quality = 0.6 } = {}) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        // 그래도 크면 품질을 더 낮춰가며 재시도
        let q = quality;
        while (dataUrl.length > 700_000 && q > 0.25) {
          q -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", q);
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
