// API Response Types
export interface ApiResponseBody {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  [key: string]: any;
}

// User Types
export interface User {
  _id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  avatar?: string;
  avatarId?: string;
  referralCode?: string;
  momoNumber?: string;
  momoOperator?: string;
  city?: string;
  region?: string;
  country?: string;
  birthDate?: string;
  sex?: 'male' | 'female' | 'other';
  profession?: string;
  language?: string[];
  interests?: string[];
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  balance?: number;
  activeSubscriptions?: string[];
  notificationPreference?: 'email' | 'whatsapp';
}

// Product Types
export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency?: string;
  category?: string;
  subcategory?: string;
  type?: 'product' | 'service';
  images?: { fileId: string; url: string; }[];
  seller?: {
    _id: string;
    name: string;
    avatar?: string;
  };
  rating?: number;
  reviewCount?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Subscription Types
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: number; // in days
  features: string[];
  isActive: boolean;
  type: string;
}

export interface Subscription {
  _id: string;
  planId?: string;
  user: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  paymentId?: string;
  subscriptionType: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

// Transaction Types
export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdrawal' | 'payment' | 'refund';
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description?: string;
  reference?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

// Contact Types
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  city?: string;
  country?: string;
  profession?: string;
  interests?: string[];
}

// Event Types
export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  images?: string[];
  isActive: boolean;
  createdAt: string;
}

// Flash Sale Types
export interface FlashSale {
  id: string;
  productId: string;
  product: Product;
  originalPrice: number;
  salePrice: number;
  discount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  viewCount?: number;
  clickCount?: number;
}

// Tombola Types
export interface Tombola {
  id: string;
  month: string;
  year: number;
  ticketPrice: number;
  maxTickets: number;
  soldTickets: number;
  prizes: TombolaPrize[];
  isActive: boolean;
  drawDate?: string;
  winners?: TombolaWinner[];
}

export interface TombolaPrize {
  id: string;
  name: string;
  description: string;
  value: number;
  position: number; // 1st, 2nd, 3rd, etc.
}

export interface TombolaWinner {
  id: string;
  userId: string;
  user: User;
  prizeId: string;
  prize: TombolaPrize;
  ticketNumber: string;
}

export interface TombolaTicket {
  id: string;
  tombolaId: string;
  userId: string;
  ticketNumber: string;
  purchaseDate: string;
}

// Advertising Types
export interface AdvertisingPack {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in days
  features: string[];
  isActive: boolean;
}

export interface Advertisement {
  id: string;
  userId: string;
  packId: string;
  pack: AdvertisingPack;
  title: string;
  description: string;
  image?: string;
  link?: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'expired' | 'rejected';
  impressions?: number;
  clicks?: number;
}

// Settings Types
export interface AppSettings {
  id: string;
  siteName: string;
  siteDescription?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  termsUrl?: string;
  privacyUrl?: string;
  presentationVideo?: string;
  presentationPdf?: string;
}

// API Request Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  referralCode?: string;
  city?: string;
  region?: string;
  country?: string;
  dateOfBirth?: string;
  gender?: string;
  profession?: string;
  language?: string;
  interests?: string;
  notificationPreference?: 'email' | 'whatsapp';
}

export interface ProductFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  type?: 'product' | 'service';
  sellerId?: string;
  page?: number;
  limit?: number;
}

export interface ContactFilters {
  search?: string;
  city?: string;
  country?: string;
  profession?: string;
  interests?: string;
  page?: number;
  limit?: number;
}

export interface TransactionFilters {
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
