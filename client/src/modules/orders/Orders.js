"use client";
import { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Tabs,
  Tab,
  Spinner,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Pagination,
  Select,
  SelectItem,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  addToast } from "@heroui/react";
import {
  ClipboardList,
  Plus,
  Eye,
  Clock,
  CheckCircle,
  Users,
  Calendar,
  Home,
  Filter,
  Search,
  AlertCircle,
  Receipt,
} from "lucide-react";

import { useCurrency } from "../../lib/currencyUtils";
import formatDate from "../../lib/formatDate";

import { createOrder, getAllOrders } from "./ordersService";

export default function Orders() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("en-curso");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Hook personalizado para manejar monedas
  const { systemCurrency, formatAmount } = useCurrency();

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const response = await getAllOrders();
        setOrders(response);
      } catch (error) {
        console.error("Error fetching orders:", error);
        setError("Error al cargar las órdenes");
        addToast({
          title: "Error",
          description: "No se pudieron cargar las órdenes",
          variant: "solid",
          color: "danger",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleOrderClick = (pedidoId) => {
    router.push(`/modify-order/${pedidoId}`);
  };

  const handleCreateOrder = async () => {
    try {
      setIsLoading(true);
      const createdOrderId = await createOrder();
      addToast({
        title: "Orden Creada",
        description: "Nueva orden creada exitosamente",
        variant: "solid",
        color: "success",
      });
      router.push(`/modify-order/${createdOrderId.id}?isNew=true`);
    } catch (error) {
      console.error(error.message);
      addToast({
        title: "Error",
        description: "No se pudo crear la orden",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    // Filtro por estado
    const statusMatch =
      filter === "en-curso"
        ? order.status === "open" || order.status === "closed"
        : order.status === "paid";

    // Filtro por búsqueda
    const searchMatch =
      searchTerm === "" ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.waiter?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.table_id?.toLowerCase().includes(searchTerm.toLowerCase());

    return statusMatch && searchMatch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "success";
      case "closed":
        return "warning";
      case "paid":
        return "primary";
      default:
        return "default";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "open":
        return "Abierta";
      case "closed":
        return "Cerrada";
      case "paid":
        return "Pagada";
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "open":
        return <Clock className="w-3 h-3" />;
      case "closed":
        return <AlertCircle className="w-3 h-3" />;
      case "paid":
        return <CheckCircle className="w-3 h-3" />;
      default:
        return <Receipt className="w-3 h-3" />;
    }
  };

  // Componente para mostrar precio formateado
  const FormattedPrice = ({ amount }) => {
    const [formattedPrice, setFormattedPrice] = useState("");

    useEffect(() => {
      async function formatPrice() {
        if (formatAmount) {
          const formatted = await formatAmount(amount);
          setFormattedPrice(formatted);
        } else {
          // Fallback mientras carga la moneda del sistema
          const fallback = new Intl.NumberFormat("es-ES", {
            style: "currency",
            currency: systemCurrency?.baseCurrency?.acronym || "MXN",
          }).format(amount);
          setFormattedPrice(fallback);
        }
      }
      formatPrice();
    }, [amount]);

    return (
      <span
        className={`font-semibold ${amount > 0 ? "text-green-600" : "text-gray-400"}`}
      >
        {formattedPrice || "..."}
      </span>
    );
  };

  // Paginación
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage);
  const startIndex = (page - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  if (isLoading && orders.length === 0) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardBody className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" color="success" />
            <p className="text-lg font-semibold text-deep mt-4">
              Cargando órdenes...
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
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-2">
                  <ClipboardList className="w-6 h-6 text-orange-600" />
                </div>
                <h1 className="text-2xl font-bold text-deep">
                  Gestión de Órdenes
                </h1>
                <p className="text-forest text-sm">
                  {orders.length} {orders.length === 1 ? "orden" : "órdenes"}{" "}
                  totales
                </p>
              </div>
              <Button
                variant="solid"
                color="primary"
                size="lg"
                onPress={() => setShowCreateModal(true)}
                className="gradient-forest text-white"
                disabled={isLoading}
              >
                <Plus className="w-5 h-5 mr-2" />
                Nueva Orden
              </Button>
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

        {/* Controles y Filtros */}
        <Card className="mb-6 shadow-lg border-0 bg-white">
          <CardBody>
            <div className="space-y-4">
              {/* Búsqueda */}
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="Buscar por ID, mesero o mesa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  variant="bordered"
                  size="lg"
                  startContent={<Search className="w-4 h-4 text-gray-400" />}
                  classNames={{
                    input: "text-base",
                  }}
                  className="flex-1"
                />
                <Select
                  aria-label="Rows per page"
                  placeholder="Filas por página"
                  selectedKeys={[rowsPerPage.toString()]}
                  onSelectionChange={(keys) => {
                    const value = Array.from(keys)[0];
                    setRowsPerPage(parseInt(value));
                    setPage(1);
                  }}
                  variant="bordered"
                  size="lg"
                  className="w-full md:w-48"
                >
                  <SelectItem key="5" value="5">
                    5 filas
                  </SelectItem>
                  <SelectItem key="10" value="10">
                    10 filas
                  </SelectItem>
                  <SelectItem key="20" value="20">
                    20 filas
                  </SelectItem>
                  <SelectItem key="50" value="50">
                    50 filas
                  </SelectItem>
                </Select>
              </div>

              {/* Tabs de filtros */}
              <Tabs
                selectedKey={filter}
                onSelectionChange={setFilter}
                variant="underlined"
                classNames={{
                  tabList:
                    "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                  cursor: "w-full bg-forest",
                  tab: "max-w-fit px-6 py-3 h-12",
                  tabContent: "group-data-[selected=true]:text-forest",
                }}
              >
                <Tab
                  key="en-curso"
                  title={(
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>En Curso</span>
                      <div className="bg-orange-100 text-orange-800 rounded-full px-2 py-0.5 text-xs font-medium">
                        {
                          orders.filter(
                            (o) => o.status === "open" || o.status === "closed",
                          ).length
                        }
                      </div>
                    </div>
                  )}
                />
                <Tab
                  key="pagados"
                  title={(
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Pagadas</span>
                      <div className="bg-green-100 text-green-800 rounded-full px-2 py-0.5 text-xs font-medium">
                        {orders.filter((o) => o.status === "paid").length}
                      </div>
                    </div>
                  )}
                />
              </Tabs>
            </div>
          </CardBody>
        </Card>

        {/* Tabla de Órdenes */}
        <Card className="shadow-lg border-0 bg-white">
          <CardHeader>
            <h3 className="text-lg font-bold text-deep flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              {filter === "en-curso" ? "Órdenes en Curso" : "Órdenes Pagadas"}(
              {filteredOrders.length})
            </h3>
          </CardHeader>
          <CardBody>
            {filteredOrders.length > 0 ? (
              <div className="space-y-4">
                <Table
                  aria-label="Tabla de órdenes"
                  classNames={{
                    wrapper: "min-h-[400px]",
                  }}
                >
                  <TableHeader>
                    <TableColumn className="bg-gray-50 text-forest font-semibold">
                      ID
                    </TableColumn>
                    <TableColumn className="bg-gray-50 text-forest font-semibold">
                      MESERO
                    </TableColumn>
                    <TableColumn className="bg-gray-50 text-forest font-semibold">
                      MESA
                    </TableColumn>
                    <TableColumn className="bg-gray-50 text-forest font-semibold">
                      ESTADO
                    </TableColumn>
                    <TableColumn className="bg-gray-50 text-forest font-semibold">
                      TOTAL
                    </TableColumn>
                    <TableColumn className="bg-gray-50 text-forest font-semibold">
                      FECHA
                    </TableColumn>
                    <TableColumn className="bg-gray-50 text-forest font-semibold">
                      ACCIONES
                    </TableColumn>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrders.map((order) => (
                      <TableRow key={order.id} className="hover:bg-gray-50">
                        <TableCell>
                          <span className="font-mono text-sm text-gray-700">
                            {order.id.substring(0, 8)}...
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-deep">
                              {order.waiter || "Sin asignar"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.table_id ? (
                            <span className="font-mono text-sm text-gray-600">
                              {order.table_id.substring(0, 8)}...
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">
                              Sin mesa
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            color={getStatusColor(order.status)}
                            variant="flat"
                            startContent={getStatusIcon(order.status)}
                            size="sm"
                          >
                            {getStatusText(order.status)}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <FormattedPrice amount={order.total} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(order.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            color="primary"
                            size="sm"
                            onPress={() => handleOrderClick(order.id)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Paginación */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <Pagination
                      total={totalPages}
                      page={page}
                      onChange={setPage}
                      color="primary"
                      showControls
                      showShadow
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-deep mb-2">
                  No hay órdenes{" "}
                  {filter === "en-curso" ? "en curso" : "pagadas"}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm
                    ? "No se encontraron órdenes que coincidan con tu búsqueda"
                    : filter === "en-curso"
                      ? "Las órdenes activas aparecerán aquí"
                      : "Las órdenes completadas aparecerán aquí"}
                </p>
                {filter === "en-curso" && (
                  <Button
                    variant="solid"
                    color="primary"
                    onPress={() => setShowCreateModal(true)}
                    className="gradient-forest text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primera Orden
                  </Button>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Modal de Confirmación */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        >
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-forest" />
                <span>Crear Nueva Orden</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                  <span className="text-deep font-medium">
                    ¿Deseas crear una nueva orden?
                  </span>
                </div>
                <p className="text-forest text-sm">
                  Se creará una nueva orden vacía que podrás gestionar desde el
                  panel de edición. Podrás asignar mesa, agregar platillos y
                  gestionar el estado de la orden.
                </p>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="outline"
                color="default"
                onPress={() => setShowCreateModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="solid"
                color="primary"
                onPress={() => {
                  setShowCreateModal(false);
                  handleCreateOrder();
                }}
                disabled={isLoading}
                className="gradient-forest text-white"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Spinner size="sm" color="white" />
                    <span>Creando...</span>
                  </div>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    Crear Orden
                  </>
                )}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
