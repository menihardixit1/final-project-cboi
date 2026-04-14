const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

const mockTickets = [
  {
    ticketId: '352355',
    transactionId: '21368763981273921',
    phoneNumber: '+91 9349872421',
    operation: 'Transaction Declined',
    status: 'Pending',
    reasonType: 'Transaction Related',
    raisedDate: '2024-03-01T10:42:00',
    description:
      'The user reported that a transaction was declined even though the amount appears to have been debited.',
    canReopen: true,
    canClose: true,
  },
  {
    ticketId: '352356',
    transactionId: '1238719163291',
    phoneNumber: '+91 9349872421',
    operation: 'Transaction Declined',
    status: 'Unresolved',
    reasonType: 'Settlement Issue',
    raisedDate: '2024-03-02T11:23:32',
    description: 'Merchant reported settlement mismatch for a transaction.',
    canReopen: false,
    canClose: true,
  },
  {
    ticketId: '352357',
    transactionId: '1238719163292',
    phoneNumber: '+91 9349872421',
    operation: 'Transaction Declined',
    status: 'Resolved',
    reasonType: 'Transaction Related',
    raisedDate: '2024-03-03T11:23:32',
    description: 'Issue resolved after reconciliation.',
    canReopen: true,
    canClose: false,
  },
  {
    ticketId: '352358',
    transactionId: '1238719163293',
    phoneNumber: '+91 9349872421',
    operation: 'Transaction Declined',
    status: 'Resolved',
    reasonType: 'Refund Related',
    raisedDate: '2024-03-04T11:23:32',
    description: 'Refund confirmation shared with merchant.',
    canReopen: true,
    canClose: false,
  },
]

const mockMessages = {
  352355: [
    {
      id: 'm1',
      senderName: 'Program Manager',
      senderInitials: 'PM',
      sentAt: '2024-03-01T14:42:00',
      message:
        'Hello Support Team, I recently found out that my transaction has been declined and need help understanding why.',
    },
    {
      id: 'm2',
      senderName: 'Support Team',
      senderInitials: 'ST',
      sentAt: '2024-03-02T10:12:00',
      message:
        'Hi, thank you for reaching out. We are reviewing the transaction logs and will update you shortly.',
    },
  ],
}

export async function getSupportTickets({ startDate, endDate, status, search }) {
  await wait(350)

  let data = [...mockTickets]

  if (status && status !== 'All') {
    data = data.filter((item) => item.status.toLowerCase() === status.toLowerCase())
  }

  if (search) {
    const keyword = search.toLowerCase()
    data = data.filter(
      (item) =>
        item.transactionId.toLowerCase().includes(keyword) ||
        item.phoneNumber.toLowerCase().includes(keyword) ||
        item.ticketId.toLowerCase().includes(keyword),
    )
  }

  if (startDate) {
    data = data.filter((item) => new Date(item.raisedDate) >= new Date(startDate))
  }

  if (endDate) {
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    data = data.filter((item) => new Date(item.raisedDate) <= end)
  }

  return { statusCode: 0, status: 'SUCCESS', data }
}

export async function createSupportTicket(payload) {
  await wait(500)

  return {
    statusCode: 0,
    status: 'SUCCESS',
    message: 'Ticket raised successfully.',
    data: {
      ticketId: `${Math.floor(Math.random() * 900000) + 100000}`,
      ...payload,
      status: 'Pending',
      raisedDate: new Date().toISOString(),
    },
  }
}

export async function getSupportTicketDetails(ticketId) {
  await wait(300)

  const ticket = mockTickets.find((item) => item.ticketId === String(ticketId).replace('#', ''))

  if (!ticket) {
    throw new Error('Ticket not found.')
  }

  return {
    statusCode: 0,
    status: 'SUCCESS',
    data: {
      ...ticket,
      messages: mockMessages[ticket.ticketId] || [],
    },
  }
}

export async function sendSupportReply({ ticketId, message }) {
  await wait(300)

  return {
    statusCode: 0,
    status: 'SUCCESS',
    message: 'Reply sent successfully.',
    data: {
      id: `${Date.now()}`,
      ticketId,
      senderName: 'You',
      senderInitials: 'YO',
      sentAt: new Date().toISOString(),
      message,
      mine: true,
    },
  }
}

export async function reopenSupportTicket(ticketId) {
  await wait(250)
  return { statusCode: 0, status: 'SUCCESS', message: `Ticket #${ticketId} reopened successfully.` }
}

export async function closeSupportTicket(ticketId) {
  await wait(250)
  return { statusCode: 0, status: 'SUCCESS', message: `Ticket #${ticketId} closed successfully.` }
}
