import Papa from 'papaparse';

export interface CSVRow {
  title: string;
  description?: string;
  tags?: string;
  assignees?: string;
  priority?: string;
  points?: string;
  due_at?: string;
  column: string;
}

export interface ImportResult {
  created: number;
  errors: Array<{ row: number; message: string }>;
}

export function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`Erro no CSV: ${results.errors[0].message}`));
        } else {
          resolve(results.data);
        }
      },
      error: (error) => reject(error),
    });
  });
}

export function generateCSV(data: CSVRow[]): string {
  return Papa.unparse(data);
}

export function validateCSVRow(row: CSVRow, rowIndex: number): string | null {
  if (!row.title || row.title.trim() === '') {
    return `Linha ${rowIndex + 1}: título é obrigatório`;
  }
  if (!row.column || row.column.trim() === '') {
    return `Linha ${rowIndex + 1}: coluna é obrigatória`;
  }
  return null;
}
