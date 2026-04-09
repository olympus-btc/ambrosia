import { useState, useRef, useEffect } from "react";

import { Button, Image } from "@heroui/react";
import { Upload, X } from "lucide-react";

export function ImageUploader({ title, uploadText, uploadDescription, onChange, value }) {
  const [filePreview, setFilePreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (value instanceof File) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(value);
    }
  }, [value]);

  const imagePreview = filePreview || (typeof value === "string" ? value : null);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    onChange(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">
        {title}
      </label>
      {imagePreview ? (
        <div className="flex flex-col gap-2">
          <div
            className="
              flex flex-col items-center justify-center
              bg-[conic-gradient(#aaa_90deg,#eee_90deg_180deg,#aaa_180deg_270deg,#eee_270deg)]
              bg-size-[20px_20px]
              relative w-32 h-32 md:w-48 md:h-48 rounded-lg border border-gray-200 overflow-hidden
            "
          >
            <Image src={imagePreview || "/placeholder.svg"} alt="Image preview" className="w-full h-full object-contain" />
            <Button
              isIconOnly
              size="sm"
              color="danger"
              data-testid="remove-image-button"
              className="absolute top-1 right-1 z-10 min-w-0 w-6 h-6"
              onPress={handleRemoveImage}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
          {value instanceof File && (
            <p className="text-xs text-gray-500 truncate max-w-48">{value.name}</p>
          )}
        </div>
      ) : (
        <Button
          variant="bordered"
          fullWidth
          className="h-auto p-8 rounded-lg border-2 border-dashed flex flex-col items-center justify-center"
          onPress={() => fileInputRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">{uploadText}</p>
          <p className="text-xs text-muted-foreground">{uploadDescription}</p>
        </Button>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
    </div>
  );
}
