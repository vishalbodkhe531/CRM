import {
  ExecutiveStatsDTO,
  ManagerStatsDTO,
  SuperAdminStatsDTO
} from "../../contracts/dashboard";

export const dashboardMapper = {
  toSuperAdminDTO(stats: SuperAdminStatsDTO): SuperAdminStatsDTO {
    return {
      totalUsers: stats.totalUsers,
      totalItems: stats.totalItems,
      totalLeads: stats.totalLeads,
      totalOrganizations: stats.totalOrganizations,
      totalProspects: stats.totalProspects,
      totalQuotations: stats.totalQuotations,
      approvedQuotationRevenue: stats.approvedQuotationRevenue,
      organizationLeadDistribution: stats.organizationLeadDistribution,
      otherOrganizations: stats.otherOrganizations,
      leadTrend: stats.leadTrend,
      recentOrganizations: stats.recentOrganizations,
      organizationStatus: stats.organizationStatus,
    };
  },

  toManagerDTO(stats: ManagerStatsDTO): ManagerStatsDTO {
    return stats;
  },

  toExecutiveDTO(stats: ExecutiveStatsDTO): ExecutiveStatsDTO {
    return stats;
  },
};
