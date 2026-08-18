import { useCallback, useState } from "react";
import type {
  UseFormSetValue,
  FieldValues,
  Path,
} from "react-hook-form";

/**
 * Custom hook to handle image upload with react-hook-form.
 * - Stores the raw File object (for multipart/form-data upload to backend)
 * - Generates a local blob URL for preview (instead of converting to base64)
 */
export function useImageUpload<T extends FieldValues>(
  _setValue: UseFormSetValue<T>,
  _fieldName: Path<T>
) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Revoke previous blob URL to avoid memory leaks
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        const url = URL.createObjectURL(file);
        setSelectedFile(file);
        setPreviewUrl(url);
      }
    },
    [previewUrl]
  );

  return { handleImageChange, selectedFile, previewUrl };
}