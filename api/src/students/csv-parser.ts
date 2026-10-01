import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import type { StudentFeatures } from '../ml/ml.client.js';

export interface CsvStudent {
  /** Line in the file (the header is line 1), for readable error messages */
  line: number;
  name: string;
  features: StudentFeatures;
}

/**
 * Reads a class CSV: a "name" column plus the dataset columns (school, sex, age, ..., G1, G2).
 * Accepts ";" (like the UCI dataset file) or "," as the separator.
 * Number-looking values become numbers, everything else stays text.
 */
export function parseStudentCsv(csvText: string): CsvStudent[] {
  const header = csvText.split('\n', 1)[0];
  const delimiter = header.includes(';') ? ';' : ',';

  let records: Record<string, string>[];
  try {
    records = parse(csvText, { columns: true, delimiter, bom: true, trim: true, skip_empty_lines: true });
  } catch (error) {
    throw new BadRequestException(`Could not read CSV: ${(error as Error).message}`);
  }

  if (records.length === 0) {
    throw new BadRequestException('CSV file has no student rows');
  }
  if (!('name' in records[0])) {
    throw new BadRequestException('CSV file needs a "name" column');
  }

  return records.map((record, index) => {
    const { name, ...columns } = record;
    const features: StudentFeatures = {};
    for (const [column, value] of Object.entries(columns)) {
      const number = Number(value);
      features[column] = value !== '' && !Number.isNaN(number) ? number : value;
    }
    return { line: index + 2, name, features };
  });
}
