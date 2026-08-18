import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { prospectSchema, ProspectFormValues } from "../validators/prospect.schema";
import { prospectToFormValues } from "../mappers";
import { useUpdateProspect } from "./useProspectMutations";
import type { Prospect } from "@/contracts/types";
import type { UpdateProspectInput } from "@/contracts/validation";

interface UseProspectFormOptions {
  prospect?: Prospect;
}

const toUpdateProspectInput = (
  data: ProspectFormValues,
): UpdateProspectInput => ({
  firstName: data.firstName,
  lastName: data.lastName,
  email: data.email,
  mobile: data.mobile,
  companyName: data.companyName,
  expectedValue: data.expectedValue ? Number(data.expectedValue) : null,
  notes: data.notes || null,
  assignedToId: data.assignedToId || null,
});

export const useProspectForm = ({ prospect }: UseProspectFormOptions) => {
  const { mutateAsync: updateProspect, isPending: isUpdating } = useUpdateProspect();

  const form = useForm<ProspectFormValues>({
    resolver: zodResolver(prospectSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    defaultValues: prospect ? prospectToFormValues(prospect) : {
      firstName: "",
      lastName: "",
      email: "",
      mobile: "",
      companyName: "",
      expectedValue: "",
      assignedToId: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (prospect) {
      form.reset(prospectToFormValues(prospect));
    }
  }, [prospect, form]);

  const onSubmit = async (data: ProspectFormValues) => {
    if (!prospect) return;
    try {
      await updateProspect({ id: prospect.id, data: toUpdateProspectInput(data) });
    } catch {
      // Handled in mutation hook
    }
  };

  return {
    form,
    isSubmitting: isUpdating,
    onSubmit: form.handleSubmit(onSubmit),
  };
};
