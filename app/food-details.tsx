
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import FoodDetailsLayout from '@/components/FoodDetailsLayout';
import { toLocalDateString } from '@/utils/dateUtils';

export default function FoodDetailsScreen() {
  const params = useLocalSearchParams();

  const layoutMode = (params.mode as string) === 'edit' ? 'edit' : 'view';
  const context = (params.context as string) || undefined;
  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || toLocalDateString();
  const offDataString = params.offData as string;
  const returnTo = (params.returnTo as string) || undefined;
  const itemId = (params.itemId as string) || undefined;

  console.log('[FoodDetails] Screen mounted, layoutMode:', layoutMode, 'mealType:', mealType, 'date:', date, 'context:', context);

  return (
    <FoodDetailsLayout
      mode={layoutMode}
      offData={offDataString}
      mealType={mealType}
      date={date}
      context={context}
      returnTo={returnTo}
      itemId={itemId}
    />
  );
}
