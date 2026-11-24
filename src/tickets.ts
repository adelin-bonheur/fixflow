
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from "firebase/firestore";

import { db } from "./firebase";
import { auth } from "./firebase";

// Ticket information
export interface Ticket {
  id?: string;
  title: string;
  description: string;
  status: "Open" | "In Progress" | "Resolved";
  priority: "Low" | "Medium" | "High";
  category: "Hardware" | "Software" | "Network" | "Security";
  userId: string;
  createdAt?: Date;
}

// Create a new ticket
export const createTicket = async (
  ticket: Omit<Ticket, "id" | "userId" | "createdAt">
) => {
  if (!auth.currentUser) {
    throw new Error("You must be logged in to create a ticket.");
  }

  return await addDoc(collection(db, "tickets"), {
    ...ticket,
    userId: auth.currentUser.uid,
    createdAt: new Date()
  });
};

// Get tickets belonging to the logged-in user
export const getTickets = async () => {
  if (!auth.currentUser) {
    throw new Error("You must be logged in to view tickets.");
  }

  const ticketsQuery = query(
    collection(db, "tickets"),
    where("userId", "==", auth.currentUser.uid),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(ticketsQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data()
  })) as Ticket[];
};

// Update a ticket
export const updateTicket = async (
  ticketId: string,
  updates: Partial<Omit<Ticket, "id" | "userId">>
) => {
  if (!auth.currentUser) {
    throw new Error("You must be logged in to update a ticket.");
  }

  const ticketRef = doc(db, "tickets", ticketId);
  return await updateDoc(ticketRef, updates);
};

// Delete a ticket
export const deleteTicket = async (ticketId: string) => {
  if (!auth.currentUser) {
    throw new Error("You must be logged in to delete a ticket.");
  }

  const ticketRef = doc(db, "tickets", ticketId);
  return await deleteDoc(ticketRef);
};
