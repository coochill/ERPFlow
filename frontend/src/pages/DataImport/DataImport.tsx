import { useRef, useState } from 'react'
import { FileSpreadsheet, Upload, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import {
  parseImportPreview,
  previewInventoryImport,
  importInventoryPreview,
} from '../../services/etlService'
import type { ImportPreviewResponse, ImportPreviewRow } from '../../types/etl'
import './DataImport.css'

type PreviewTab = 'valid' | 'invalid'
type ImportResult = {
  source_filename?: string | null
  total_rows: number
  valid_rows: number
  invalid_rows: number
  imported: number
  conflicts: number
  results: {
    sku: string
    status: 'imported' | 'conflict'
    item_id?: number
    message: string
  }[]
}
function DataImport() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [activeTab, setActiveTab] = useState<PreviewTab>('valid')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  function selectFile(selectedFile?: File) {
    if (!selectedFile) return

    const extension = selectedFile.name.split('.').pop()?.toLowerCase()

    if (!['csv', 'xlsx'].includes(extension ?? '')) {
      setError('Please select a CSV or XLSX file.')
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('The file must be 5 MB or smaller.')
      return
    }

    setFile(selectedFile)
    setPreview(null)
    setImportResult(null)
    setError('')
  }

  async function handlePreview() {
    if (!file) {
      setError('Choose a file before generating a preview.')
      return
    }

    setLoading(true)
    setError('')
    setPreview(null)
    setImportResult(null)

    try {
      const response = await previewInventoryImport(file)
      const result = await parseImportPreview(response)
      setPreview(result)
      setActiveTab(result.valid_preview.length > 0 ? 'valid' : 'invalid')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while previewing the file.',
      )
    } finally {
      setLoading(false)
    }
  }

  
async function handleImport() {
  if (!preview || preview.valid_rows === 0) return

  if (preview.valid_rows > 500) {
    setError('The maximum import size is 500 valid rows.')
    return
  }

  const confirmed = window.confirm(
    `Import ${preview.valid_rows} valid rows from "${preview.source_filename}"? Existing SKUs will not be overwritten, and imported items will start with zero stock.`,
  )

  if (!confirmed) return

  setImporting(true)
  setError('')
  setImportResult(null)

  try {
    const response = await importInventoryPreview(preview.job_id)
    const payload: unknown = await response.json()

    if (!response.ok) {
      const body = payload as {
        message?: string
        detail?: string
      }

      throw new Error(
        body.message ?? body.detail ?? 'Unable to import inventory records.',
      )
    }

    setImportResult(payload as ImportResult)
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : 'Something went wrong while importing inventory records.',
    )
  } finally {
    setImporting(false)
  }
}

    const rows: ImportPreviewRow[] = preview
    ? activeTab === 'valid'
        ? preview.valid_preview
        : preview.invalid_preview
    : []

    const columns = preview
    ? [
        ...new Set(
            [...preview.valid_preview, ...preview.invalid_preview]
            .flatMap((row) => Object.keys(row)),
        ),
        ]
    : []

  return (
    <div className="data-import-page">
      <div className="data-import-heading">
        <div>
          <p className="data-import-eyebrow">DATA MANAGEMENT</p>
          <h1>Inventory Data Import</h1>
          <p className="data-import-description">
            Upload a CSV or Excel file, review validation results, and prepare
            inventory records for import.
          </p>
        </div>
      </div>

      <section className="data-import-card">
        <div className="data-import-card-heading">
          <div className="data-import-icon">
            <FileSpreadsheet size={21} />
          </div>
          <div>
            <h2>Upload inventory file</h2>
            <p>Supported formats: CSV and XLSX · Maximum file size: 5 MB</p>
          </div>
        </div>

        <button
          type="button"
          className="data-import-dropzone"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          <span className="data-import-upload-icon">
            <Upload size={22} />
          </span>
          <strong>{file ? file.name : 'Choose a file to get started'}</strong>
          <span>
            {file
              ? `${(file.size / 1024).toFixed(1)} KB · Click to change file`
              : 'Select a CSV or XLSX file from your computer'}
          </span>
          <span className="data-import-browse">Browse files</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          hidden
          onChange={(event) => {
            selectFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />

        {error && (
          <div className="data-import-error" role="alert">
            <AlertCircle size={17} />
            <span>{error}</span>
          </div>
        )}

        <div className="data-import-actions">
          <span className="data-import-hint">
            Preview and validate before importing.
          </span>
          <button
            type="button"
            className="data-import-primary"
            onClick={handlePreview}
            disabled={!file || loading}
          >
            {loading ? 'Extracting & validating…' : 'Extract & Validate'}
          </button>
        </div>
      </section>

      {preview && (
        <>
          <section className="data-import-summary">
            <div className="data-import-stat">
              <span>Total rows</span>
              <strong>{preview.total_rows}</strong>
            </div>
            <div className="data-import-stat valid">
              <span><CheckCircle2 size={15} /> Valid rows</span>
              <strong>{preview.valid_rows}</strong>
            </div>
            <div className="data-import-stat invalid">
              <span><XCircle size={15} /> Invalid rows</span>
              <strong>{preview.invalid_rows}</strong>
            </div>
          </section>

          <section className="data-import-card data-import-results">
            <div className="data-import-results-heading">
              <div>
                <h2>Validation results</h2>
                <p>Review the rows before proceeding with the import.</p>
              </div>
              <span className="data-import-filename">{preview.source_filename}</span>
            </div>

            <div className="data-import-tabs">
              <button
                type="button"
                className={activeTab === 'valid' ? 'active' : ''}
                onClick={() => setActiveTab('valid')}
              >
                Valid ({preview.valid_rows})
              </button>
              <button
                type="button"
                className={activeTab === 'invalid' ? 'active' : ''}
                onClick={() => setActiveTab('invalid')}
              >
                Invalid ({preview.invalid_rows})
              </button>
            </div>

            {rows.length > 0 ? (
              <div className="data-import-table-wrap">
                <table className="data-import-table">
                  <thead>
                    <tr>
                      {columns.map((column) => (
                        <th key={column}>{column.replaceAll('_', ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index}>
                        {columns.map((column) => (
                          <td key={column}>
                            {row[column] == null ? '—' : String(row[column])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="data-import-empty">
                {activeTab === 'valid'
                  ? 'No valid rows to display.'
                  : 'No invalid rows. All rows passed validation.'}
              </div>
            )}
            
            {preview && (
            <button
                type="button"
                className="data-import-primary"
                onClick={handleImport}
                disabled={
                importing ||
                loading ||
                preview.valid_rows === 0 ||
                preview.valid_rows > 500 ||
                importResult !== null
                }
            >
                {importing ? 'Importing…' : 'Import valid rows'}
            </button>
            )}

            {!importResult && (
  <p className="data-import-preview-note">
    Only valid rows will be imported. Invalid rows are excluded.
    Existing SKUs will not be overwritten.
  </p>
)}

{importResult && (
  <div className="data-import-import-result" role="status">
    <h3>Import completed</h3>
    <p>
      Imported: <strong>{importResult.imported}</strong>
      {' · '}
      Conflicts: <strong>{importResult.conflicts}</strong>
    </p>

    <div className="data-import-table-wrap">
      <table className="data-import-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {importResult.results.map((result, index) => (
            <tr key={`${result.sku}-${index}`}>
              <td>{result.sku}</td>
              <td>{result.status}</td>
              <td>{result.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
          </section>
        </>
      )}
    </div>
  )
}

export default DataImport
