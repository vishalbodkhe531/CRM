import { Request, Response } from "express";
import { asyncHandler } from "../../utils/middleware/asyncHandler";
import { ApiResponse } from "../../utils/response/response";
import { reportsService } from "./reports.service";
import { ReportFilterSchema } from "../../contracts/validation/report.schemas";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/errors/appError";
import { auditService } from "../audit/audit.service";
import { recordAudit } from "../../utils/audit/recordAudit";

const EXPORT_TYPES = ["lead", "prospect", "quotation", "performance"] as const;

export const reportsController = {
  getReports: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user!;
    const organizationId = req.organizationId!;
    const { exportType, ...filters } = req.query;
    const query = ReportFilterSchema.parse(filters);

    if (exportType) {
      if (typeof exportType !== "string" || !EXPORT_TYPES.includes(exportType as any)) {
        throw AppError.validation.badRequest(
          "Valid exportType (lead, prospect, quotation, performance) is required",
        );
      }

      const csvData = await reportsService.exportCSV(
        user,
        organizationId,
        exportType,
        query,
      );

      logger.info("Exported report to CSV", {
        userId: user.id,
        organizationId,
        type: exportType,
      });

      await recordAudit(req, {
        action: "REPORT_EXPORTED",
        organizationId,
        entityType: "REPORT",
        entityId: exportType,
        after: { filters: query },
      });

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="CRM_${exportType}_report_${new Date().toISOString().split("T")[0]}.csv"`,
      );
      return res.status(200).send(csvData);
    }

    let data;
    if (query.section) {
      data = await reportsService.getReportSection(user, organizationId, query.section, query);
    } else {
      data = await reportsService.getReportsData(user, organizationId, query);
    }

    logger.info("Fetched reports data", { userId: user.id, organizationId, section: query.section });
    return ApiResponse.ok(res, data, "Reports data fetched successfully");
  }),
};
