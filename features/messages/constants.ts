export const RATE_LIMIT_MESSAGES_PER_MINUTE = 30;
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_QUICK_REPLY_TITLE_LENGTH = 100;
export const MAX_QUICK_REPLY_BODY_LENGTH = 1000;

export type SenderRole = "customer" | "staff" | "manager" | "owner" | "admin";

export type ChatMessage = {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  senderRole: SenderRole;
  isMe: boolean;
  body: string | null;
  imagePath: string | null;
  imageUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type QuickReplyItem = {
  id: string;
  shopId?: string | null;
  title: string;
  body: string;
  category?: string;
  sortOrder?: number;
  isCustom?: boolean;
};

/**
 * Predefined quick replies tailored for service businesses and customer communication in the Philippines.
 */
export const DEFAULT_QUICK_REPLIES: readonly QuickReplyItem[] = [
  {
    id: "qr-confirm",
    title: "Confirm Booking",
    category: "Confirmation",
    body: "Hi! We've received your booking request and look forward to serving you. See you soon!",
  },
  {
    id: "qr-on-the-way",
    title: "On the Way",
    category: "Arrival & Directions",
    body: "Hi! Our staff/team is on the way to your location. Please let us know if there are specific directions or gate pass requirements.",
  },
  {
    id: "qr-early-arrival",
    title: "Arrive 10m Early",
    category: "Arrival & Directions",
    body: "Please arrive 5 to 10 minutes before your scheduled appointment so we can start your service right on time.",
  },
  {
    id: "qr-request-photo",
    title: "Request Photo / Info",
    category: "Service Preparation",
    body: "Could you please send a photo of the area or item? This will help us prepare the right tools and give an accurate estimate.",
  },
  {
    id: "qr-delay",
    title: "Running a Bit Late",
    category: "Updates",
    body: "Hi! We are running approximately 10–15 minutes behind schedule due to our previous appointment. We apologize for the wait and will be ready shortly!",
  },
  {
    id: "qr-ready",
    title: "Ready for You",
    category: "Updates",
    body: "We are all set and ready for your appointment! Feel free to come in anytime.",
  },
  {
    id: "qr-payment",
    title: "Payment Methods",
    category: "Payment",
    body: "For remaining balance, we accept Cash, GCash, and Maya at the shop. Thank you!",
  },
  {
    id: "qr-thank-you",
    title: "Thank You & Review",
    category: "Follow-up",
    body: "Thank you for visiting us! We hope you loved your service. If you have a moment, we'd appreciate a quick review on BooKanto!",
  },
] as const;
