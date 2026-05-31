// Dynamic import of XLSX - only loads the library when user clicks export
// Saves ~800KB from the initial bundle

export async function exportToExcel(
  rows: Record<string, any>[],
  sheetName: string,
  filename: string
): Promise<void> {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}
