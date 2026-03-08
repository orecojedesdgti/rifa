export interface User {
  id: number;
  username: string;
  full_name: string;
  id_card: string;
  whatsapp: string;
  is_admin: number;
  must_change_password: number;
}

export interface RaffleInfo {
  title: string;
  description: string;
  image_url: string;
  ticket_price: number;
  soldCount: number;
  totalTickets: number;
}

export interface Ticket {
  number: string;
  full_name?: string;
  id_card?: string;
  payment_ref?: string;
  bank?: string;
  sender_phone?: string;
  created_at: string;
}
