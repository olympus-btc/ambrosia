import { Chip } from "@heroui/react";

export function SelectedCategoryChips({ categories, onRemove }) {
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Chip
          key={category.id}
          variant="flat"
          classNames={{
            closeButton: "text-red-600 hover:text-red-700",
          }}
          onClose={() => onRemove(category.id)}
        >
          {category.name}
        </Chip>
      ))}
    </div>
  );
}
