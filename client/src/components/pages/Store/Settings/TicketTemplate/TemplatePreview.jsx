"use client";

export function TemplatePreview({ previewElements, t }) {
  return (
    <div className="w-full lg:flex-[1] lg:sticky lg:top-0">
      <h3 className="text-lg font-semibold text-green-900">
        {t("templates.previewTitle")}
      </h3>
      <div className="mt-2 max-h-[50vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        {previewElements.length === 0 ? (
          <p className="text-sm text-gray-600">
            {t("templates.previewEmpty")}
          </p>
        ) : (
          <div className="font-mono text-gray-900">
            {previewElements}
          </div>
        )}
      </div>
    </div>
  );
}
