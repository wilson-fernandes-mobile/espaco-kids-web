/** Reduz a foto no navegador (lado máx. 320px, JPEG) para guardá-la como data URL no Firestore (~15 KB). */
export function resizePhoto(file: File, max = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/"))
      return reject(new Error("Selecione um arquivo de imagem."));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    img.src = url;
  });
}
