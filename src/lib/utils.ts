/**
 * Serializes data to handle special types like BigInt and Decimal
 * @param data The data to serialize
 * @returns The serialized data
 */
export const serializeData = (data: any) => {
  return JSON.parse(JSON.stringify(data, (_, value) => {
    if (typeof value === 'bigint') return Number(value);
    if (value?.constructor?.name === 'Decimal') return Number(value.toString());
    return value;
  }));
}; 