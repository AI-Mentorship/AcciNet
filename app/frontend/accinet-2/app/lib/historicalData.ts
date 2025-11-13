// Utility to parse column-oriented historical crash data schema

export type HistoricalCellRecord = {
  cell_id: number;
  cell_center_lat: number;
  cell_center_lon: number;
  crash_density: number;
  year: number;
};

export type ColumnOrientedData = {
  cell_id: Record<string, number>;
  cell_center_lat: Record<string, number>;
  cell_center_lon: Record<string, number>;
  crash_density: Record<string, number>;
  year: Record<string, number>;
};

/**
 * Converts column-oriented JSON data to row-oriented records
 */
export function parseHistoricalData(data: ColumnOrientedData): HistoricalCellRecord[] {
  const records: HistoricalCellRecord[] = [];
  
  // Get all row indices (they should be the same across all columns)
  const rowIndices = Object.keys(data.cell_id || {});
  
  for (const rowIndex of rowIndices) {
    records.push({
      cell_id: data.cell_id[rowIndex],
      cell_center_lat: data.cell_center_lat[rowIndex],
      cell_center_lon: data.cell_center_lon[rowIndex],
      crash_density: data.crash_density[rowIndex],
      year: data.year[rowIndex],
    });
  }
  
  return records;
}

/**
 * Get unique years from the dataset
 */
export function getAvailableYears(records: HistoricalCellRecord[]): number[] {
  const years = new Set(records.map(r => r.year));
  return Array.from(years).sort((a, b) => a - b);
}

/**
 * Filter records by year
 */
export function filterByYear(records: HistoricalCellRecord[], year: number): HistoricalCellRecord[] {
  return records.filter(r => r.year === year);
}

/**
 * Filter records by inclusive year range
 */
export function filterByYearRange(
  records: HistoricalCellRecord[],
  startYear: number,
  endYear: number
): HistoricalCellRecord[] {
  const min = Math.min(startYear, endYear);
  const max = Math.max(startYear, endYear);
  return records.filter((r) => r.year >= min && r.year <= max);
}

