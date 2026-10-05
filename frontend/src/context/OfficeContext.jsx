import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  announcements as seedAnnouncements,
  applications as seedApplications,
  documentRequests as seedDocuments,
  records as seedRecords,
} from '../data/mock.js'

const APPLICATIONS_KEY = 'patron.manager.applications.v1'
const RECORDS_KEY = 'patron.manager.records.v1'
const DOCUMENTS_KEY = 'patron.manager.documents.v1'
const ANNOUNCEMENTS_KEY = 'patron.manager.announcements.v1'
const OfficeContext = createContext(null)

function readList(key, isValid) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isValid)) return parsed
  } catch {
    return null
  }
  return null
}

function writeList(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // Edits still apply for this visit.
  }
}

function withMissingSeeds(stored, seeds) {
  if (!stored) return seeds
  const missing = seeds.filter((seed) => !stored.some((item) => item.id === seed.id))
  return missing.length ? [...stored, ...missing] : stored
}

export function OfficeProvider({ children }) {
  const [applications, setApplications] = useState(
    () =>
      readList(
        APPLICATIONS_KEY,
        (item) => item.title && item.date && Array.isArray(item.requirements),
      ) || seedApplications,
  )
  const [records, setRecords] = useState(
    () =>
      withMissingSeeds(
        readList(RECORDS_KEY, (item) => item.subjects && item.officiant && item.encodedBy),
        seedRecords,
      ),
  )
  const [documents, setDocuments] = useState(
    () =>
      readList(
        DOCUMENTS_KEY,
        (item) => item.applicant && item.document && item.date && item.time && item.status,
      ) || seedDocuments,
  )
  const [announcements, setAnnouncements] = useState(
    () =>
      readList(
        ANNOUNCEMENTS_KEY,
        (item) => item.title && item.body && item.createdBy && item.status && typeof item.facebookSynced === 'boolean',
      ) || seedAnnouncements,
  )

  useEffect(() => {
    writeList(APPLICATIONS_KEY, applications)
  }, [applications])

  useEffect(() => {
    writeList(RECORDS_KEY, records)
  }, [records])

  useEffect(() => {
    writeList(DOCUMENTS_KEY, documents)
  }, [documents])

  useEffect(() => {
    writeList(ANNOUNCEMENTS_KEY, announcements)
  }, [announcements])

  const value = useMemo(
    () => ({
      applications,
      records,
      documents,
      announcements,
      setApplicationStatus(id, status) {
        setApplications((current) =>
          current.map((item) => (item.id === id ? { ...item, status } : item)),
        )
      },
      updateApplication(id, patch) {
        setApplications((current) =>
          current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        )
      },
      toggleRequirement(applicationId, requirementId) {
        setApplications((current) =>
          current.map((item) => {
            if (item.id !== applicationId) return item
            return {
              ...item,
              requirements: item.requirements.map((requirement) =>
                requirement.id === requirementId
                  ? { ...requirement, checked: !requirement.checked }
                  : requirement,
              ),
            }
          }),
        )
      },
      updateRecord(id, patch) {
        setRecords((current) =>
          current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
        )
      },
      addDocument(item) {
        setDocuments((current) => [item, ...current])
      },
      confirmDocumentMatch(id, recordId) {
        setDocuments((current) =>
          current.map((item) => (item.id === id ? { ...item, matchedRecordId: recordId } : item)),
        )
      },
      addAnnouncement(item) {
        setAnnouncements((current) => [item, ...current])
      },
    }),
    [applications, records, documents, announcements],
  )

  return <OfficeContext.Provider value={value}>{children}</OfficeContext.Provider>
}

export function useOffice() {
  const value = useContext(OfficeContext)
  if (!value) throw new Error('useOffice must be used within OfficeProvider')
  return value
}
