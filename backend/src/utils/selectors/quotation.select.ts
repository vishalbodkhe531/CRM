export const quotationListInclude = {
  assignedTo: {
    select: { id: true, firstName: true, lastName: true, email: true, managerId: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  organization: {
    select: {
      id: true,
      name: true,
      prefix: true,
      address: true,
      gstin: true,
      mobile: true,
      email: true,
      companyLogo: true,
      qrCode: true,
      signature: true,
    },
  },
} as const;

export const quotationInclude = {
  ...quotationListInclude,
  deletedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  approvedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  rejectedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  statusHistory: {
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      reason: true,
      changedAt: true,
      changedBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { changedAt: "desc" as const },
  },
} as const;
