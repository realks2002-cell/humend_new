import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { isNative } from "./native";

function base64ToFile(base64: string, fileName: string, mimeType: string): File {
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], fileName, { type: mimeType });
}

export async function pickPhoto(): Promise<File | null> {
  if (!isNative()) return null;

  try {
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      width: 1024,
      height: 1024,
    });

    if (!photo.base64String) return null;

    const format = photo.format || "jpeg";
    const fileName = `photo_${Date.now()}.${format}`;
    return base64ToFile(photo.base64String, fileName, `image/${format}`);
  } catch (e) {
    console.warn("[Camera] pickPhoto failed:", e);
    return null;
  }
}
