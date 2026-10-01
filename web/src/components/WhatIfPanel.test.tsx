import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api, type Student } from '../api'
import { WhatIfPanel } from './WhatIfPanel'

const student: Student = {
  id: 10,
  name: 'Isha Gupta',
  classroomId: 2,
  features: { G1: 6, G2: 5, absences: 6, studytime: 2, goout: 3, schoolsup: 'no', paid: 'no' },
  riskProbability: 0.9992,
  riskScore: 99.92,
  riskLevel: 'High',
  anomaly: true,
  intervention: 'Immediate counseling & mentoring',
  topFactors: [],
  predictedAt: '2026-10-02T00:00:00Z',
}

describe('WhatIfPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends only the changed fields and shows the score before and after', async () => {
    vi.spyOn(api, 'whatIf').mockResolvedValue({
      riskProbability: 0.342,
      riskScore: 34.2,
      riskLevel: 'Medium',
      anomaly: false,
      intervention: 'Regular monitoring & academic support',
      topFactors: [{ feature: 'G2', value: 15, contribution: -1.2, effect: 'decreases risk' }],
    })
    render(<WhatIfPanel student={student} />)

    // Slider order follows WHAT_IF_FIELDS: G1, G2, absences, ...
    fireEvent.change(screen.getAllByRole('slider')[1], { target: { value: '15' } })

    const result = await screen.findByTestId('what-if-result')
    expect(result).toHaveTextContent('99.9→34.2')
    expect(result).toHaveTextContent('Medium risk')
    expect(result).toHaveTextContent('(-65.7)')
    expect(api.whatIf).toHaveBeenCalledTimes(1)
    expect(api.whatIf).toHaveBeenCalledWith(10, { G2: 15 })
  })

  it('does not call the api until something changes, and reset clears the result', async () => {
    const whatIf = vi.spyOn(api, 'whatIf').mockResolvedValue({
      riskProbability: 0.5,
      riskScore: 50,
      riskLevel: 'Medium',
      anomaly: false,
      intervention: 'Regular monitoring & academic support',
      topFactors: [],
    })
    render(<WhatIfPanel student={student} />)
    expect(screen.getByText('Move a slider to see how the risk would change.')).toBeInTheDocument()

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'yes' } })
    await screen.findByTestId('what-if-result')
    expect(whatIf).toHaveBeenCalledWith(10, { schoolsup: 'yes' })

    fireEvent.click(screen.getByText('Reset to real values'))
    expect(screen.queryByTestId('what-if-result')).not.toBeInTheDocument()
  })
})
