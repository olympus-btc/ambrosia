import React, { useState, useMemo } from "react";

// Componente reutilizable de tabla con paginador
const PaginatedTable = ({
  data = [],
  columns = [],
  title = "",
  subtitle = "",
  initialItemsPerPage = 5,
  itemsPerPageOptions = [5, 10, 15, 20],
  className = "",
  tableClassName = "",
  emptyMessage = "No hay datos disponibles",
  onRowClick = null, // Función que se ejecuta al hacer click en una fila
  rowClickable = false, // Si las filas son clickeables
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  // Calcular datos paginados
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  // Calcular información de paginación
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startItem = data.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, data.length);

  // Reiniciar a la primera página cuando cambian los datos
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  // Funciones de navegación
  const goToFirstPage = () => setCurrentPage(1);
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToLastPage = () => setCurrentPage(totalPages);
  const goToPage = (page) => setCurrentPage(page);

  // Generar números de página para mostrar
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    if (totalPages <= 1) return [1];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, "...");
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push("...", totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return [...new Set(rangeWithDots)]; // Eliminar duplicados
  };

  // Renderizar celda según el tipo de columna
  const renderCell = (item, column) => {
    if (column.render && typeof column.render === "function") {
      return column.render(item[column.key], item);
    }

    const value = column.key.split(".").reduce((obj, key) => obj?.[key], item);
    return value ?? "-";
  };

  // Manejar click en fila
  const handleRowClick = (item) => {
    if (rowClickable && onRowClick && typeof onRowClick === "function") {
      onRowClick(item);
    }
  };

  if (data.length === 0) {
    return (
      <div className={`w-full max-w-6xl mx-auto p-6 ${className}`}>
        <div className="overflow-hidden shadow rounded-lg">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <td className="px-6 py-4 text-center">
                  <div className="text-gray-400 text-lg">{emptyMessage}</div>
                </td>
              </tr>
            </thead>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-6xl mx-auto p-6 ${className}`}>
      {/* Tabla completa con header integrado */}
      <div className="overflow-x-auto shadow rounded-lg">
        <table
          className={`min-w-full divide-y divide-gray-300 ${tableClassName}`}
        >
          {/* Header de la tabla con título y controles */}
          <thead className="bg-gray-50">
            {/* Fila del título y subtítulo */}
            {(title || subtitle) && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-4 bg-white border-b border-gray-200"
                >
                  {title && (
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                      {title}
                    </h2>
                  )}
                  {subtitle && <p className="text-gray-600">{subtitle}</p>}
                </td>
              </tr>
            )}

            {/* Fila de controles */}
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-4 bg-gray-50 border-b border-gray-200"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <label
                      htmlFor="itemsPerPage"
                      className="text-sm font-medium text-gray-700"
                    >
                      Mostrar:
                    </label>
                    <select
                      id="itemsPerPage"
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {itemsPerPageOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm text-gray-700">
                      elementos por página
                    </span>
                  </div>

                  <div className="text-sm text-gray-700">
                    Mostrando {startItem} a {endItem} de {data.length}{" "}
                    resultados
                  </div>
                </div>
              </td>
            </tr>

            {/* Fila de encabezados de columnas */}
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.headerClassName || ""}`}
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>

          {/* Cuerpo de la tabla */}
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.map((item, index) => (
              <tr
                key={item.id || index}
                onClick={() => handleRowClick(item)}
                className={`
                  ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                  ${rowClickable ? "cursor-pointer hover:bg-blue-50 transition-colors duration-150" : ""}
                `}
              >
                {columns.map((column) => (
                  <td
                    key={`${item.id || index}-${column.key}`}
                    className={`px-6 py-4 whitespace-nowrap text-sm ${column.className || "text-gray-900"}`}
                  >
                    {renderCell(item, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

          {/* Footer con paginador */}
          {totalPages > 1 && (
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={columns.length} className="px-6 py-4">
                  <div className="flex items-center justify-center">
                    <div className="flex items-center space-x-2">
                      {/* Botón primera página */}
                      <button
                        onClick={goToFirstPage}
                        disabled={currentPage === 1}
                        className="inline-flex items-center px-2 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="bi bi-chevron-double-left" />
                      </button>

                      {/* Botón página anterior */}
                      <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className="inline-flex items-center px-2 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="bi bi-chevron-left" />
                      </button>

                      {/* Números de página */}
                      <div className="flex space-x-1">
                        {getPageNumbers().map((page, index) => (
                          <React.Fragment key={index}>
                            {page === "..." ? (
                              <span className="px-3 py-2 text-sm text-gray-500">
                                ...
                              </span>
                            ) : (
                              <button
                                onClick={() => goToPage(page)}
                                className={`px-3 py-2 text-sm font-medium rounded-md ${
                                  currentPage === page
                                    ? "bg-blue-600 text-white"
                                    : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                                }`}
                              >
                                {page}
                              </button>
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Botón página siguiente */}
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center px-2 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="bi bi-chevron-right" />
                      </button>

                      {/* Botón última página */}
                      <button
                        onClick={goToLastPage}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center px-2 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="bi bi-chevron-double-right" />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default PaginatedTable;
