import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";

const ConfirmationPopup = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmar acción",
  message = "¿Estás seguro de que quieres continuar?",
  customBody,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "warning",
  loading = false,
  hideDefaultButtons = false,
  customBodyProps = {},
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    const iconClass = "w-6 h-6";
    switch (type) {
      case "danger":
        return <AlertTriangle className={`${iconClass} text-red-500`} />;
      case "success":
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case "info":
        return <Info className={`${iconClass} text-blue-500`} />;
      default:
        return <AlertTriangle className={`${iconClass} text-yellow-500`} />;
    }
  };

  const getConfirmButtonStyle = () => {
    switch (type) {
      case "danger":
        return "bg-red-500 hover:bg-red-600 active:bg-red-700 text-white";
      case "success":
        return "bg-green-500 hover:bg-green-600 active:bg-green-700 text-white gradient-forest";
      case "info":
        return "bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white";
      default:
        return "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-white";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl border-0 max-w-2xl w-full transform transition-all">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-mint rounded-full flex items-center justify-center">
              {getIcon()}
            </div>
            <h3 className="text-xl font-bold text-deep">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 active:text-gray-800 transition-colors p-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {customBody ? (
            typeof customBody === "function" ? (
              customBody(customBodyProps)
            ) : (
              customBody
            )
          ) : (
            <p className="text-gray-600 text-base leading-relaxed">{message}</p>
          )}
        </div>

        {/* Actions */}
        {!hideDefaultButtons && (
          <div className="flex flex-col space-y-3 p-6 pt-0 sm:flex-row sm:space-y-0 sm:space-x-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-base min-h-12 touch-manipulation"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`flex-1 px-6 py-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base min-h-12 touch-manipulation ${getConfirmButtonStyle()}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Procesando...</span>
                </div>
              ) : (
                confirmText
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfirmationPopup;
