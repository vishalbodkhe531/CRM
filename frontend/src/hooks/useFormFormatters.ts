import { useCallback } from "react";
import type {
  UseFormSetValue,
  FieldValues,
  Path,
  PathValue,
} from "react-hook-form";

/**
 * Custom hook providing common form field formatting logic.
 */
export function useFormFormatters<T extends FieldValues>(
  setValue: UseFormSetValue<T>
) {
  const handleSlugChange = useCallback(
    (fieldName: Path<T>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.toLowerCase().replace(/\s+/g, "-");
      setValue(fieldName, val as PathValue<T, Path<T>>, {
        shouldDirty: true,
      });
    },
    [setValue]
  );

  const handleUppercaseChange = useCallback(
    (fieldName: Path<T>) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.toUpperCase();
      setValue(fieldName, val as PathValue<T, Path<T>>, {
        shouldDirty: true,
      });
    },
    [setValue]
  );

  return { handleSlugChange, handleUppercaseChange };
}
