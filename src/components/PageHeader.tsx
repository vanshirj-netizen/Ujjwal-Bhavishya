import CourseSwitcher from "./CourseSwitcher";

interface PageHeaderProps {
  title: string;
}

const PageHeader = ({ title }: PageHeaderProps) => (
  <div className="flex items-center justify-between mb-1">
    <h1
      className="font-display text-lg font-bold truncate mr-3"
      style={{ color: "hsl(var(--foreground))" }}
    >
      {title}
    </h1>
    <CourseSwitcher />
  </div>
);

export default PageHeader;
