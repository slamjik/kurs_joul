import client from './client'

export async function getTeachers() {
  const response = await client.get('/teachers/')
  return response.data?.results || response.data || []
}

export async function getStudyGroups() {
  const response = await client.get('/groups/')
  return response.data?.results || response.data || []
}

export async function getDisciplines() {
  const response = await client.get('/disciplines/')
  return response.data?.results || response.data || []
}

export async function getDisciplineCard(id) {
  const response = await client.get(`/disciplines/${id}/card/`)
  return response.data
}

export async function getStudents(params = {}) {
  const response = await client.get('/students/', { params })
  return response.data?.results || response.data || []
}

export async function getAuditLogs(params = {}) {
  const response = await client.get('/audit/', { params })
  return response.data
}

