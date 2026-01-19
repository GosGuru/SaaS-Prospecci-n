export interface PlaceSearchResult {
  placeId: string
  name: string
  address: string
  city?: string
  country?: string
  latitude: number
  longitude: number
  types: string[]
  category: string
  rating?: number
  reviewCount?: number
  priceLevel?: number
  website?: string
  phone?: string
  openingHours?: {
    isOpen?: boolean
    weekdayText?: string[]
  }
  photos: number
  hasWebsite: boolean
  isChain: boolean
  webProbability: number
  // Opportunity info
  opportunityType?: 'new_website' | 'redesign' | 'low_priority'
  redesignPotential?: number
  redesignReason?: string
}

export interface PlaceSearchParams {
  query: string
  location?: {
    lat: number
    lng: number
  }
  radius?: number // in meters
  type?: string
  minRating?: number
  hasWebsite?: boolean | null
  hasPhone?: boolean
}

export interface Lead {
  id: string
  name: string
  email?: string
  phone?: string
  website?: string
  hasWebsite?: boolean
  placeId?: string
  businessName?: string
  address?: string
  city?: string
  category?: string
  rating?: number
  reviewCount?: number
  status: LeadStatus
  score?: number
  webProbability?: number
  source?: LeadSource
  notes?: string
  createdAt: Date
  updatedAt: Date
  lastContactedAt?: Date
  ownerId?: string
  stageId?: string
  workspaceId: string
  tags?: Tag[]
  stage?: PipelineStage
  owner?: User
}

export type LeadStatus = 
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'active'
  | 'converted'
  | 'lost'
  | 'inactive'

export type LeadSource = 
  | 'MANUAL'
  | 'GOOGLE_PLACES'
  | 'IMPORT'
  | 'REFERRAL'
  | 'WEBSITE'
  | 'CAMPAIGN'
  | 'manual'
  | 'google_places'
  | 'import'
  | 'referral'
  | 'website'
  | 'campaign'

export interface PipelineStage {
  id: string
  name: string
  color: string
  order: number
  isDefault?: boolean
  isWon?: boolean
  isLost?: boolean
  workspaceId: string
  _count?: {
    leads: number
  }
}

export interface Tag {
  id: string
  name: string
  color: string
  workspaceId: string
}

export interface User {
  id: string
  email: string
  name?: string
  image?: string
}

export interface Workspace {
  id: string
  name: string
  slug: string
  logo?: string
  createdAt: Date
  updatedAt: Date
}

export interface Activity {
  id: string
  type: ActivityType | string
  title?: string
  description?: string
  metadata?: Record<string, any>
  createdAt: Date
  leadId?: string | null
  userId: string
  user?: User
}

export interface Conversation {
  id: string
  lead: Lead
  channel: 'whatsapp' | 'email'
  lastMessage: string
  lastMessageAt: Date
  isRead: boolean
  messageCount: number
}

export type ActivityType = 
  | 'NOTE'
  | 'CALL'
  | 'EMAIL'
  | 'WHATSAPP'
  | 'MEETING'
  | 'STAGE_CHANGE'
  | 'TASK_COMPLETED'
  | 'SYSTEM'
  | 'note'
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'meeting'
  | 'stage_change'
  | 'whatsapp_sent'
  | 'whatsapp_received'
  | 'email_sent'
  | 'email_received'
  | 'created'
  | 'task_completed'
  | 'system'

export interface Task {
  id: string
  title: string
  description?: string
  dueDate?: Date
  priority: Priority
  status: TaskStatus
  completedAt?: Date
  createdAt: Date
  leadId?: string
  assigneeId?: string
  creatorId: string
  lead?: Lead
  assignee?: User
  creator?: User
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface Campaign {
  id: string
  name: string
  description?: string
  channel: MessageChannel
  status: CampaignStatus
  template?: string
  scheduledAt?: Date
  startedAt?: Date
  completedAt?: Date
  workspaceId: string
  _count?: {
    members: number
  }
}

export type MessageChannel = 'WHATSAPP' | 'EMAIL'
export type CampaignStatus = 
  | 'DRAFT'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'

export interface OutboundMessage {
  id: string
  channel: MessageChannel
  to: string
  content: string
  subject?: string
  status: MessageStatus
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  failedAt?: Date
  errorMessage?: string
  leadId: string
  lead?: Lead
}

export interface InboundMessage {
  id: string
  channel: MessageChannel
  from: string
  content: string
  subject?: string
  receivedAt: Date
  readAt?: Date
  leadId?: string
  lead?: Lead
}

export type MessageStatus = 
  | 'PENDING'
  | 'QUEUED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'

// Dashboard metrics
export interface DashboardMetrics {
  totalLeads: number
  newLeadsToday: number
  contactedToday: number
  wonThisMonth: number
  lostThisMonth: number
  leadsByStage: { stage: string; count: number; color: string }[]
  leadsBySource: { source: string; count: number }[]
  recentActivity: Activity[]
  upcomingTasks: Task[]
  outreachStats: {
    whatsappSent: number
    whatsappDelivered: number
    whatsappFailed: number
    emailSent: number
    emailDelivered: number
    emailFailed: number
  }
}
