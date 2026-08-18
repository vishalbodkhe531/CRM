export interface SeededParty {
  id: string;
  name: string;
  contactPerson: string;
  address: string;
  postalCode: string;
  state: string;
}

export const SEEDED_PARTIES: SeededParty[] = [
  {
    id: "party-1",
    name: "ABC Still Pvt. Ltd.",
    contactPerson: "Rahul Sharma",
    address: "123, ABC Colony, MG Road, Pune, Maharashtra",
    postalCode: "411001",
    state: "Maharashtra",
  },
  {
    id: "party-2",
    name: "XYZ Tech Solutions Ltd.",
    contactPerson: "Amit Patel",
    address: "456, Tech Park, Sector V, Salt Lake, Kolkata, West Bengal",
    postalCode: "700091",
    state: "West Bengal",
  },
  {
    id: "party-3",
    name: "Apex Industries",
    contactPerson: "Vikram Singh",
    address: "789, Industrial Area Phase II, Mohali, Punjab",
    postalCode: "160062",
    state: "Punjab",
  },
  {
    id: "party-4",
    name: "Global Trading Corp",
    contactPerson: "Priya Sharma",
    address: "12, Commercial Street, T Nagar, Chennai, Tamil Nadu",
    postalCode: "600017",
    state: "Tamil Nadu",
  },
];

export const STATE_OPTIONS = [
  { value: "Maharashtra", label: "Maharashtra" },
  { value: "West Bengal", label: "West Bengal" },
  { value: "Punjab", label: "Punjab" },
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Karnataka", label: "Karnataka" },
  { value: "Delhi", label: "Delhi" },
  { value: "Gujarat", label: "Gujarat" },
];

export const UNIT_OPTIONS = [
  { value: "Nos", label: "Nos" },
  { value: "Pcs", label: "Pcs" },
  { value: "Box", label: "Box" },
  { value: "Kg", label: "Kg" },
  { value: "Mtr", label: "Mtr" },
];
