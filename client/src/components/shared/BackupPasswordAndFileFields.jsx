"use client";

import { useRef, useState } from "react";

import { Button, Input } from "@heroui/react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";

export function BackupPasswordAndFileFields({ backupPassword, onBackupPasswordChange, onFileChange }) {
  const backupFieldsTranslations = useTranslations("backupPasswordField");
  const [showBackupPassword, setShowBackupPassword] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFileName(file?.name ?? null);
    onFileChange(file);
  };

  return (
    <>
      <Input
        aria-label="hide-show-backup-password"
        label={backupFieldsTranslations("passwordLabel")}
        type={showBackupPassword ? "text" : "password"}
        placeholder={backupFieldsTranslations("passwordPlaceholder")}
        value={backupPassword}
        onChange={(event) => onBackupPasswordChange(event.target.value)}
        endContent={(
          <button
            type="button"
            onClick={() => setShowBackupPassword(!showBackupPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showBackupPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      />

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          {backupFieldsTranslations("fileLabel")}
        </label>
        <Button
          color="primary"
          type="button"
          className="bg-green-800"
          onPress={() => fileInputRef.current?.click()}
        >
          {backupFieldsTranslations("fileButton")}
        </Button>
        {selectedFileName && (
          <p className="text-sm text-foreground mt-1">{selectedFileName}</p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-sm text-gray-500 mt-1">
          {backupFieldsTranslations("fileHint")}
        </p>
      </div>
    </>
  );
}
