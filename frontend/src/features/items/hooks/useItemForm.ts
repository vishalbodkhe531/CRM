import { useForm, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GST_RATE_VALUES, ITEM_TYPE_VALUES } from "@/contracts/constants";
import { useCreateItem } from "./useCreateItem";
import { useUpdateItem } from "./useUpdateItem";
import { normalizeOptionalFields } from '@/utils/normalization.utils';
import { createItemSchema, updateItemSchema } from '../validators/item.schema';
import type { CreateItemForm, UpdateItemForm } from '../validators/item.schema';
import type { GSTRate, Item, ItemType } from '../types';

import { useLocation, useNavigate } from 'react-router-dom';
import { withSuperAdminOrganizationScope } from '@/utils/orgRoutes';

interface UseItemFormProps {
  item?: Item;
  isAdding?: boolean;
}

type ItemFormValues = Omit<CreateItemForm, 'gstRate'> & {
  gstRate: number;
};

export const itemTypeOptions = ITEM_TYPE_VALUES.map((value) => ({
  value,
  label: value === "GOODS" ? "Goods" : "Service",
}));

export const gstRateOptions = GST_RATE_VALUES.map((rate) => ({
  value: String(rate),
  label: `${rate}%`,
}));

const isItemTypeValue = (value: string): value is ItemType => {
  return ITEM_TYPE_VALUES.includes(value as ItemType);
};

const parseGstRateValue = (
  value: string,
): GSTRate | null => {
  const parsedRate = Number.parseInt(value, 10);

  if (GST_RATE_VALUES.includes(parsedRate as GSTRate)) {
    return parsedRate as GSTRate;
  }

  return null;
};

const OPTIONAL_FIELDS: (keyof (CreateItemForm & UpdateItemForm))[] = [
  "itemCode",
  "hsnCode",
  "sacCode",
  "description",
];

export const useItemForm = ({ item, isAdding }: UseItemFormProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const scopedPath = (path: string) =>
    withSuperAdminOrganizationScope(path, location.pathname);
  const isEdit = !isAdding;

  const { mutateAsync: createItemMutation, isPending: isCreating } = useCreateItem();
  const { mutateAsync: updateItemMutation, isPending: isUpdating } = useUpdateItem();
  
  const actionLoading = isCreating || isUpdating;

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(isEdit ? updateItemSchema : createItemSchema) as Resolver<ItemFormValues>,
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    values: isEdit && item 
      ? {
          name: item.name,
          itemCode: item.itemCode ?? '',
          itemType: item.itemType,
          hsnCode: item.hsnCode ?? '',
          sacCode: item.sacCode ?? '',
          gstRate: item.gstRate,
          price: item.price,
          description: item.description ?? '',
        }
      : isAdding 
        ? {
            name: '',
            itemCode: '',
            itemType: 'GOODS',
            hsnCode: '',
            sacCode: '',
            gstRate: 18,
            price: 0,
            description: '',
          }
        : undefined,
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = form;

  const itemType = useWatch({
    control,
    name: 'itemType',
  });
  const onSubmit: SubmitHandler<ItemFormValues> = async (data) => {
    try {
      const payload = normalizeOptionalFields(
        {
          ...data,
          hsnCode: data.itemType === "GOODS" ? data.hsnCode : "",
          sacCode: data.itemType === "SERVICE" ? data.sacCode : "",
        },
        OPTIONAL_FIELDS as (keyof ItemFormValues)[],
      );

      if (isEdit && item) {
        await updateItemMutation({ id: item.id, data: payload as UpdateItemForm });
        navigate(scopedPath('/items'));
      } else {
        await createItemMutation(payload);
        navigate(scopedPath('/items'));
      }
    } catch {
      // Handled in hook
    }
  };

  return {
    form,
    register,
    errors,
    itemType,
    actionLoading,
    isEdit,
    handleSubmit: handleSubmit(onSubmit),
  };
};

export { isItemTypeValue, parseGstRateValue };
