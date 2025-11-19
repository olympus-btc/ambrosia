import { apiClient } from "../../services/apiClient";

export async function getAllOrders() {
  const response = await apiClient("/orders");
  return response ? response : [];
}

export async function getOrders() {
  const orders = await apiClient("/orders");
  return orders ? orders : [];
}

export async function addOrder(order) {
  return await apiClient("/orders", {
    method: "POST",
    body: order,
  });
}

export async function getUsers() {
  return await apiClient("/users");
}

export async function getUserById(userId) {
  const response = await apiClient(`/users/${userId}`);
  return response;
}

export async function getTables() {
  const response = await apiClient("/tables");
  return response ? response : [];
}

export async function createOrderInTable() {
  return await createOrder();
}

export async function getOrderById(orderId) {
  const response = await apiClient(`/orders/${orderId}`);
  return response;
}

export async function createOrder(tableId = null, userId) {
  const response = await getUserById(userId);
  //const response = {id: localStorage.getItem('userId'), name: "JordyArreglaLaDBConnection"};
  if (response) {
    const body = {
      user_id: response.id,
      waiter: response.name,
      status: "open",
      total: 0,
      created_at: Date.now(),
    };
    if (tableId) body.table_id = tableId;
    return await apiClient("/orders", {
      method: "POST",
      body: body,
    });
  } else {
  }
}

export async function addDishToOrder(pedidoId, dishId, dishPrice) {
  return await apiClient(`/orders/${pedidoId}/dishes`, {
    method: "POST",
    body: [
      {
        dish_id: dishId,
        price_at_order: dishPrice,
        notes: null,
      },
    ],
  });
}

export async function removeDishToOrder(pedidoId, dish) {
  return await apiClient(`/orders/${pedidoId}/dishes/${dish}`, {
    method: "DELETE",
  });
}

export async function getDishesByOrder(orderId) {
  const dishes = await apiClient(`/orders/${orderId}/dishes`);
  return dishes ? dishes : [];
}

/*export async function createOrder(pin, tableId = null) {
    try {
        const pinValidation = await validatePin(pin);
        if (!pinValidation.authorized) {
            throw new Error(pinValidation.error);
        }

        const orderId = Date.now();

        const newOrder = {
            id: Number(`${orderId}`),
            userId: pinValidation.userId,
            dishes: [],
            estado: 'abierto',
            createdAt: new Date().toISOString(),
        };

        const orderResponse = await addOrder(newOrder);

        if (tableId) {
            const tables = (await getTables()).data;
            const table = tables.find((t) => t.id === Number(tableId));
            if (!table) throw new Error('Mesa no encontrada');
            if (table.estado !== 'libre') throw new Error('La mesa no está libre');
            await updateTable(Number(tableId), { pedidoId: Number(`${orderResponse.id}`), estado: 'ocupada' });
            console.log(orderId);
        }

        console.log(orderResponse);
        return { data: orderResponse };
    } catch (error) {
        throw new Error(error.message || 'Error al crear el pedido');
    }
}*/

export async function updateOrder(order) {
  return await apiClient(`/orders/${order.id}`, {
    method: "PUT",
    body: order,
  });
}

export async function updateTable(table) {
  table.status = "available";
  table.order_id = null;
  return await apiClient(`/tables/${table.id}`, {
    method: "PUT",
    body: table,
  });
}

export async function updateOrderDish(orderId, dishId, orderDish) {
  return await apiClient(`/orders/${orderId}/dishes/${dishId}`, {
    method: "PUT",
    body: orderDish,
  });
}

export async function sendOrderDishes(orderId, dishIds) {
  return await apiClient(`/orders/${orderId}/dishes/send`, {
    method: "PUT",
    body: { dishIds },
  });
}

export async function addTicket(ticket) {
  return await apiClient("/tickets", {
    method: "POST",
    body: ticket,
  });
}

export async function updateTicket(ticketId, updatedTicket) {
  return await apiClient(`/tickets/${ticketId}`, {
    method: "PATCH",
    body: updatedTicket,
  });
}

export async function getTicketByOrderId(orderId) {
  return await apiClient(`/get-ticket-by-order-id/${orderId}`, {});
}

export async function createTicket(ticket) {
  return await apiClient("/tickets", {
    method: "POST",
    body: ticket,
  });
}

export async function createPayment(payment) {
  return await apiClient("/payments", {
    method: "POST",
    body: payment,
  });
}

export async function addPaymentToTicket(ticketId, paymentId) {
  return await apiClient("/payments/ticket-payments", {
    method: "POST",
    body: {
      payment_id: paymentId,
      ticket_id: ticketId,
    },
  });
}

export async function getPaymentMethods() {
  const paymentMethods = await apiClient("/payments/methods");
  return paymentMethods ? paymentMethods : [];
}

export async function getPaymentCurrencies() {
  const paymentCurrencies = await apiClient("/payments/currencies");
  return paymentCurrencies ? paymentCurrencies : [];
}

export async function getTickets() {
  const tickets = await apiClient("/tickets");
  return tickets ? tickets : [];
}

export async function getPayments() {
  const payments = await apiClient("/payments");
  return payments ? payments : [];
}

export async function getPaymentByTicketId(id) {
  return await apiClient(`/payments/ticket-payments/by-ticket/${id}`);
}

export async function getBaseCurrency() {
  const response = await apiClient("/base-currency");
  return response;
}
