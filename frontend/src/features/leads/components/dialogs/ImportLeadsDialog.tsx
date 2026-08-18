import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, AlertCircle, Download } from "lucide-react";
import { useImportLeads } from "../../hooks/useLeadMutations";
import { toast } from "@/utils/toast";

interface ImportLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportLeadFailure = { rowNumber: number; reason: string };
type ImportLeadResult = {
  failed?: ImportLeadFailure[];
  data?: { failed?: ImportLeadFailure[] };
};

const ImportLeadsDialog = ({ open, onOpenChange }: ImportLeadsDialogProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [importErrors, setImportErrors] = useState<ImportLeadFailure[] | null>(null);
  const { mutateAsync: importLeads, isPending } = useImportLeads();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const result = (await importLeads(formData)) as ImportLeadResult;
      const failed = result.failed || result.data?.failed;
      if (failed && failed.length > 0) {
        setImportErrors(failed);
      } else {
        setFile(null);
        setImportErrors(null);
        onOpenChange(false);
      }
    } catch {
      // Handled in hook
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportErrors(null);
    onOpenChange(false);
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "First Name", "Last Name", "Company Name", "Email Address", "Mobile No", 
      "Alternate Mobile No", "Website", "LinkedIn Profile", "Lead Source", 
      "Industry", "Address", "Required description", "ITEM", "Date"
    ];
    
    const demoRow = [
      "John", "Doe", "Acme Corp", "john@acme.com", "9876543210", 
      "", "https://acme.com", "", "WEBSITE", 
      "IT", "123 Main St", "Needs a new software solution", "", "2026-08-17"
    ];

    const csvContent = [
      headers.join(","),
      demoRow.map(cell => `"${cell}"`).join(",")
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", "leads_template.csv");
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg p-6 sm:p-8 max-h-[90vh] flex flex-col">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl">Import Leads</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Upload a CSV or Excel file containing your leads. Maximum allowed file size is 5MB.
            <div className="mt-3">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="text-primary hover:text-primary/80 hover:underline cursor-pointer font-semibold inline-flex items-center gap-1.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
              >
                <Download className="h-4 w-4" /> Download demo template
              </button>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 flex flex-col gap-6">
          {!file ? (
            <div className="group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/25 p-10 transition-colors hover:border-primary/50 hover:bg-primary/5">
              <Upload className="mb-4 h-12 w-12 text-muted-foreground/60 group-hover:text-primary transition-colors" />
              <p className="text-center text-base font-medium text-foreground">
                Click to upload or drag and drop
              </p>
              <p className="mt-1.5 text-center text-sm text-muted-foreground">
                CSV, XLSX (max. 5MB)
              </p>
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                  <p className="text-sm font-medium truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  setImportErrors(null);
                }}
                aria-label="Remove selected import file"
                className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {importErrors && importErrors.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-semibold text-sm">Failed Rows ({importErrors.length})</h3>
              </div>
              <p className="text-xs text-muted-foreground">The following rows were skipped due to errors. Please correct your file and try importing these rows again.</p>
              <div className="max-h-40 overflow-y-auto pr-2 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                {importErrors.map((err, idx) => (
                  <div key={idx} className="flex gap-3 text-sm bg-background/50 rounded-md p-2 border border-destructive/10">
                    <span className="font-medium text-destructive min-w-[50px]">Row {err.rowNumber}</span>
                    <span className="text-muted-foreground">{err.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-4 rounded-xl bg-orange-500/10 p-5 text-orange-600 dark:text-orange-400">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm leading-relaxed flex-1">
              <p className="font-semibold text-orange-700 dark:text-orange-300">Important Notes</p>
              <ul className="mt-2 list-disc pl-4 space-y-1.5 text-orange-600/90 dark:text-orange-400/90">
                <li>Headers must match the required template exactly.</li>
                <li>Invalid entries will be automatically skipped.</li>
              </ul>
            </div>
          </div>

        </div>

        <DialogFooter className="pt-2 mt-auto">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
            className="rounded-full px-6"
          >
            {importErrors ? "Close" : "Cancel"}
          </Button>
          {!importErrors && (
          <Button
            onClick={handleImport}
            disabled={!file || isPending}
            className="rounded-full px-6"
          >
            {isPending ? "Importing..." : "Start Import"}
          </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportLeadsDialog;
