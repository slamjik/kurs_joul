import client from './client'

export async function getGrades(params = {}) {
  const response = await client.get('/grades/', { params })
  return response.data
}

export async function createGrade(data) {
  const response = await client.post('/grades/', data)
  return response.data
}

export async function updateGrade(id, data) {
  const response = await client.put(`/grades/${id}/`, data)
  return response.data
}

export async function deleteGrade(id) {
  const response = await client.delete(`/grades/${id}/`)
  return response.data
}

export async function getRiskZoneStudents() {
  const response = await client.get('/grades/risk-zone/')
  return response.data
}

export async function getGradesDynamics(params = {}) {
  const response = await client.get('/grades/dynamics/', { params })
  return response.data
}

export async function getQualityLevelsDistribution() {
  const response = await client.get('/grades/quality-levels/')
  return response.data
}

export async function importGradesExcel(formData) {
  const response = await client.post('/grades/import/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export async function importGradesLMS(data = {}) {
  const response = await client.post('/grades/import-lms/', data)
  return response.data
}

export async function getLMSStatus() {
  const response = await client.get('/grades/lms-status/')
  return response.data
}
