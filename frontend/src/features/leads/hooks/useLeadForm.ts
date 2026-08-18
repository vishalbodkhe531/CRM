import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/hooks/useRedux";
import { selectCurrentUser } from "@/features/auth";
import { useItems } from "@/features/items";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useAssignableUsers } from "./useLeads";
import { useCreateLead, useUpdateLead } from "./useLeadMutations";

import {
  createLeadSchema,
  type CreateLeadForm,
} from "../validators/createLead.schema";
import type { Lead } from "../types";
import { getProfilePicUrl } from "../utils/profilePicUrl";
import { withSuperAdminOrganizationScope } from "@/utils/orgRoutes";

interface UseLeadFormProps {
  mode: "create" | "edit";
  lead?: Lead;
}

type LeadFormValues = CreateLeadForm;

export const useLeadForm = ({ mode, lead }: UseLeadFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const isAdding = mode === "create";
  const currentUser = useAppSelector(selectCurrentUser);

  const { mutateAsync: createLeadMutation, isPending: isCreating } =
    useCreateLead();
  const { mutateAsync: updateLeadMutation, isPending: isUpdating } =
    useUpdateLead();

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(createLeadSchema),
    mode: "onBlur",
    reValidateMode: "onBlur",
    values: isAdding
      ? {
        firstName: "",
        lastName: "",
        profilePicture: "",
        mobile: "",
        alternateMobile: "",
        email: "",
        companyName: "",
        gstin: "",
        website: "",
        linkedInProfile: "",
        address: "",
        city: "",
        state: "",
        pinCode: "",
        source: "WEBSITE",
        industry: undefined,
        customIndustry: "",
        leadType: "NEW",
        productInterested: "",
        requiredDescription: "",
        assignedToId: currentUser?.id ?? "",
      }
      : lead ? {
        firstName: lead.firstName,
        lastName: lead.lastName,
        profilePicture: lead.profilePicture ?? "",
        mobile: lead.mobile,
        alternateMobile: lead.alternateMobile ?? "",
        email: lead.email ?? "",
        companyName: lead.companyName ?? "",
        gstin: lead.gstin ?? "",
        website: lead.website ?? "",
        linkedInProfile: lead.linkedInProfile ?? "",
        address: lead.address ?? "",
        city: lead.city ?? "",
        state: lead.state ?? "",
        pinCode: lead.pinCode ?? "",
        source: lead.source ?? "WEBSITE",
        industry: lead.industry ?? undefined,
        customIndustry: lead.customIndustry ?? "",
        leadType: lead.leadType ?? "NEW",
        productInterested: lead.productInterested ?? "",
        requiredDescription: lead.requiredDescription ?? "",
        assignedToId: lead.assignedToId ?? "",
      } : undefined,
  });

  const {
    setValue,
    handleSubmit,
    formState: { errors },
  } = form;

  const { data: assignableUsersData = [] } = useAssignableUsers({
    enabled: true,
  });
  const { data: itemsData } = useItems({ limit: 100 }, { enabled: true });

  const items = itemsData?.data ?? [];
  const assignableUsers = assignableUsersData ?? [];

  const isExecutive = currentUser?.role === "EXECUTIVE";
  const isSubmitting = isCreating || isUpdating;

  const { handleImageChange, selectedFile, previewUrl } = useImageUpload(setValue, "profilePicture");

  const profilePicPreview = previewUrl ?? getProfilePicUrl(lead?.profilePicture);

  const handleCancel = () => {
    if (isAdding) {
      navigate(scopedPath("/leads"));
    } else {
      navigate(scopedPath(`/leads/${lead?.id}`));
    }
  };

  const buildFormData = (data: LeadFormValues): FormData => {
    const formData = new FormData();

    const textFields: (keyof LeadFormValues)[] = [
      "firstName", "lastName", "mobile", "alternateMobile", "email",
      "companyName", "gstin", "website", "linkedInProfile", "address", "city",
      "state", "pinCode", "source", "industry", "customIndustry", "leadType",
      "productInterested", "requiredDescription", "assignedToId", "status",
    ];

    for (const key of textFields) {
      const value = data[key];
      if (value !== undefined && value !== null && value !== "") {
        formData.append(key, String(value));
      }
    }

    // Attach the file if the user selected one; skip if no new file
    if (selectedFile) {
      formData.append("profilePicture", selectedFile);
    }

    return formData;
  };

  const onSubmit = async (data: LeadFormValues) => {
    try {
      const formData = buildFormData(data);

      if (isAdding) {
        await createLeadMutation(formData);
        navigate(scopedPath("/leads"));
      } else if (lead) {
        await updateLeadMutation({ id: lead.id, data: formData });
        navigate(scopedPath(`/leads/${lead.id}`));

      }
    } catch {
      // Handled in mutation hook
    }
  };

  return {
    form,
    items,
    assignableUsers,
    profilePicPreview,
    isExecutive,
    isSubmitting,
    handleCancel,
    handleImageChange,
    onSubmit: handleSubmit(onSubmit),
    errors,
    isAdding,
  };
};
