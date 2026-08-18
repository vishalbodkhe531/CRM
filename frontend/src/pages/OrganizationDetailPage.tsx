import type { FC } from "react";
import { useLocation, useParams } from "react-router-dom";
import { OrganizationDetail } from "@/features/organizations";

const OrganizationDetailPage: FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();

  return (
    <OrganizationDetail
      organizationSlug={slug}
      forceEditing={location.pathname.endsWith("/edit")}
    />
  );
};

export default OrganizationDetailPage;
