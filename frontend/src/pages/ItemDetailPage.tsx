import type { FC } from "react";
import { useParams } from "react-router-dom";
import { ItemDetail } from "@/features/items";

const ItemDetailPage: FC = () => {
  const { id } = useParams<{ id: string }>();

  return <ItemDetail itemId={id} />;
};

export default ItemDetailPage;
