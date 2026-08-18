import { useEffect, useRef } from "react";
import { useAppDispatch } from "@/hooks/useRedux";
import { bootstrapAuth } from "../store/slice";

export const useAuthBootstrap = () => {
  const dispatch = useAppDispatch();
  const hasBootstrappedRef = useRef(false);

  useEffect(() => {
    if (hasBootstrappedRef.current) {
      return;
    }

    hasBootstrappedRef.current = true;
    dispatch(bootstrapAuth());
  }, [dispatch]);
};
