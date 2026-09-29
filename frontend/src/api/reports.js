import client from './client'

const triggerDownload = (blob, filename) => {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export async function downloadWorkloadExcel(params = {}) {
  const response = await client.get('/reports/workload-excel/', {
    params,
    responseType: 'blob',
  })
  triggerDownload(
    new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `workload_report_${params.semester || 'all'}.xlsx`
  )
}

export async function downloadWorkloadPdf(params = {}) {
  const response = await client.get('/reports/workload-pdf/', {
    params,
    responseType: 'blob',
  })
  const isHtml = response.headers['content-type']?.includes('text/html')
  triggerDownload(
    new Blob([response.data], { type: isHtml ? 'text/html' : 'application/pdf' }),
    `workload_report_${params.semester || 'all'}.${isHtml ? 'html' : 'pdf'}`
  )
}

export async function downloadGradesExcel(params = {}) {
  const response = await client.get('/reports/grades-excel/', {
    params,
    responseType: 'blob',
  })
  triggerDownload(
    new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `grades_report_${params.semester || 'all'}.xlsx`
  )
}

export async function downloadGradesPdf(params = {}) {
  const response = await client.get('/reports/grades-pdf/', {
    params,
    responseType: 'blob',
  })
  const isHtml = response.headers['content-type']?.includes('text/html')
  triggerDownload(
    new Blob([response.data], { type: isHtml ? 'text/html' : 'application/pdf' }),
    `grades_report_${params.semester || 'all'}.${isHtml ? 'html' : 'pdf'}`
  )
}
