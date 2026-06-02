"use client";
import { useRef, useState } from "react";

import { Image } from "@heroui/react";
import { ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { storedAssetUrl } from "@/components/utils/storedAssetUrl";

export function VariantImagePicker({ imageUrl, onFileChange }) {
  const productsTranslations = useTranslations("products");
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const currentImage = preview ?? storedAssetUrl(imageUrl);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
    onFileChange(file);
    e.target.value = "";
  };

  const handleRemove = () => {
    setPreview(null);
    onFileChange(null);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors"
      >
        {currentImage ? (
          <Image
            src={currentImage}
            alt="variant"
            removeWrapper
            className="w-full h-full object-cover rounded-none"
          />
        ) : (
          <ImageIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-xs text-blue-600 hover:text-blue-700 underline text-left leading-none"
        >
          {productsTranslations("variantChangeImage")}
        </button>
        {currentImage && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-red-500 hover:text-red-600 text-left leading-none"
          >
            {productsTranslations("variantRemoveImage")}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
