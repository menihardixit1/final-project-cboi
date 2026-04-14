import {
  closeSupportTicket,
  createSupportTicket,
  getSupportTicketDetails,
  getSupportTickets,
  reopenSupportTicket,
} from '../../services/supportApi'

function mapStatus(status) {
  return String(status || 'open').toLowerCase().replace(/\s+/g, '_')
}

function mapTicket(ticket) {
  const id = String(ticket?.ticketId ?? ticket?.id ?? '')

  return {
    id,
    subject: ticket?.subject ?? ticket?.operation ?? ticket?.reasonType ?? 'Support ticket',
    status: mapStatus(ticket?.status),
    created_at: ticket?.raisedDate ?? ticket?.created_at ?? new Date().toISOString(),
    transactionId: ticket?.transactionId ?? '',
    description: ticket?.description ?? '',
    custom_fields: [
      {
        id: 900013326003,
        value: ticket?.transactionId ?? '',
      },
    ],
    comments: (ticket?.messages ?? []).map((message) => ({
      id: message.id,
      author: message.senderName ?? message.author,
      body: message.message ?? message.text,
      created_at: message.sentAt,
    })),
  }
}

function downloadJsonFile(payload, fileName) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8;',
  })
  const downloadUrl = window.URL.createObjectURL(blob)
  const downloadLink = document.createElement('a')
  downloadLink.href = downloadUrl
  downloadLink.download = fileName
  document.body.appendChild(downloadLink)
  downloadLink.click()
  document.body.removeChild(downloadLink)
  window.URL.revokeObjectURL(downloadUrl)
}

export async function createTicket(payload) {
  const response = await createSupportTicket({
    transactionId: payload.transactionId ?? '',
    phoneNumber: payload.phoneNumber ?? '',
    operation: payload.issueType ?? payload.subject ?? 'Support',
    reasonType: payload.issueSubType ?? payload.issueType ?? 'Other',
    description: payload.description ?? payload.body ?? payload.subject ?? '',
  })

  return {
    statusCode: response.statusCode,
    statusDesc: response.message,
    ticket_id: response.data?.ticketId,
    data: mapTicket(response.data),
  }
}

export async function fetchTickets({ status, createdAfter, createdBefore } = {}) {
  const response = await getSupportTickets({
    status: status === 'all' ? '' : status,
    startDate: createdAfter,
    endDate: createdBefore,
  })

  return {
    statusCode: response.statusCode,
    statusDesc: response.message,
    data: response.data.map(mapTicket),
  }
}

export async function viewTicket(ticketId) {
  const response = await getSupportTicketDetails(ticketId)

  return {
    statusCode: response.statusCode,
    statusDesc: response.message,
    data: mapTicket(response.data),
  }
}

export async function closeTicket(ticketId) {
  const response = await closeSupportTicket(ticketId)

  return {
    statusCode: response.statusCode,
    statusDesc: response.message,
  }
}

export async function reopenTicket(ticketId) {
  const response = await reopenSupportTicket(ticketId)

  return {
    statusCode: response.statusCode,
    statusDesc: response.message,
  }
}

export async function downloadTicketById(ticketId, userName = 'user') {
  const response = await viewTicket(ticketId)
  downloadJsonFile(response.data, `cboi-ticket-${ticketId}-${userName}.json`)
}

export async function downloadAllTickets(userName = 'user') {
  const response = await fetchTickets()
  downloadJsonFile(response.data, `cboi-tickets-${userName}.json`)
}
