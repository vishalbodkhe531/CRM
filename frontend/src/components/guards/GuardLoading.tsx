interface GuardLoadingProps {
  message?: string;
}

const GuardLoading = ({
  message = "Checking authentication...",
}: GuardLoadingProps) => {
  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
};

export default GuardLoading;
