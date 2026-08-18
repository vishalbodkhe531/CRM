import { useState, useCallback } from "react";

/**
 * useConfirm Hook
 * 
 * Manages state for confirmation dialogs.
 * Standardizes the 'open -> select item -> confirm -> close' workflow.
 * 
 * @template T The type of the data/item being acted upon (e.g. Lead, User)
 */
export function useConfirm<T = unknown>() {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((item: T) => {
    setData(item);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Note: We keep the data until the dialog finishes closing to prevent layout shifts
    // but standard practice is to null it eventually or on close.
    // Keeping it here for common 'Are you sure you want to delete {item.name}' patterns.
  }, []);

  const onOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Delay cleaning data to allow for exit animations
      setTimeout(() => setData(null), 200);
    }
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    onOpenChange,
    
    // Helper to pass structured props directly to ConfirmDialog
    confirmProps: {
      open: isOpen,
      onOpenChange,
      // The consumer still provides title, description, and onConfirm
    }
  };
}
