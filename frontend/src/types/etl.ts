export type ImportPreviewRow = Record<
  string,
  string | number | boolean | null
>

export type ImportPreviewResponse = {
  job_id: string
  source_filename: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
  valid_preview: ImportPreviewRow[]
  invalid_preview: ImportPreviewRow[]
  preview_limit: number
  created_at: number
  expires_at: number
}

export type ImportPreviewError = {
  message: string
  errors?: Record<string, string[]>
}
