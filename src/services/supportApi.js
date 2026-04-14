import { decodeApiResponse, encryptRequestData } from './payloadCrypto'
function convertToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = () => {
      const base64 = reader.result.split(',')[1] // remove prefix
      resolve(base64)
    }

    reader.onerror = (error) => reject(error)
  })
}
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
  try {
    // 🔐 Get token
    const sessionData = sessionStorage.getItem('cboi-auth-session-temporary')
    const { accessToken } = sessionData ? JSON.parse(sessionData) : {}

    // 🔑 Pass key from env
    const passKey = import.meta.env.VITE_STATIC_PASS_KEY

    // 🎯 Prepare request
    const rawRequest = {
      status: status?.toLowerCase() === 'all' ? 'all' : status?.toLowerCase(),
      created_after: startDate,
      created_before: endDate
    }

    // 🔐 Encrypt request
    const encryptedPayload = encryptRequestData(rawRequest)

    // 🚀 API Call (matches your Postman exactly)
    const response = await fetch(
      'https://api-preprod.txninfra.com/encrV4/CBOI/zendesk/v2/filterTickets',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: accessToken,   // ✅ NO Bearer
          pass_key: passKey             // ✅ header
        },
        body: JSON.stringify({
          RequestData: encryptedPayload
        })
      }
    )

    const encryptedResponse = await response.json()
    console.log('Encrypted Response:', encryptedResponse)

    // 🔓 Decrypt response
    const result = decodeApiResponse(encryptedResponse)

    console.log('Decrypted Response:', result)

    if (result?.statusCode !== 0) {
      throw new Error(result?.statusDesc || 'Failed to fetch tickets')
    }

    let data = result?.data || []

    // 🔍 Search filter (frontend)
    if (search) {
      const keyword = search.toLowerCase()

      data = data.filter((item) =>
        item.id?.toString().includes(keyword) ||
        item.subject?.toLowerCase().includes(keyword) ||
        item.description?.toLowerCase().includes(keyword)
      )
    }

    // 🎯 Mapping for UI
    const mappedData = data.map((item) => {
      return{
      ticketId: item.id?.toString().replace('#', ''),
      subject: item.subject,
      description: item.description,
      status: item.status,
      raisedDate: item.created_at,
      updatedDate: item.updated_at
    }
  })

    return {
      statusCode: 0,
      status: 'SUCCESS',
      data: mappedData
    }

  } catch (error) {
    console.error('Error fetching tickets:', error)

    return {
      statusCode: -1,
      status: 'FAILED',
      data: [],
      message: error.message
    }
  }
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
  try {
    const sessionData = sessionStorage.getItem('cboi-auth-session-temporary')
    const { accessToken } = sessionData ? JSON.parse(sessionData) : {}

    const passKey = import.meta.env.VITE_STATIC_PASS_KEY

    const rawRequest = {
      ticket_id: Number(ticketId)
    }

    const encryptedPayload = encryptRequestData(rawRequest)

    const response = await fetch(
      'https://api-preprod.txninfra.com/encrV4/CBOI/zendesk/v2/viewTicket',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: accessToken,
          pass_key: passKey
        },
        body: JSON.stringify({
          RequestData: encryptedPayload
        })
      }
    )

    const encryptedResponse = await response.json()

    const result = decodeApiResponse(encryptedResponse)

    if (result?.statusCode !== 0) {
      throw new Error(result?.statusDesc || 'Failed to fetch ticket details')
    }

    return result

  } catch (error) {
    console.error('Error fetching ticket details:', error)
    throw error
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
export async function uploadSupportFiles(files) {
  try {
    const sessionData = sessionStorage.getItem('cboi-auth-session-temporary')
    const { accessToken } = sessionData ? JSON.parse(sessionData) : {}

    const passKey = import.meta.env.VITE_STATIC_PASS_KEY

    
    // 🔄 Convert files → base64
    const base64Files = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        base64string: await convertToBase64(file)
      }))
    )

    // 🎯 Raw request
    const rawRequest = {
      files: base64Files
    }

    // 🔐 Encrypt
    const encryptedPayload = encryptRequestData(rawRequest)

    const response = await fetch(
      'https://api-preprod.txninfra.com/encrV4/CBOI/zendesk/v2/uploadfile',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: accessToken,
          pass_key: passKey
        },
        body: JSON.stringify({
          RequestData: encryptedPayload
        })
      }
    )

    const encryptedResponse = await response.json()

    const result = decodeApiResponse(encryptedResponse)

    return result

  } catch (error) {
    console.error('Upload Error:', error)
    throw error
  }
}
export async function createSupportTicketApi(payload) {
  try {
    const sessionData = sessionStorage.getItem('cboi-auth-session-temporary')
    const { accessToken } = sessionData ? JSON.parse(sessionData) : {}

    const passKey = import.meta.env.VITE_STATIC_PASS_KEY

    const encryptedPayload = encryptRequestData(payload)

    const response = await fetch(
      'https://api-preprod.txninfra.com/encrV4/CBOI/zendesk/v2/createTicket',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: accessToken,
          pass_key: passKey
        },
        body: JSON.stringify({
          RequestData: encryptedPayload
        })
      }
    )

    const encryptedResponse = await response.json()
    const result = decodeApiResponse(encryptedResponse)

    return result

  } catch (error) {
    console.error('Create Ticket Error:', error)
    throw error
  }
}
export async function closeSupportTicket(ticketId) {
  try {
    const sessionData = sessionStorage.getItem('cboi-auth-session-temporary')
    const { accessToken } = sessionData ? JSON.parse(sessionData) : {}

    const passKey = import.meta.env.VITE_STATIC_PASS_KEY

    const rawRequest = {
      ticket_id: Number(ticketId)
    }

    const encryptedPayload = encryptRequestData(rawRequest)

    const response = await fetch(
      'https://api-preprod.txninfra.com/encrV4/CBOI/zendesk/v2/closeStatus',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authorization: accessToken,
          pass_key: passKey
        },
        body: JSON.stringify({
          RequestData: encryptedPayload
        })
      }
    )

    const encryptedResponse = await response.json()

    const result = decodeApiResponse(encryptedResponse)

    return result

  } catch (error) {
    console.error('Close Ticket Error:', error)
    throw error
  }
}
