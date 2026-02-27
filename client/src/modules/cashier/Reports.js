"use client";
import { useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Spinner,
  Divider,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  addToast } from "@heroui/react";
import {
  BarChart3,
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  Bitcoin,
  Banknote,
  Receipt,
  PieChart,
  Home,
  Lock,
  AlertCircle,
  FileText,
} from "lucide-react";

import {
  getOrders,
  getPaymentMethods,
  getPayments,
  getTickets,
} from "../orders/ordersService";

import { generateReportFromData } from "./cashierService";

export default function Reports() {
  const router = useRouter();
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showCloseTurnModal, setShowCloseTurnModal] = useState(false);

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split("-");
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const formatCurrency = (amount) => new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
  }).format(amount);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError("");

    if (!startDate || !endDate) {
      setError("Debes seleccionar ambas fechas");
      addToast({
        title: "Error",
        description: "Debes seleccionar ambas fechas",
        variant: "solid",
        color: "danger",
      });
      setLoading(false);
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("La fecha de inicio no puede ser mayor a la fecha final");
      addToast({
        title: "Error",
        description: "La fecha de inicio no puede ser mayor a la fecha final",
        variant: "solid",
        color: "danger",
      });
      setLoading(false);
      return;
    }

    try {
      const report = await generateReportFromData(startDate, endDate, {
        tickets,
        orders,
        payments,
        paymentMethods,
      });
      setReportData(report);
      addToast({
        title: "Reporte Generado",
        description: "El reporte se ha generado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (error) {
      console.error(error.message);
      setError("Error al generar el reporte");
      addToast({
        title: "Error",
        description: "No se pudo generar el reporte",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseTurn = () => {
    router.push("/close-turn");
  };

  const setQuickDateRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const [
          ticketsResponse,
          ordersResponse,
          paymentsResponse,
          paymentMethodsResponse,
        ] = await Promise.all([
          getTickets(),
          getOrders(),
          getPayments(),
          getPaymentMethods(),
        ]);

        setTickets(ticketsResponse);
        setOrders(ordersResponse);
        setPaymentMethods(paymentMethodsResponse);
        setPayments(paymentsResponse);

        const report = await generateReportFromData(startDate, endDate, {
          tickets: ticketsResponse,
          orders: ordersResponse,
          payments: paymentsResponse,
          paymentMethods: paymentMethodsResponse,
        });

        setReportData(report);
      } catch (err) {
        console.error(err);
        setError("Error al generar el reporte");
        addToast({
          title: "Error",
          description: "No se pudo cargar la información",
          variant: "solid",
          color: "danger",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endDate, startDate]);

  function getPaymentIcon(method) {
    const m = method?.toLowerCase();
    if (m === "efectivo") return <Banknote className="w-4 h-4" />;
    if (m === "btc" || m === "bitcoin") return <Bitcoin className="w-4 h-4" />;
    if (m === "tarjeta de débito" || m === "debito")
      return <CreditCard className="w-4 h-4" />;
    if (m === "tarjeta de crédito" || m === "credito")
      return <CreditCard className="w-4 h-4" />;
    return <DollarSign className="w-4 h-4" />;
  }

  function getPaymentColor(method) {
    const m = method?.toLowerCase();
    if (m === "efectivo") return "success";
    if (m === "btc" || m === "bitcoin") return "warning";
    if (m === "tarjeta de débito" || m === "debito") return "primary";
    if (m === "tarjeta de crédito" || m === "credito") return "secondary";
    return "default";
  }

  if (loading && !reportData) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardBody className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" color="success" />
            <p className="text-lg font-semibold text-deep mt-4">
              Cargando reportes...
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-fresh p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-6 shadow-lg border-0 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                onPress={() => router.push("/")}
                className="text-forest hover:bg-mint/20"
              >
                <Home className="w-5 h-5 mr-2" />
                Inicio
              </Button>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-deep">
                  Reportes de Ventas
                </h1>
                <p className="text-forest text-sm">
                  Análisis financiero del restaurante
                </p>
              </div>
              <div className="w-20" />
            </div>
          </CardHeader>
        </Card>

        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardBody>
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-600 font-semibold">{error}</p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Selector de Fechas */}
        <Card className="mb-6 shadow-lg border-0 bg-white">
          <CardHeader>
            <h3 className="text-lg font-bold text-deep flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Seleccionar Período
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {/* Botones de acceso rápido */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  color="primary"
                  size="lg"
                  onPress={() => setQuickDateRange(0)}
                  className="h-16"
                >
                  <div className="flex flex-col items-center">
                    <Calendar className="w-5 h-5 mb-1" />
                    <span>Hoy</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  color="primary"
                  size="lg"
                  onPress={() => setQuickDateRange(7)}
                  className="h-16"
                >
                  <div className="flex flex-col items-center">
                    <Calendar className="w-5 h-5 mb-1" />
                    <span>7 días</span>
                  </div>
                </Button>
                <Button
                  variant="outline"
                  color="primary"
                  size="lg"
                  onPress={() => setQuickDateRange(30)}
                  className="h-16"
                >
                  <div className="flex flex-col items-center">
                    <Calendar className="w-5 h-5 mb-1" />
                    <span>30 días</span>
                  </div>
                </Button>
              </div>

              {/* Selectores de fecha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Fecha de Inicio"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  variant="bordered"
                  size="lg"
                  startContent={<Calendar className="w-4 h-4 text-gray-400" />}
                  classNames={{
                    input: "text-base",
                    label: "text-sm font-semibold text-deep",
                  }}
                  disabled={loading}
                />
                <Input
                  type="date"
                  label="Fecha Final"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  variant="bordered"
                  size="lg"
                  startContent={<Calendar className="w-4 h-4 text-gray-400" />}
                  classNames={{
                    input: "text-base",
                    label: "text-sm font-semibold text-deep",
                  }}
                  disabled={loading}
                />
              </div>

              <Button
                onPress={handleGenerateReport}
                variant="solid"
                color="primary"
                size="lg"
                disabled={loading}
                className="w-full gradient-forest text-white h-16"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <Spinner size="sm" color="white" />
                    <span>Generando reporte...</span>
                  </div>
                ) : (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Generar Reporte
                  </>
                )}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Resultados del reporte */}
        {reportData && (
          <div className="space-y-6">
            {/* Resumen General */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <h3 className="text-lg font-bold text-deep flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Resumen General
                </h3>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Período */}
                  <Card className="bg-blue-50 border-blue-200">
                    <CardBody className="text-center p-4">
                      <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-sm text-blue-700 font-medium">
                        Período
                      </p>
                      <p className="text-lg font-bold text-blue-900 mt-1">
                        {formatDate(reportData.startDate)} -{" "}
                        {formatDate(reportData.endDate)}
                      </p>
                    </CardBody>
                  </Card>

                  {/* Balance Total */}
                  <Card className="bg-green-50 border-green-200">
                    <CardBody className="text-center p-4">
                      <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-sm text-green-700 font-medium">
                        Balance Total
                      </p>
                      <p className="text-2xl font-bold text-green-900 mt-1">
                        {formatCurrency(reportData.totalBalance)}
                      </p>
                    </CardBody>
                  </Card>

                  {/* Tickets Total */}
                  <Card className="bg-purple-50 border-purple-200">
                    <CardBody className="text-center p-4">
                      <Receipt className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-sm text-purple-700 font-medium">
                        Total Tickets
                      </p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">
                        {reportData.reports.reduce(
                          (total, day) => total + day.tickets.length,
                          0,
                        )}
                      </p>
                    </CardBody>
                  </Card>
                </div>
              </CardBody>
            </Card>

            {/* Reportes por Día */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <h3 className="text-lg font-bold text-deep flex items-center">
                  <PieChart className="w-5 h-5 mr-2" />
                  Desglose por Día
                </h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-6 max-h-96 overflow-y-auto">
                  {reportData.reports.map((report, idx) => (
                    <Card key={idx} className="border">
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            <h4 className="text-lg font-bold text-deep">
                              {report.date}
                            </h4>
                          </div>
                          <div className="bg-green-100 px-4 py-2 rounded-lg">
                            <p className="text-lg font-bold text-green-700">
                              {formatCurrency(report.balance)}
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardBody>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-forest font-medium">
                              Total de tickets:
                            </span>
                            <span className="font-bold text-deep">
                              {report.tickets.length}
                            </span>
                          </div>

                          <Divider />

                          <div className="space-y-3">
                            <h5 className="font-semibold text-deep flex items-center">
                              <Receipt className="w-4 h-4 mr-2" />
                              Tickets del Día
                            </h5>
                            {report.tickets.length > 0 ? (
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                {report.tickets.map((ticket, i) => (
                                  <Card key={i} className="bg-gray-50 border">
                                    <CardBody className="p-3">
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <p className="font-bold text-deep">
                                            {formatCurrency(ticket.amount)}
                                          </p>
                                          <div className="flex items-center space-x-1 text-sm text-forest">
                                            <Users className="w-3 h-3" />
                                            <span>Por: {ticket.userName}</span>
                                          </div>
                                        </div>
                                        <div
                                          className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium bg-${getPaymentColor(ticket.paymentMethod)}-100 text-${getPaymentColor(ticket.paymentMethod)}-800`}
                                        >
                                          {getPaymentIcon(ticket.paymentMethod)}
                                          <span>{ticket.paymentMethod}</span>
                                        </div>
                                      </div>
                                    </CardBody>
                                  </Card>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-4 text-gray-500">
                                <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <p>No hay tickets para este día</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Botón de cerrar turno */}
        <Card className="shadow-lg border-0 bg-white">
          <CardBody>
            <Button
              onPress={() => setShowCloseTurnModal(true)}
              variant="solid"
              color="danger"
              size="lg"
              className="w-full h-16"
            >
              <Lock className="w-5 h-5 mr-2" />
              Cerrar Turno
            </Button>
          </CardBody>
        </Card>

        {/* Modal de confirmación */}
        <Modal
          isOpen={showCloseTurnModal}
          onClose={() => setShowCloseTurnModal(false)}
        >
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center space-x-2">
                <Lock className="w-5 h-5 text-red-600" />
                <span>Confirmar Cierre de Turno</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <span className="text-deep font-medium">
                    ¿Estás seguro de que quieres cerrar el turno?
                  </span>
                </div>
                <p className="text-forest text-sm">
                  Esta acción finalizará el turno actual y generará un reporte
                  final. Asegúrate de que todas las operaciones del día estén
                  completas.
                </p>
                {reportData && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardBody className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-700 font-medium">
                          Balance del período:
                        </span>
                        <span className="text-blue-900 font-bold">
                          {formatCurrency(reportData.totalBalance)}
                        </span>
                      </div>
                    </CardBody>
                  </Card>
                )}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="outline"
                color="default"
                onPress={() => setShowCloseTurnModal(false)}
              >
                Cancelar
              </Button>
              <Button variant="solid" color="danger" onPress={handleCloseTurn}>
                <Lock className="w-4 h-4 mr-1" />
                Cerrar Turno
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
