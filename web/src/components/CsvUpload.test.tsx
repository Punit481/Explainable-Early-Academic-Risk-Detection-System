import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError } from '../api'
import { CsvUpload } from './CsvUpload'

describe('CsvUpload', () => {
  const file = new File(['name;G2\nAsha;12\n'], 'class.csv', { type: 'text/csv' })

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('shows how many students were imported and which lines were skipped', async () => {
    vi.spyOn(api, 'uploadCsv').mockResolvedValue({
      imported: 29,
      errors: [{ line: 7, message: 'Missing field: G2' }],
    })
    const onUploaded = vi.fn()
    const { container } = render(<CsvUpload classId={3} onUploaded={onUploaded} />)

    await userEvent.upload(container.querySelector('input[type=file]') as HTMLInputElement, file)

    expect(await screen.findByText('29 students imported, 1 skipped')).toBeInTheDocument()
    expect(screen.getByText('Line 7: Missing field: G2')).toBeInTheDocument()
    expect(api.uploadCsv).toHaveBeenCalledWith(3, file)
    expect(onUploaded).toHaveBeenCalled()
  })

  it('shows the error when the whole upload fails', async () => {
    vi.spyOn(api, 'uploadCsv').mockRejectedValue(new ApiError(503, 'ml-service is not reachable'))
    const onUploaded = vi.fn()
    const { container } = render(<CsvUpload classId={3} onUploaded={onUploaded} />)

    await userEvent.upload(container.querySelector('input[type=file]') as HTMLInputElement, file)

    expect(await screen.findByRole('alert')).toHaveTextContent('ml-service is not reachable')
    expect(onUploaded).not.toHaveBeenCalled()
  })
})
