import { useForm } from "react-hook-form";
import { useState, type ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useFormFormatters } from "@/hooks/useFormFormatters";
import { useAppSelector } from "@/hooks/useRedux";
import { normalizeOptionalFields } from "@/utils/normalization.utils";
import {
  useCreateOrganization,
  useUpdateOrganization,
} from "./useOrganizationMutations";
import {
  createOrganizationSchema,
  organizationFormSchema,
  type OrganizationEditorState,
} from "../validators/organization.schema";
import type { Organization } from "../types";
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from "@/contracts/validation";

type OrganizationAssetField = "companyLogo" | "qrCode" | "signature";
type OrganizationAssetFiles = Partial<Record<OrganizationAssetField, File>>;
type OrganizationAssetPreviews = Partial<Record<OrganizationAssetField, string>>;

interface UseOrganizationFormProps {
  organization?: Organization;
  isAdding?: boolean;
  setIsEditing: (active: boolean) => void;
}

const OPTIONAL_FIELDS: (keyof OrganizationEditorState)[] = [
  "gstin",
  "remark",
  "adminEmail",
  "adminPassword",
  "adminFirstName",
  "adminLastName",
  "adminMobile",
];

const appendPayloadToFormData = (
  formData: FormData,
  payload: Record<string, unknown>,
) => {
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (value instanceof Date) {
      formData.append(key, value.toISOString());
      return;
    }
    formData.append(key, String(value));
  });
};

const toOrganizationFormData = (
  payload: CreateOrganizationInput | UpdateOrganizationInput,
  assetFiles: OrganizationAssetFiles,
) => {
  const formData = new FormData();
  appendPayloadToFormData(formData, payload as Record<string, unknown>);

  Object.entries(assetFiles).forEach(([field, file]) => {
    if (file) formData.append(field, file);
  });

  return formData;
};

const toCreateOrganizationInput = (
  data: OrganizationEditorState,
): CreateOrganizationInput => ({
  name: data.name ?? "",
  slug: data.slug ?? "",
  prefix: data.prefix ?? "",
  status: data.status,
  authorizedPerson: data.authorizedPerson ?? "",
  orgType: data.orgType ?? "type1",
  mobile: data.mobile ?? "",
  gstin: data.gstin || undefined,
  address: data.address ?? "",
  dateOfRegistration: new Date(data.dateOfRegistration ?? ""),
  email: data.email ?? "",
  remark: data.remark || undefined,
  planId: data.planId ?? "",
  adminEmail: data.adminEmail ?? "",
  adminPassword: data.adminPassword ?? "",
  adminFirstName: data.adminFirstName ?? "",
  adminLastName: data.adminLastName ?? "",
  adminMobile: data.adminMobile ?? "",
});

const toUpdateOrganizationInput = (
  data: OrganizationEditorState,
): UpdateOrganizationInput => ({
  name: data.name,
  slug: data.slug,
  prefix: data.prefix,
  status: data.status,
  authorizedPerson: data.authorizedPerson,
  orgType: data.orgType,
  mobile: data.mobile,
  gstin: data.gstin || undefined,
  address: data.address,
  dateOfRegistration: data.dateOfRegistration ? new Date(data.dateOfRegistration) : undefined,
  email: data.email,
  remark: data.remark || undefined,
});

export const useOrganizationForm = ({
  organization,
  isAdding,
  setIsEditing,
}: UseOrganizationFormProps) => {
  const navigate = useNavigate();
  const isSuperAdmin = useAppSelector(
    (state) => state.auth.user?.role === "SUPER_ADMIN",
  );
  const [assetFiles, setAssetFiles] = useState<OrganizationAssetFiles>({});
  const [assetPreviews, setAssetPreviews] = useState<OrganizationAssetPreviews>({});

  const { mutateAsync: createOrg, isPending: isCreating } =
    useCreateOrganization();
  const { mutateAsync: updateOrg, isPending: isUpdating } =
    useUpdateOrganization();

  const form = useForm<OrganizationEditorState>({
    resolver: zodResolver(
      isAdding ? createOrganizationSchema : organizationFormSchema,
    ),
    mode: "onBlur",
    reValidateMode: "onBlur",
    values: isAdding 
      ? {
          name: "",
          slug: "",
          prefix: "",
          status: "ACTIVE",
          authorizedPerson: "",
          orgType: "type1",
          mobile: "",
          gstin: "",
          address: "",
          dateOfRegistration: "",
          email: "",
          remark: "",
          planId: "",
          adminEmail: "",
          adminPassword: "",
          adminFirstName: "",
          adminLastName: "",
          adminMobile: "",
        }
      : organization ? {
          name: organization.name,
          slug: organization.slug,
          prefix: organization.prefix,
          status: organization.status,
          authorizedPerson: organization.authorizedPerson ?? "",
          orgType: organization.orgType ?? "type1",
          mobile: organization.mobile ?? "",
          gstin: organization.gstin ?? "",
          address: organization.address ?? "",
          dateOfRegistration: organization.dateOfRegistration
            ? new Date(organization.dateOfRegistration)
                .toISOString()
                .split("T")[0]
            : "",
          email: organization.email ?? "",
          remark: organization.remark ?? "",
          adminEmail: "",
          adminPassword: "",
          adminFirstName: "",
          adminLastName: "",
          adminMobile: "",
        } : undefined,
  });

  const { setValue, handleSubmit } = form;
  const { handleSlugChange, handleUppercaseChange } = useFormFormatters(setValue);
  const hasSelectedAssets = Object.keys(assetFiles).length > 0;

  const handleAssetChange =
    (field: OrganizationAssetField) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setAssetFiles((prev) => ({ ...prev, [field]: file }));
      setAssetPreviews((prev) => {
        if (prev[field]) URL.revokeObjectURL(prev[field]);
        return { ...prev, [field]: URL.createObjectURL(file) };
      });
      event.target.value = "";
    };

  const onSubmit = async (data: OrganizationEditorState) => {
    try {
      const payload = normalizeOptionalFields(data, OPTIONAL_FIELDS);

      if (isAdding) {
        const createPayload = toCreateOrganizationInput(payload);
        await createOrg(
          hasSelectedAssets
            ? toOrganizationFormData(createPayload, assetFiles)
            : createPayload,
        );
        Object.values(assetPreviews).forEach((preview) => URL.revokeObjectURL(preview));
        navigate("/platform/organizations");
        return;
      }

      if (!organization) return;

      const updatePayload = toUpdateOrganizationInput(payload);
      const updatedOrganization = await updateOrg({
        id: organization.id,
        data: hasSelectedAssets
          ? toOrganizationFormData(updatePayload, assetFiles)
          : updatePayload,
      });
      Object.values(assetPreviews).forEach((preview) => URL.revokeObjectURL(preview));
      setAssetFiles({});
      setAssetPreviews({});
      if (isSuperAdmin) {
        navigate("/platform/organizations");
        return;
      }
      if (updatedOrganization.slug !== organization.slug) {
        navigate(`/platform/organizations/${updatedOrganization.slug}/users`);
        return;
      }
      setIsEditing(false);
    } catch {
      // handled in mutation
    }
  };

  return {
    form,
    isSubmitting: isCreating || isUpdating,
    onSubmit: handleSubmit(onSubmit),
    handleSlugChange: handleSlugChange("slug"),
    handlePrefixChange: handleUppercaseChange("prefix"),
    handleGstinChange: handleUppercaseChange("gstin"),
    assetFiles,
    assetPreviews,
    handleAssetChange,
  };
};
