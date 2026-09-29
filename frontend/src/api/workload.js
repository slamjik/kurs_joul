import client from './client'

export async function getWorkloads(params = {}) {
  const response = await client.get('/workload/', { params })
  return response.data
}

export async function createWorkload(data) {
  const response = await client.post('/workload/', data)
  return response.data
}

export async function updateWorkload(id, data) {
  const response = await client.put(`/workload/${id}/`, data)
  return response.data
}

export async function deleteWorkload(id) {
  const response = await client.delete(`/workload/${id}/`)
  return response.data
}

export async function checkWorkloadConflicts(data) {
  const response = await client.post('/workload/check-conflicts/', data)
  return response.data
}

export async function getWorkloadStats(params = {}) {
  const response = await client.get('/workload/stats/', { params })
  return response.data
}

export async function exportWorkloadExcel(params = {}) {
  const response = await client.get('/workload/export/', {
    params,
    responseType: 'blob',
  })
  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `workload_${params.semester || 'all'}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export async function importWorkloadExcel(formData) {
  const response = await client.post('/workload/import/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}
