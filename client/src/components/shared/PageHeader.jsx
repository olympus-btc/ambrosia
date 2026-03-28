export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className={`mb-6 ${actions ? "flex items-center justify-between" : ""}`}>
      <div>
        <h1 className="text-4xl font-semibold text-green-900">{title}</h1>
        {subtitle && <p className="text-gray-800 mt-4">{subtitle}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </header>
  );
}
