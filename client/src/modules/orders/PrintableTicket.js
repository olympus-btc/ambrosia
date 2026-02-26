import React from "react";

import Image from "next/image";

const PrintableTicket = React.forwardRef(({ order, qrCodeUrl = null }, ref) => (
  <div ref={ref} className="p-4 text-sm font-mono text-black print:w-[80mm] print:text-xs">
    <h2 className="text-center text-lg font-bold mb-2">🍽️ Restaurante POS</h2>
    <p><strong>Pedido:</strong> #{order?.id}</p>
    <p><strong>Mozo:</strong> {order?.mozo}</p>
    <p><strong>Mesa:</strong> {order?.table}</p>
    <hr className="my-2 border-black" />
    <ul className="mb-2">
      {order?.dishes?.map((item, idx) => (
        <li key={idx}>
          {item.dish?.nombre} - ${item.dish?.precio.toFixed(2)}
        </li>
      ))}
    </ul>
    <hr className="my-2 border-black" />
    <p><strong>Total:</strong> ${order?.total?.toFixed(2)}</p>
    <p><strong>Método:</strong> {order?.paymentMethod || "Por definir"}</p>
    {qrCodeUrl && (
    <>
      <hr className="my-2 border-black" />
      <p className="text-center font-bold">💥 Paga con Lightning</p>
      <Image src={qrCodeUrl} alt="QR Lightning" className="w-40 h-40 mx-auto my-2" />
    </>
    )}
    <hr className="my-2 border-black" />
    <p className="text-center">¡Gracias por tu visita!</p>
  </div>
));

PrintableTicket.displayName = "PrintableTicket";
export default PrintableTicket;
