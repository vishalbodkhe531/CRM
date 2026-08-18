import type { FC } from "react";
import { useParams } from "react-router-dom";
import { UserDetail } from "@/features/users";

const UserDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();

  return <UserDetail userId={id} />;
};

export default UserDetailPage;
