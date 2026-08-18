import { Button } from "@/components/ui/button";

const HelpFooter = () => {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-border">
      <p className="text-xs text-muted-foreground">App Version: v1.0.0</p>
      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-full px-6">
        Save
      </Button>
    </div>
  );
};

export default HelpFooter;
