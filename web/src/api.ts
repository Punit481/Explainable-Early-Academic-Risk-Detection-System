// Everything the dashboard needs from the NestJS api, in one place.
// In development Vite forwards /api/... to the api (see vite.config.ts).

export type RiskLevel = 'Low' | 'Medium' | 'High'
export type StudentFeatures = Record<string, string | number>

export interface ShapFactor {
  feature: string
  value: string | number
  contribution: number
  effect: string
}

export interface Prediction {
  riskProbability: number
  riskScore: number
  riskLevel: RiskLevel
  anomaly: boolean
  intervention: string
  topFactors: ShapFactor[]
}

export interface Student extends Prediction {
  id: number
  name: string
  classroomId: number
  features: StudentFeatures
  predictedAt: string
}

export type StudentRow = Pick<Student, 'id' | 'name' | 'riskScore' | 'riskLevel' | 'anomaly' | 'intervention'>

export interface ClassSummary {
  id: number
  name: string
  riskCounts: Record<RiskLevel, number>
}

export interface ClassDetail {
  id: number
  name: string
  students: StudentRow[]
}

export interface UploadResult {
  imported: number
  errors: { line: number; message: string }[]
}

export interface Session {
  accessToken: string
  teacher: { name: string; email: string }
}

/** An error response from the api, with its status code and a readable message. */
export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// --- Login session, kept in localStorage so a page reload stays logged in ---

const SESSION_KEY = 'session'

export function loadSession(): Session | null {
  const saved = localStorage.getItem(SESSION_KEY)
  return saved ? (JSON.parse(saved) as Session) : null
}

export function saveSession(session: Session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

// Called when a logged-in request gets 401 (token expired); auth.tsx logs out
let onUnauthorized = () => {}

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = loadSession()
  const headers = new Headers(options.headers)
  if (session) {
    headers.set('Authorization', `Bearer ${session.accessToken}`)
  }
  // FormData (file upload) sets its own Content-Type
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`/api${path}`, { ...options, headers })

  if (response.status === 401 && session) {
    onUnauthorized()
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    // Nest validation errors come as a list of messages
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message
    throw new ApiError(response.status, message ?? `Request failed (${response.status})`)
  }
  return response.json() as Promise<T>
}

function post<T>(path: string, body: unknown) {
  return request<T>(path, { method: 'POST', body: JSON.stringify(body) })
}

export const api = {
  register: (email: string, name: string, password: string) =>
    post<{ id: number }>('/auth/register', { email, name, password }),

  login: (email: string, password: string) => post<Session>('/auth/login', { email, password }),

  getClasses: () => request<ClassSummary[]>('/classes'),

  createClass: (name: string) => post<{ id: number; name: string }>('/classes', { name }),

  getClass: (id: number) => request<ClassDetail>(`/classes/${id}`),

  uploadCsv: (classId: number, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<UploadResult>(`/classes/${classId}/upload`, { method: 'POST', body: form })
  },

  getStudent: (id: number) => request<Student>(`/students/${id}`),

  whatIf: (id: number, changes: StudentFeatures) => post<Prediction>(`/students/${id}/what-if`, changes),
}
