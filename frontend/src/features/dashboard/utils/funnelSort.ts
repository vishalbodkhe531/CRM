type CountedFunnelItem = {
  count: number;
};

export const sortFunnelItemsByCountDesc = <T extends CountedFunnelItem>(
  items: readonly T[],
) => [...items].sort((first, second) => second.count - first.count);
