export type UserRole = 'Super Admin' | 'Admin' | 'Field Staff' | 'Volunteer' | 'Chairperson' | 'Vice Chairperson' | 'Secretary' | 'Vice Secretary' | 'Treasurer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  status: 'Pending' | 'Active' | 'Suspended';
  phoneNumber?: string;
  photoURL?: string;
  position?: string;
  createdAt: string;
  approvedBy?: string;
}

export interface Member {
  id: string;
  fullName: string;
  dateOfBirth?: string;
  gender: 'Male' | 'Female' | 'Other';
  address?: string;
  phoneNumber?: string;
  position?: string;
  interests?: string[];
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'Planned' | 'Active' | 'Completed' | 'On Hold';
  startDate?: string;
  endDate?: string;
  managerId?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'Income' | 'Expense';
  category: string;
  description: string;
  date: string;
  recordedBy: string;
}

export interface AppEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  registeredCount: number;
  projectId?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  attendees: string;
  minutes: string;
  recordedBy: string;
  createdAt: any;
}

export interface Communication {
  id: string;
  type: 'Broadcasting' | 'Direct Message';
  subject: string;
  message: string;
  recipients: 'Everyone' | 'Staff' | 'Volunteers' | 'Youth Members';
  channel: 'SMS' | 'Email' | 'In-App';
  senderId: string;
  senderName: string;
  sentAt: any;
  status: 'Draft' | 'Sent' | 'Failed';
}

export interface EventRegistration {
  id: string;
  userId: string;
  userName: string;
  userType: 'Personnel' | 'Youth Member';
  registeredAt: any;
}
