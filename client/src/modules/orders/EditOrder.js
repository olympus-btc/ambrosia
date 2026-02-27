"use client";
import { useCallback, useEffect, useState } from "react";

const STATUS_CONFIG = {
  pending: {
    text: "Pendiente",
    color: "warning",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300",
  },
  sent: {
    text: "Enviado",
    color: "primary",
    className: "bg-blue-100 text-blue-800 border-blue-300",
  },
  in_progress: {
    text: "En Proceso",
    color: "secondary",
    className: "bg-purple-100 text-purple-800 border-purple-300",
  },
  completed: {
    text: "Completado",
    color: "success",
    className: "bg-green-100 text-green-800 border-green-300",
  },
  cancelled: {
    text: "Cancelado",
    color: "danger",
    className: "bg-red-100 text-red-800 border-red-300",
  },
};
import { useRouter } from "next/navigation";

import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  Divider,
  Chip,
  Input,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  addToast } from "@heroui/react";
import {
  ChefHat,
  ArrowLeft,
  Plus,
  Minus,
  ShoppingCart,
  CreditCard,
  Users,
  Utensils,
  Bitcoin,
  Receipt,
  CheckCircle,
  Send,
  FileText,
  Trash2,
  Lock,
} from "lucide-react";
import { QRCode } from "react-qr-code";

import ConfirmationPopup from "../../components/ConfirmationPopup";
import LoadingCard from "../../components/LoadingCard";
import VirtualKeyboard from "../../components/VirtualKeyboard";
import BitcoinPriceService from "../../services/bitcoinPriceService";
import { createInvoice } from "@/services/walletService";
import { getCategories, getDishes } from "../dishes/dishesService";

import {
  addDishToOrder,
  addPaymentToTicket,
  createPayment,
  createTicket,
  getDishesByOrder,
  getOrderById,
  getPaymentCurrencies,
  getPaymentMethods,
  getTables,
  removeDishToOrder,
  updateOrder,
  updateOrderDish,
  updateTable,
} from "./ordersService";

const priceService = new BitcoinPriceService();

