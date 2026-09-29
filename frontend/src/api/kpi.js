import client from './client'

export async function getKpiSummary() {
  const response = await client.get('/kpi/summary/')
  return response.data
}

export async function getKpiQualityLevels() {
  const response = await client.get('/kpi/quality-levels/')
  return response.data
}

export async function getKpiWorkloadChart() {
  const response = await client.get('/kpi/workload-chart/')
  return response.data
}

export async function getKpiGradesDynamics() {
  const response = await client.get('/kpi/grades-dynamics/')
  return response.data
}

export async function getKpiDirectionsSummary() {
  const response = await client.get('/kpi/directions-summary/')
  return response.data
}

export async function invalidateKpiCache() {
  const response = await client.post('/kpi/invalidate-cache/')
  return response.data
}
