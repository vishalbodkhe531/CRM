interface ComingSoonPageProps {
  title: string;
}

const ComingSoonPage = ({ title }: ComingSoonPageProps) => {
  return (
    <div className="flex min-h-80 items-center justify-center">
      <div className="bg-card border border-border rounded-xl px-8 py-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="text-muted-foreground text-sm mt-2">Coming soon</p>
      </div>
    </div>
  );
};

export default ComingSoonPage;
