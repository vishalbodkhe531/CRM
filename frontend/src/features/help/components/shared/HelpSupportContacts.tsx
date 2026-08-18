import { usePublicPlatformSettings } from "@/features/platformSettings";

/**
 * Support contacts, read from platform settings.
 *
 * A contact that is not configured is not shown. The placeholders that used to
 * be hardcoded here (support@company.com, +91 9876543210) looked like real
 * support channels and would have sent people into the void.
 */
const HelpSupportContacts = () => {
  const { data } = usePublicPlatformSettings();
  const settings = data?.data;

  const hasEmail = Boolean(settings?.supportEmail);
  const hasPhone = Boolean(settings?.supportPhone);

  if (!hasEmail && !hasPhone) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
      {hasEmail && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Support Email
          </h3>
          <a
            className="text-sm text-primary underline-offset-4 hover:underline wrap-break-word"
            href={`mailto:${settings!.supportEmail}`}
          >
            {settings!.supportEmail}
          </a>
        </div>
      )}

      {hasPhone && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">
            Support Phone
          </h3>
          <a
            className="text-sm text-primary underline-offset-4 hover:underline"
            href={`tel:${settings!.supportPhone!.replace(/\s+/g, "")}`}
          >
            {settings!.supportPhone}
          </a>
        </div>
      )}
    </div>
  );
};

export default HelpSupportContacts;
