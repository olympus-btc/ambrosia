export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className={`mb-6 md:flex md:items-center ${actions ? "justify-between" : ""}`}>
      <div>
        <h1 className="text-2xl md:text-4xl font-semibold text-green-900">{title}</h1>
        {subtitle && <p className="text-gray-800 mt-2 md:mt-4 text-sm md:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="mt-3 md:mt-0">{actions}</div>}
    </header>
  );
}
