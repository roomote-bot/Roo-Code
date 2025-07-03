export type FilterType = 'userId' | 'model' | 'repositoryName';

export type Filter = {
  type: FilterType;
  value: string;
  label: string;
};

export type FilterState = {
  filters: Filter[];
  filtersByType: Record<FilterType, Filter[]>;
};

// Helper function to build SQL filter conditions
export const buildFilterConditions = (
  filters: Filter[],
  queryParams: Record<string, string | number | string[]>,
  tablePrefix = '',
): string => {
  const filterConditions: string[] = [];
  const prefix = tablePrefix ? `${tablePrefix}.` : '';

  // Mapping between filter types and their corresponding SQL conditions
  const filterTypeToSqlCondition: Record<
    FilterType,
    (paramKey: string) => string
  > = {
    userId: (paramKey) => `AND ${prefix}userId = {${paramKey}: String}`,
    model: (paramKey) => `AND ${prefix}modelId = {${paramKey}: String}`,
    repositoryName: (paramKey) =>
      `AND ${prefix}repositoryName = {${paramKey}: String}`,
  };

  filters.forEach((filter, index) => {
    const paramKey = `filter${index}`;
    queryParams[paramKey] = filter.value;

    const conditionBuilder = filterTypeToSqlCondition[filter.type];
    if (conditionBuilder) {
      filterConditions.push(conditionBuilder(paramKey));
    }
  });

  return filterConditions.join(' ');
};

// Helper functions for filter management
export const filterExists = (filters: Filter[], newFilter: Filter): boolean => {
  return filters.some(
    (filter) =>
      filter.type === newFilter.type && filter.value === newFilter.value,
  );
};

export const groupFiltersByType = (
  filters: Filter[],
): Record<FilterType, Filter[]> => {
  return filters.reduce(
    (acc, filter) => {
      if (!acc[filter.type]) {
        acc[filter.type] = [];
      }
      acc[filter.type].push(filter);
      return acc;
    },
    {} as Record<FilterType, Filter[]>,
  );
};
