import { useState, useRef, useEffect } from "react";

import { Button, Image } from "@heroui/react";
import { Camera, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { storedAssetUrl } from "@components/utils/storedAssetUrl";

export function ImageUploader({ title, uploadText, uploadDescription, onChange, image, isCompact = false }) {
  const imageUploaderTranslations = useTranslations("imageUploader");
  const [filePreview, setFilePreview] = useState(null);
  const [isTouchDevice] = useState(() => typeof window !== "undefined" && navigator.maxTouchPoints > 0);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (image instanceof File) {
      const fileReader = new FileReader();
      fileReader.onloadend = () => {
        setFilePreview(fileReader.result);
      };
      fileReader.readAsDataURL(image);
    }
  }, [image]);

  const imagePreview = filePreview || (typeof image === "string" ? storedAssetUrl(image) : null);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onChange(file);

      const fileReader = new FileReader();
      fileReader.onloadend = () => {
        setFilePreview(fileReader.result);
      };
      fileReader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    onChange(null);
    setFilePreview(null);
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {title}
      </label>
      {imagePreview ? (
        <div className="flex flex-col gap-2">
          <div
            className={`
              flex flex-col items-center justify-center
              bg-[conic-gradient(#aaa_90deg,#eee_90deg_180deg,#aaa_180deg_270deg,#eee_270deg)]
              bg-size-[20px_20px]
              relative rounded-lg border border-gray-200 overflow-hidden
              ${isCompact ? "w-24 h-24" : "w-32 h-32 md:w-48 md:h-48"}
            `}
          >
            <Image src={imagePreview} alt="Image preview" className="w-full h-full object-contain" />
            <Button
              isIconOnly
              size="sm"
              color="danger"
              aria-label={imageUploaderTranslations("removeImage")}
              data-testid="remove-image-button"
              className="absolute top-1 right-1 z-10 min-w-0 w-6 h-6"
              onPress={handleRemoveImage}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          {image instanceof File && (
            <p className="text-xs text-gray-500 truncate max-w-48">{image.name}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-row gap-3">
          {isTouchDevice && (
            <Button
              variant="bordered"
              fullWidth
              className="h-auto py-6 px-3 rounded-lg border-2 border-dashed flex flex-col items-center justify-center"
              onPress={() => cameraInputRef.current?.click()}
            >
              <Camera className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium text-foreground">{imageUploaderTranslations("takePhoto")}</p>
            </Button>
          )}
          <Button
            variant="bordered"
            fullWidth
            className={`h-auto rounded-lg border-2 border-dashed flex flex-col items-center justify-center ${isCompact ? "py-3 px-3" : "py-6 px-3"}`}
            onPress={() => galleryInputRef.current?.click()}
          >
            <Upload className={`text-muted-foreground ${isCompact ? "w-5 h-5 mb-1" : "w-8 h-8 mb-2"}`} />
            <p className={`font-medium text-foreground ${isCompact ? "text-xs" : "text-sm"}`}>{uploadText}</p>
            {!isTouchDevice && <p className="text-xs text-muted-foreground text-center leading-tight">{uploadDescription}</p>}
          </Button>
        </div>
      )}
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
    </div>
  );
}
