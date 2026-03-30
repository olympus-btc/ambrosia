export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className={`mb-6 ${actions ? "flex items-center justify-between" : ""}`}>
      <div>
        <h1 className="text-2xl md:text-4xl font-semibold text-green-900">{title}</h1>
        {subtitle && <p className="text-gray-800 mt-2 md:mt-4 text-sm md:text-base">{subtitle}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </header>
  );
}
