import { useState, useRef, useEffect } from "react";

import { Image } from "@heroui/react";
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
        <div
          className="
            flex flex-col items-center justify-center
            bg-[conic-gradient(#aaa_90deg,#eee_90deg_180deg,#aaa_180deg_270deg,#eee_270deg)]
            bg-size-[20px_20px]
            relative w-32 h-32 rounded-lg border-2 border-border overflow-hidden
          "
        >
          <Image src={imagePreview || "/placeholder.svg"} alt="Image preview" className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-1 right-1 p-0.5  rounded-full hover:opacity-100 z-10 bg-red-400 opacity-90 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-8 rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center cursor-pointer"
        >
          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">{uploadText}</p>
          <p className="text-xs text-muted-foreground">{uploadDescription}</p>
        </button>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
    </div>
  );
}