export default function EditOrder({ dynamicParams }) {
  const pedidoId = dynamicParams?.pedidoId;
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  //const [undoStack, setUndoStack] = useState([]);
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [generatedCashInfo, setGeneratedCashInfo] = useState(null);
  const [cashReceived, setCashReceived] = useState("");
  //const [showCurrencyDialog, setShowCurrencyDialog] = useState(false);
  const [showPaymentMethodDialog, setShowPaymentMethodDialog] = useState(false);
  //const [selectedCurrency, setSelectedCurrency] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("");
  //const [ticketId, setTicketId] = useState(null);
  const [orderDishes, setOrderDishes] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  //const [paymentCurrencies, setPaymentCurrencies] = useState([]);
  const [selectedDishForEdit, setSelectedDishForEdit] = useState(null);
  const [dishNotes, setDishNotes] = useState("");
  const [dishShouldPrepare, setDishShouldPrepare] = useState(true);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [dishQuantities, setDishQuantities] = useState({});
  const {
    isOpen: isEditDishOpen,
    onClose: onEditDishClose,
  } = useDisclosure();

  const getPaymentIcon = (name) => {
    if (name.toLowerCase().includes("efectivo")) return "💵";
    if (name.toLowerCase().includes("crédito")) return "💳";
    if (name.toLowerCase().includes("débito")) return "🏧";
    if (name.toLowerCase().includes("btc")) return "₿";
    return "💰";
  };

  const fetchOrderDishes = useCallback(async () => {
    try {
      await getDishesByOrder(pedidoId);
    } catch (err) {
      console.error(err);
    } finally {
    }
  }, [pedidoId]);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [
          orderResponse,
          dishesResponse,
          categoriesResponse,
          orderDishesResponse,
          paymentMethodsResponse,
          //paymentCurrenciesResponse,
        ] = await Promise.all([
          getOrderById(pedidoId),
          getDishes(),
          getCategories(),
          getDishesByOrder(pedidoId),
          getPaymentMethods(),
          getPaymentCurrencies(),
        ]);
        setOrder(orderResponse);
        setDishes(dishesResponse);
        setCategories(categoriesResponse);
        setSelectedCategory(categoriesResponse[0] || "");
        setOrderDishes(orderDishesResponse || []);
        setPaymentMethods(paymentMethodsResponse);
        //setPaymentCurrencies(paymentCurrenciesResponse);
      } catch (err) {
        console.error(err);
        setError("Error al cargar el pedido");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
    fetchOrderDishes();
  }, [pedidoId, fetchOrderDishes]);

  useEffect(() => {
    if (order) fetchOrderDishes();
  }, [order, fetchOrderDishes]);

  /*const handleAddDish = async (dish) => {
    if (order.status !== "open") return;
    setIsLoading(true);
    try {
      await addDishToOrder(pedidoId, dish.id, dish.price);
      const orderResponse = await getOrderById(order.id);
      const dishesResponse = await getDishesByOrder(pedidoId);
      setOrderDishes(dishesResponse);
      setOrder(orderResponse);
    } catch (err) {
      setError("Error al agregar el platillo");
    } finally {
      setIsLoading(false);
    }
  };*/

  const handleRemoveDish = async (instance) => {
    const instanceId = instance.id;
    if (!instanceId) return;
    if (instance.status !== "pending") {
      addToast({
        color: "warning",
        description: "Solo se pueden eliminar platillos pendientes",
      });
      return;
    }

    setIsLoading(true);
    try {
      await removeDishToOrder(pedidoId, instanceId);
      const orderResponse = await getOrderById(pedidoId);
      const orderDishesResponse = await getDishesByOrder(pedidoId);
      setOrderDishes(orderDishesResponse);
      setOrder(orderResponse);
    } catch (err) {
      console.error(err);
      setError("Error al eliminar el platillo");
    } finally {
      setIsLoading(false);
    }
  };

  /*const handleUndo = async () => {
    if (undoStack.length === 0) return;
    const previousDishes = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));
    setIsLoading(true);
    try {
      const response = await updateOrder(pedidoId, { dishes: previousDishes });
      setOrder(response.data);
    } catch (err) {
      setError("Error al deshacer la acción");
    } finally {
      setIsLoading(false);
    }
  };*/

  const handleSendDishes = async () => {
    const pendingDishes = orderDishes.filter(
      (dish) => dish.status === "pending",
    );
    if (pendingDishes.length === 0) {
      addToast({
        color: "warning",
        description: "No hay platillos pendientes para enviar",
      });
      return;
    }

    setIsLoading(true);
    try {
      pendingDishes.map(
        async (dish) => await updateOrderDish(pedidoId, dish.id, {
          ...dish,
          status: dish.status === "pending" ? "sent" : dish.status,
        }),
      );
      const orderResponse = await getOrderById(pedidoId);
      const orderDishesResponse = await getDishesByOrder(pedidoId);
      setOrder(orderResponse);
      setOrderDishes(orderDishesResponse);

      addToast({
        color: "success",
        description: `${pendingDishes.length} platillos enviados a cocina`,
      });
    } catch (err) {
      console.error(err);
      setError("Error al enviar platillos");
      addToast({
        color: "danger",
        description: "Error al enviar platillos a cocina",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /*const handleOpenEditDish = (dish) => {
    setSelectedDishForEdit(dish);
    setDishNotes(dish.notes || "");
    setDishShouldPrepare(dish.should_prepare !== false);
    onEditDishOpen();
  };*/

  const handleOpenKeyboard = (dish) => {
    if (dish.status !== "pending") {
      addToast({
        color: "warning",
        description: "Solo se pueden editar platillos pendientes",
      });
      return;
    }
    setSelectedDishForEdit(dish);
    setDishNotes(dish.notes || "");
    setShowKeyboard(true);
  };

  const handleCloseKeyboard = (finalText = null) => {
    setShowKeyboard(false);
    if (selectedDishForEdit && finalText !== null) {
      // Solo actualizar si se pasó texto final (cuando se acepta)
      handleUpdateDishNotes(
        selectedDishForEdit.id,
        finalText,
        selectedDishForEdit.should_prepare !== false,
        false,
      );
    }
  };

  const handleQuantityChange = (dishId, change) => {
    setDishQuantities((prev) => ({
      ...prev,
      [dishId]: Math.max(0, (prev[dishId] || 1) + change),
    }));
  };

  const handleAddMultipleDishes = async (dish, quantity) => {
    if (order.status == "paid") {
      addToast({
        description: "No se puede agregar platillos a un pedido pagado",
        color: "danger",
      });
      return;
    }
    setIsLoading(true);
    try {
      // Agregar platillos uno por uno ya que el servidor solo permite uno a la vez
      for (let i = 0; i < quantity; i++) {
        await addDishToOrder(pedidoId, dish.id, dish.price);
      }

      const orderResponse = await getOrderById(pedidoId);
      const orderDishesResponse = await getDishesByOrder(pedidoId);
      setOrder(orderResponse);
      setOrderDishes(orderDishesResponse);

      addToast({
        color: "success",
        description: `${quantity} ${dish.name} agregados al pedido`,
      });
    } catch (err) {
      console.error(err);
      setError("Error al agregar platillos");
      addToast({
        color: "danger",
        description: "Error al agregar platillos al pedido",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDishNotes = async (
    dishId,
    notes,
    shouldPrepare,
    closeModal = true,
  ) => {
    const currentDish = orderDishes.find((d) => d.id === dishId);
    if (!currentDish) {
      addToast({
        color: "danger",
        description: "Platillo no encontrado",
      });
      return;
    }

    if (currentDish.status !== "pending") {
      addToast({
        color: "warning",
        description: "Solo se pueden editar platillos pendientes",
      });
      return;
    }

    setIsLoading(true);
    try {
      const orderDishUpdate = {
        id: currentDish.id,
        order_id: currentDish.order_id,
        dish_id: currentDish.dish_id,
        price_at_order: currentDish.price_at_order,
        notes: notes || null,
        status: currentDish.status,
        should_prepare: shouldPrepare,
      };

      await updateOrderDish(pedidoId, dishId, orderDishUpdate);
      const orderDishesResponse = await getDishesByOrder(pedidoId);
      setOrderDishes(orderDishesResponse);

      if (closeModal) {
        onEditDishClose();
      }

      addToast({
        color: "success",
        description: "Platillo actualizado correctamente",
      });
    } catch (err) {
      console.error(err);
      setError("Error al actualizar el platillo");
      addToast({
        color: "danger",
        description: "Error al actualizar el platillo",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDishEdit = () => {
    if (selectedDishForEdit) {
      handleUpdateDishNotes(
        selectedDishForEdit.id,
        dishNotes,
        dishShouldPrepare,
      );
    }
  };

  const handleChangeOrderStatus = async (newStatus) => {
    setIsLoading(true);
    setError("");
    try {
      order.status = newStatus;
      await updateOrder(order);
      const response = await getOrderById(pedidoId);
      setOrder(response);
      if (newStatus === "paid") {
        const tables = await getTables();
        const table = tables.find((t) => t.order_id === pedidoId);
        if (table) {
          await updateTable(table);
        }
        router.push("/all-orders");
      }
    } catch (err) {
      console.error(err);
      setError("Error al cambiar el estado del pedido");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPaymentMethod = async () => {
    if (!selectedPaymentMethod) {
      setError("Por favor, selecciona un método de pago ");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const total = order.total;
      const currencyBase = await apiClient(`/base-currency`);
      const ticket = {
        order_id: order.id,
        user_id: order.user_id,
        ticket_date: Date.now().toString(),
        status: 1,
        total_amount: total,
        notes: "Sin Notas",
      };

      const ticketResponse = await createTicket(ticket);
      const payment = {
        method_id: selectedPaymentMethod,
        currency_id: currencyBase.currency_id,
        transaction_id: "",
        amount: total,
      };

      const paymentResponse = await createPayment(payment);
      await addPaymentToTicket(
        ticketResponse.id,
        paymentResponse.id,
      );

      const paymentMethodData = await apiClient(
        `/payments/methods/${selectedPaymentMethod}`,
      );
      if (paymentMethodData.name === "Efectivo") {
        const cashInfo = {
          order_id: order.id,
          total_amount: total,
          currency: currencyBase.currency_id,
        };
        setGeneratedCashInfo(cashInfo);
        return;
      }

      if (paymentMethodData.name === "BTC") {
        const currencyBaseData = await apiClient(
          `/payments/currencies/${currencyBase.currency_id}`,
        );
        const currencyAcronym = currencyBaseData.acronym.toLowerCase();

        const priceConverted = await priceService.fiatToSatoshis(
          total,
          currencyAcronym,
        );

        const invoice = await createInvoice(priceConverted, order.id);

        setCreatedInvoice(invoice);
        setShowPaymentMethodDialog(false);
        return;
      }

      await handleChangeOrderStatus("paid");
      setShowPaymentMethodDialog(false);
    } catch (err) {
      console.error("Error en handleConfirmPaymentMethod:", err);
      setError(`Error al cerrar el pedido: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentConfirm = async () => {
    await handleChangeOrderStatus("paid");
    setCreatedInvoice(null);
  };

  const handlePaymentCancel = () => {
    setCreatedInvoice(null);
  };

  const handleCancelDialog = () => {
    setShowCurrencyDialog(false);
    setShowPaymentMethodDialog(false);
    setSelectedPaymentMethod("");
  };

  const filteredDishes = dishes.filter(
    (dish) => dish.category_id === selectedCategory.id,
  );

  if (isLoading && !order) {
    return <LoadingCard message="Cargando pedido..." />;
  }

  if (error && !order) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <ChefHat className="w-8 h-8 text-red-600" />
            </div>
          </CardHeader>
          <CardBody className="text-center">
            <h2 className="text-xl font-bold text-deep mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <Button
              variant="outline"
              color="primary"
              onPress={() => router.push("/rooms")}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Espacios
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  /*const handleCurrencySelect = (currencyId) => {
    setSelectedCurrency(currencyId);
    setShowCurrencyDialog(false);
    setShowPaymentMethodDialog(true);
  };*/

  const handlePaymentMethodSelect = (methodId) => {
    setSelectedPaymentMethod(methodId);
  };

  return (
    <div className="min-h-screen gradient-fresh p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Card className="mb-6 shadow-lg border-0 bg-white">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                onPress={() => router.push("/rooms")}
                className="text-forest hover:bg-mint/20"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Volver
              </Button>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-mint rounded-full flex items-center justify-center mb-2">
                  <Receipt className="w-6 h-6 text-forest" />
                </div>
                <h1 className="text-xl font-bold text-deep">
                  Pedido #{pedidoId.substring(0, 8)}
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    <Users className="w-3 h-3 mr-1" />
                    {order?.waiter || "Mesero"}
                  </div>
                  <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                    $ {order?.total ? order.total.toFixed(2) : "0.00"}
                  </div>
                </div>
              </div>
              <div className="w-20" />
            </div>
          </CardHeader>
        </Card>

        {error && (
          <Card className="mb-6 bg-red-50 border-red-200">
            <CardBody>
              <p className="text-red-600 text-center font-semibold">{error}</p>
            </CardBody>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de Menú */}
          <div className="space-y-6">
            {/* Categorías */}
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <h3 className="text-lg font-bold text-deep flex items-center">
                  <Utensils className="w-5 h-5 mr-2" />
                  Categorías
                </h3>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={
                        selectedCategory === category ? "solid" : "outline"
                      }
                      color="primary"
                      size="lg"
                      onPress={() => setSelectedCategory(category)}
                      disabled={isLoading}
                      className={`h-16 ${selectedCategory === category ? "gradient-forest text-white" : ""}`}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Platillos */}
            {selectedCategory && (
              <Card className="shadow-lg border-0 bg-white">
                <CardHeader>
                  <h3 className="text-lg font-bold text-deep">
                    Platillos - {selectedCategory.name}
                  </h3>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {filteredDishes.map((dish) => {
                      const quantity = dishQuantities[dish.id] || 1;
                      return (
                        <Card
                          key={dish.id}
                          className="border hover:shadow-md transition-shadow"
                        >
                          <CardBody className="p-4">
                            <div className="flex flex-col space-y-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-deep">
                                  {dish.name}
                                </span>
                                <span className="text-forest text-sm">
                                  ${dish.price.toFixed(2)}
                                </span>
                              </div>

                              {/* Selector de cantidad */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center space-x-3">
                                  <Button
                                    isIconOnly
                                    size="lg"
                                    variant="ghost"
                                    onPress={() => handleQuantityChange(dish.id, -1)
                                    }
                                    isDisabled={quantity <= 1}
                                    className="h-12 w-12"
                                  >
                                    <Minus className="w-6 h-6" />
                                  </Button>
                                  <span className="min-w-12 text-center font-bold text-lg">
                                    {quantity}
                                  </span>
                                  <Button
                                    isIconOnly
                                    size="lg"
                                    variant="ghost"
                                    onPress={() => handleQuantityChange(dish.id, 1)
                                    }
                                    className="h-12 w-12"
                                  >
                                    <Plus className="w-6 h-6" />
                                  </Button>
                                </div>

                                <Button
                                  size="lg"
                                  color="primary"
                                  onPress={() => handleAddMultipleDishes(dish, quantity)
                                  }
                                  className="font-semibold h-12"
                                >
                                  Agregar
                                </Button>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
          {/* Panel de Pedido */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-white">
              <CardHeader>
                <h3 className="text-lg font-bold text-deep flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Platillos Pedidos
                </h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {orderDishes.length > 0 ? (
                    orderDishes.map((item) => {
                      const dish = dishes.find((d) => d.id === item.dish_id);
                      return (
                        <Card
                          key={item.id}
                          className="border w-full overflow-auto"
                        >
                          <CardBody className="p-4">
                            <div className="space-y-3">
                              {/* Información básica del platillo */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-deep text-lg">
                                    {dish?.name}
                                  </h4>
                                  <p className="text-forest text-sm">
                                    ${dish?.price.toFixed(2)}
                                  </p>
                                  {/* Notas - Siempre visibles y editables */}
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-gray-700">
                                        Notas especiales:
                                      </span>
                                    </div>
                                    <p
                                      onClick={() => handleOpenKeyboard(item)}
                                      className="text-forest text-sm hover:bg-gray-200 border rounded-2xl px-4 py-1 w-fit truncate"
                                    >
                                      📝{" "}
                                      {item.notes
                                        ? item.notes
                                        : "Sin notas especiales"}
                                    </p>
                                  </div>
                                  <Chip
                                    className={`text-sm mt-2 ${STATUS_CONFIG[item.status]?.className || "bg-gray-100 text-gray-800 border-gray-300"}`}
                                    color={
                                      STATUS_CONFIG[item.status]?.color ||
                                      "default"
                                    }
                                  >
                                    {STATUS_CONFIG[item.status]?.text ||
                                      item.status}
                                  </Chip>
                                </div>

                                {/* Switch de preparar - Siempre visible */}
                                <div className="flex flex-col items-end gap-2">
                                  <div className="text-end">
                                    {/* Advertencia para platillos no editables */}
                                    {item.status !== "pending" ? (
                                      <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded-lg border border-orange-200">
                                        <Lock />
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="text-xs text-gray-600 text-right">
                                          Preparar despues
                                        </div>
                                        <Switch
                                          isSelected={
                                            item.should_prepare !== false
                                          }
                                          onValueChange={(value) => handleUpdateDishNotes(
                                            item.id,
                                            item.notes,
                                            value,
                                            false,
                                          )
                                          }
                                          size="lg"
                                          isDisabled={item.status !== "pending"}
                                          className="mt-2"
                                        />
                                      </div>
                                    )}
                                  </div>
                                  {/* Botón de eliminar - Solo para pending */}
                                  {item.status === "pending" &&
                                    order &&
                                    order.status === "open" && (
                                      <div>
                                        <Button
                                          color="danger"
                                          variant="ghost"
                                          onPress={() => handleRemoveDish(item)}
                                          size="md"
                                          isIconOnly
                                        >
                                          <Trash2 />
                                        </Button>
                                      </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="text-center py-8">
                      <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">
                        No hay platillos seleccionados
                      </p>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>

            {/* Acciones */}
            <Card className="shadow-lg border-0 bg-white">
              <CardBody>
                <div className="space-y-4">
                  {order?.status === "open" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button
                        variant="ghost"
                        color="primary"
                        size="lg"
                        onPress={() => {
                          if (
                            orderDishes.some(
                              (dish) => dish.status === "pending",
                            )
                          ) {
                            addToast({
                              color: "warning",
                              description:
                                "El pedido no puede ser cerrado porque hay platillos sin enviar a cocina",
                            });
                            return;
                          }
                          setShowPaymentMethodDialog(true);
                        }}
                        disabled={isLoading}
                        className="h-14"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Cerrar Pedido
                      </Button>
                      {orderDishes.some(
                        (dish) => dish.status === "pending",
                      ) && (
                      <Button
                        variant="bordered"
                        color="warning"
                        size="lg"
                        onPress={handleSendDishes}
                        className="h-14"
                        startContent={<Send className="w-6 h-6" />}
                      >
                        Enviar a Cocina
                      </Button>
                      )}
                    </div>
                  )}

                  {order?.status === "paid" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Button
                        variant="outline"
                        color="primary"
                        size="lg"
                        onPress={() => handleChangeOrderStatus("open")}
                        disabled={isLoading}
                        className="h-14"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Reabrir Pedido
                      </Button>
                      <Button
                        variant="solid"
                        color="success"
                        size="lg"
                        onPress={() => setShowPaymentMethodDialog(true)}
                        disabled={isLoading}
                        className="gradient-forest text-white h-14"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Procesar Pago
                      </Button>
                    </div>
                  )}

                  {/* Status Badge */}
                  <Divider />
                  <div className="text-center">
                    <div
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${order?.status === "open"
                        ? "bg-yellow-100 text-yellow-800"
                        : order?.status === "closed"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                        }`}
                    >
                      Estado:{" "}
                      {order?.status === "open"
                        ? "Abierto"
                        : order?.status === "closed"
                          ? "Cerrado"
                          : "Pagado"}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        {/* Modal de Método de Pago */}
        <ConfirmationPopup
          isOpen={showPaymentMethodDialog}
          title="Seleccionar Método de Pago"
          hideDefaultButtons
          type="info"
          customBody={(
            <div className="space-y-6">
              {/* Grid de métodos de pago */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    className={`group relative py-6 px-6 rounded-xl border-2 transition-all duration-200 touch-manipulation ${selectedPaymentMethod === method.id
                      ? "border-green-500 bg-green-50 shadow-lg scale-105"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md hover:scale-102"
                      }`}
                    onClick={() => handlePaymentMethodSelect(method.id)}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className={`text-3xl transition-transform group-hover:scale-110 ${selectedPaymentMethod === method.id
                          ? "transform scale-110"
                          : ""
                          }`}
                      >
                        {getPaymentIcon(method.name)}
                      </div>
                      <span
                        className={`font-semibold text-lg ${selectedPaymentMethod === method.id
                          ? "text-green-700"
                          : "text-gray-700"
                          }`}
                      >
                        {method.name}
                      </span>
                    </div>

                    {/* Indicador de selección */}
                    {selectedPaymentMethod === method.id && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button
                  className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors font-medium touch-manipulation"
                  onClick={handleCancelDialog}
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 py-3 px-6 bg-green-500 text-white rounded-lg hover:bg-green-600 active:bg-green-700 transition-colors font-medium touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed gradient-forest"
                  onClick={handleConfirmPaymentMethod}
                  disabled={!selectedPaymentMethod || isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </div>
                  ) : (
                    "Confirmar Pago"
                  )}
                </button>
              </div>
            </div>
          )}
          onClose={handleCancelDialog}
        />
        {/* Modal de Pago Efectivo */}
        {/* Modal de Pago Efectivo */}
        {generatedCashInfo && (
          <ConfirmationPopup
            isOpen={!!generatedCashInfo}
            title="Pago en Efectivo"
            hideDefaultButtons
            type="info"
            customBody={(
              <div className="flex flex-col items-center space-y-6">
                {/* Header */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💵</span>
                  </div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    Ingresa el monto recibido en efectivo
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Calcularemos el cambio a devolver al cliente
                  </p>
                </div>

                {/* Información del monto */}
                <div className="bg-gray-50 rounded-lg p-4 w-full text-center">
                  <p className="text-sm text-gray-600">Monto total del pedido</p>
                  <p className="text-2xl font-bold text-gray-800">
                    ${order?.total?.toFixed(2) || "0.00"}
                  </p>
                </div>

                {/* Input para el efectivo recibido */}
                <div className="w-full">
                  <label className="block text-sm text-gray-600 mb-2">
                    Efectivo recibido
                  </label>
                  <input
                    type="text"
                    value={cashReceived}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*\.?\d*$/.test(value)) {
                        setCashReceived(value);
                      }
                    }}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-center"
                  />
                  {cashReceived && (
                    <p className="text-sm text-gray-600 mt-2">
                      Cambio a devolver: <span className="font-bold">
                        ${(cashReceived ? (parseFloat(cashReceived) - order.total).toFixed(2) : "0.00")}
                      </span>
                    </p>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-4 w-full pt-2">
                  <button
                    className="flex-1 py-4 px-6 border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-300 active:bg-red-100 transition-all font-semibold touch-manipulation"
                    onClick={handlePaymentCancel}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>❌</span>
                      <span>Cancelar</span>
                    </div>
                  </button>
                  <button
                    className="flex-1 py-4 px-6 bg-green-500 text-white rounded-xl hover:bg-green-600 active:bg-green-700 transition-all font-semibold touch-manipulation"
                    onClick={() => {
                      if (parseFloat(cashReceived) >= order.total) {
                        alert(`Payment confirmed! Change to give: $${(parseFloat(cashReceived) - order.total).toFixed(2)}`);
                        handlePaymentConfirm();
                      } else {
                        alert("Insufficient cash received!");
                      }
                    }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>Confirmar Pago</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
            onClose={handleCancelDialog}
          />
        )}

        {/* Modal de Pago Bitcoin */}
        {createdInvoice && (
          <ConfirmationPopup
            isOpen={!!createdInvoice}
            title="Pago con Bitcoin"
            hideDefaultButtons
            type="info"
            customBody={(
              <div className="flex flex-col items-center space-y-6">
                {/* Header con ícono */}
                <div className="text-center">
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bitcoin className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-deep mb-2">
                    Solicita al cliente que escanee el código QR
                  </h4>
                  <p className="text-gray-600 text-sm">
                    El cliente debe usar su billetera Bitcoin para completar el
                    pago
                  </p>
                </div>

                {/* QR Code con marco elegante */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                  <QRCode
                    value={createdInvoice?.serialized || ""}
                    size={220}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  />
                </div>

                {/* Información del monto */}
                <div className="bg-gray-50 rounded-lg p-4 w-full text-center">
                  <p className="text-sm text-gray-600">
                    Monto total del pedido
                  </p>
                  <p className="text-2xl font-bold text-deep">
                    ${order?.total?.toFixed(2) || "0.00"}
                  </p>
                </div>

                {/* Botones de acción mejorados */}
                <div className="flex gap-4 w-full pt-2">
                  <button
                    className="flex-1 py-4 px-6 border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-300 active:bg-red-100 transition-all font-semibold touch-manipulation"
                    onClick={handlePaymentCancel}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>❌</span>
                      <span>No Pagó</span>
                    </div>
                  </button>
                  <button
                    className="flex-1 py-4 px-6 bg-green-500 text-white rounded-xl hover:bg-green-600 active:bg-green-700 transition-all font-semibold touch-manipulation gradient-forest"
                    onClick={handlePaymentConfirm}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      <span>Confirmar Pago</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
            onClose={handleCancelDialog}
          />
        )}

        {/* Modal para editar platillo */}
        <Modal isOpen={isEditDishOpen} onClose={onEditDishClose} size="md">
          <ModalContent>
            <ModalHeader>
              <h3 className="text-lg font-semibold">
                Editar Platillo:{" "}
                {selectedDishForEdit &&
                  dishes.find((d) => d.id === selectedDishForEdit.dish_id)
                    ?.name}
              </h3>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div>
                  <Input
                    label="Notas"
                    placeholder="Agregar notas especiales (ej: sin cebolla, extra picante)"
                    value={dishNotes}
                    onChange={(e) => setDishNotes(e.target.value)}
                    startContent={
                      <FileText className="w-4 h-4 text-gray-400" />
                    }
                  />
                </div>
                <div>
                  <Switch
                    isSelected={dishShouldPrepare}
                    onValueChange={setDishShouldPrepare}
                  >
                    ¿Debe prepararse en cocina?
                  </Switch>
                  <p className="text-xs text-gray-500 mt-1">
                    Si está deshabilitado, el platillo no se enviará a cocina
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={onEditDishClose}>
                Cancelar
              </Button>
              <Button
                color="primary"
                onPress={handleSaveDishEdit}
                disabled={isLoading}
              >
                {isLoading ? <Spinner size="sm" /> : "Guardar"}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Teclado Virtual */}
        <VirtualKeyboard
          isOpen={showKeyboard}
          value={dishNotes}
          onChange={setDishNotes}
          onClose={handleCloseKeyboard}
        />
      </div>
    </div>
  );
}
