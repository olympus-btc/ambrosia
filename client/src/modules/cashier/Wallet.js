"use client";
import { useCallback, useEffect, useRef, useState } from "react";

import { getWsUrl } from "@/config/api";

import WalletGuard from "../../components/auth/WalletGuard";
import {
  createInvoice,
  getIncomingTransactions,
  getInfo,
  getOutgoingTransactions,
  payInvoiceFromService,
} from "./cashierService";
import { QRCode } from "react-qr-code";
import {
  Zap,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Send,
  QrCode,
  Bitcoin,
  CreditCard,
  History,
  Home,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Tabs,
  Tab,
  Divider,
  Spinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Progress,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { addToast } from "@heroui/react";

function WalletInner() {
  const router = useRouter();
  const [info, setInfo] = useState(null);
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDesc, setInvoiceDesc] = useState("");
  const [createdInvoice, setCreatedInvoice] = useState(null);
  const [payInvoice, setPayInvoice] = useState("");
  const [paymentResult, setPaymentResult] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("receive");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const fetchTransactionsRef = useRef(null);

  const fetchInfo = useCallback(async () => {
    try {
      const res = await getInfo();
      setInfo(res);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Error al obtener la información de la wallet");
      addToast({
        title: "Error",
        description: "No se pudo cargar la información de la wallet",
        variant: "solid",
        color: "danger",
      });
    }
  }, []);

  const fetchTransactions = useCallback(
    async () => {
      try {
        setLoading(true);
        let incoming = [];
        let outgoing = [];

        if (filter === "incoming" || filter === "all") {
          incoming = await getIncomingTransactions();
        }
        if (filter === "outgoing" || filter === "all") {
          outgoing = await getOutgoingTransactions();
        }

        const allTx = [...incoming, ...outgoing].sort(
          (a, b) => b.completedAt - a.completedAt,
        );
        setTransactions(allTx);
      } catch (err) {
        console.error("Error al obtener transacciones:", err);
        setError("Error al cargar historial");
        addToast({
          title: "Error",
          description: "No se pudo cargar el historial de transacciones",
          variant: "solid",
          color: "danger",
        });
      } finally {
        setLoading(false);
      }
    }, [filter]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    fetchTransactionsRef.current = fetchTransactions;
  }, [fetchTransactions]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let ws;
    let shouldReconnect = true;
    const connect = () => {
      const url = getWsUrl();
      ws = new WebSocket(url);

      ws.onopen = () => {
        console.info("WS payments conectado", url);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === "payment_received") {
            addToast({
              title: "Pago recibido",
              description: `Hash: ${data.paymentHash || ""}`,
              variant: "solid",
              color: "success",
            });
            fetchTransactionsRef.current?.();
            fetchInfo();
          }
        } catch (err) {
          console.warn("WS payments mensaje no procesado", err);
        }
      };

      ws.onerror = (err) => {
        console.warn("WS payments error", err);
      };

      ws.onclose = () => {
        if (shouldReconnect) {
          setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [fetchInfo]);

  const handleCreateInvoice = async () => {
    if (!invoiceAmount) {
      setError("Debes ingresar un monto para la invoice");
      return;
    }
    try {
      setLoading(true);
      const res = await createInvoice(invoiceAmount, invoiceDesc);
      setCreatedInvoice(res);
      setShowInvoiceModal(true);
      setInvoiceAmount("");
      setInvoiceDesc("");
      setError("");
      addToast({
        title: "Invoice Creada",
        description: "La invoice de Lightning se ha generado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      console.error(err);
      setError("Error al crear la invoice");
      addToast({
        title: "Error",
        description: "No se pudo crear la invoice",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayInvoice = async () => {
    if (!payInvoice.trim()) {
      setError("Debes ingresar una invoice para pagar");
      return;
    }
    try {
      setLoading(true);
      const res = await payInvoiceFromService(payInvoice);
      setPaymentResult(res);
      setPayInvoice("");
      setError("");
      addToast({
        title: "Pago Enviado",
        description: "El pago Lightning se ha enviado correctamente",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      console.error(err);
      setError("Error al pagar la invoice");
      addToast({
        title: "Error",
        description: "No se pudo procesar el pago",
        variant: "solid",
        color: "danger",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        addToast({
          title: "Copiado",
          description: "Texto copiado al portapapeles",
          variant: "solid",
          color: "success",
        });
      } catch (err) {
        console.error("Error al copiar con clipboard API", err);
        fallbackCopy(text);
      }
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      addToast({
        title: "Copiado",
        description: "Texto copiado al portapapeles",
        variant: "solid",
        color: "success",
      });
    } catch (err) {
      console.error("Fallback copy failed", err);
      addToast({
        title: "Error",
        description: "No se pudo copiar al portapapeles",
        variant: "solid",
        color: "danger",
      });
    }
    document.body.removeChild(textarea);
  };

  const formatSats = (amount) => {
    return new Intl.NumberFormat().format(amount);
  };

  const getTotalBalance = () => {
    if (!info?.channels) return 0;
    return info.channels.reduce((total, ch) => total + ch.balanceSat, 0);
  };

  const getTransactionIcon = (type) => {
    return type === "outgoing_payment" ? (
      <ArrowUpRight className="w-4 h-4 text-red-600" />
    ) : (
      <ArrowDownLeft className="w-4 h-4 text-green-600" />
    );
  };

  if (!info) {
    return (
      <div className="min-h-screen gradient-fresh flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardBody className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" color="success" />
            <p className="text-lg font-semibold text-deep mt-4">
              Cargando información de la wallet...
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
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-2">
                  <Zap className="w-6 h-6 text-yellow-600" />
                </div>
                <h1 className="text-2xl font-bold text-deep">
                  Wallet Lightning ⚡
                </h1>
                <p className="text-forest text-sm">
                  Balance: {formatSats(getTotalBalance())} sats
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

        {/* Info Card */}
        <Card className="mb-6 shadow-lg border-0 bg-white">
          <CardHeader>
            <h3 className="text-lg font-bold text-deep flex items-center">
              <Info className="w-5 h-5 mr-2" />
              Información del Nodo
            </h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Bitcoin className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    Balance Total
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {formatSats(getTotalBalance())} sats
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    Red
                  </span>
                </div>
                <p className="text-lg font-bold text-green-900">{info.chain}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">
                    Canales
                  </span>
                </div>
                <p className="text-lg font-bold text-purple-900">
                  {info.channels.length}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <CreditCard className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">
                    Bloque
                  </span>
                </div>
                <p className="text-lg font-bold text-orange-900">
                  {info.blockHeight}
                </p>
              </div>
            </div>

            {/* Channels */}
            <div className="space-y-3">
              <h4 className="font-semibold text-deep">Canales Lightning</h4>
              {info.channels.map((channel, index) => (
                <Card key={channel.channelId} className="border">
                  <CardBody className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h5 className="font-semibold text-deep">
                          Canal #{index + 1}
                        </h5>
                        <div className="flex items-center space-x-1 mt-1">
                          <span
                            className={`w-2 h-2 rounded-full ${channel.state === "NORMAL" ? "bg-green-500" : "bg-red-500"}`}
                          ></span>
                          <span className="text-sm text-forest">
                            {channel.state}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-deep">
                          {formatSats(channel.balanceSat)} sats
                        </p>
                        <p className="text-sm text-forest">Balance Local</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-forest">Capacidad Total:</span>
                        <span className="font-medium">
                          {formatSats(channel.capacitySat)} sats
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-forest">Liquidez Entrante:</span>
                        <span className="font-medium">
                          {formatSats(channel.inboundLiquiditySat)} sats
                        </span>
                      </div>
                      <Progress
                        aria-label="Balance Channel"
                        value={(channel.balanceSat / channel.capacitySat) * 100}
                        className="max-w-full"
                        color="primary"
                        size="sm"
                      />
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Tabs */}
        <Card className="shadow-lg border-0 bg-white">
          <CardBody className="p-0">
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={setActiveTab}
              variant="underlined"
              classNames={{
                tabList:
                  "gap-6 w-full relative rounded-none p-0 border-b border-divider",
                cursor: "w-full bg-forest",
                tab: "max-w-fit px-6 py-4 h-12",
                tabContent: "group-data-[selected=true]:text-forest",
              }}
            >
              <Tab
                key="receive"
                title={
                  <div className="flex items-center space-x-2">
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>Recibir</span>
                  </div>
                }
              >
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <Input
                      type="number"
                      label="Monto en satoshis"
                      placeholder="1000"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      variant="bordered"
                      size="lg"
                      startContent={
                        <Bitcoin className="w-4 h-4 text-gray-400" />
                      }
                      classNames={{
                        input: "text-base",
                        label: "text-sm font-semibold text-deep",
                      }}
                      disabled={loading}
                    />
                    <Input
                      label="Descripción (opcional)"
                      placeholder="Concepto del pago"
                      value={invoiceDesc}
                      onChange={(e) => setInvoiceDesc(e.target.value)}
                      variant="bordered"
                      size="lg"
                      classNames={{
                        input: "text-base",
                        label: "text-sm font-semibold text-deep",
                      }}
                      disabled={loading}
                    />
                    <Button
                      onPress={handleCreateInvoice}
                      variant="solid"
                      color="primary"
                      size="lg"
                      disabled={loading || !invoiceAmount}
                      className="w-full gradient-forest text-white"
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <Spinner size="sm" color="white" />
                          <span>Creando Invoice...</span>
                        </div>
                      ) : (
                        <>
                          <QrCode className="w-4 h-4 mr-2" />
                          Crear Invoice Lightning
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Tab>

              <Tab
                key="send"
                title={
                  <div className="flex items-center space-x-2">
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Enviar</span>
                  </div>
                }
              >
                <div className="p-6 space-y-6">
                  <div className="space-y-4">
                    <Input
                      label="Invoice BOLT11"
                      placeholder="lnbc1..."
                      value={payInvoice}
                      onChange={(e) => setPayInvoice(e.target.value)}
                      variant="bordered"
                      size="lg"
                      startContent={<Zap className="w-4 h-4 text-gray-400" />}
                      classNames={{
                        input: "text-base",
                        label: "text-sm font-semibold text-deep",
                      }}
                      disabled={loading}
                    />
                    <Button
                      onPress={handlePayInvoice}
                      variant="solid"
                      color="warning"
                      size="lg"
                      disabled={loading || !payInvoice.trim()}
                      className="w-full"
                    >
                      {loading ? (
                        <div className="flex items-center space-x-2">
                          <Spinner size="sm" color="white" />
                          <span>Procesando Pago...</span>
                        </div>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Pago Lightning
                        </>
                      )}
                    </Button>
                  </div>

                  {paymentResult && (
                    <Card className="bg-green-50 border-green-200">
                      <CardHeader>
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="font-bold text-green-800">
                            Pago Realizado
                          </span>
                        </div>
                      </CardHeader>
                      <CardBody>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-green-700">
                              Monto enviado:
                            </span>
                            <span className="font-medium">
                              {formatSats(paymentResult.recipientAmountSat)}{" "}
                              sats
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-green-700">
                              Fee de enrutamiento:
                            </span>
                            <span className="font-medium">
                              {formatSats(paymentResult.routingFeeSat)} sats
                            </span>
                          </div>
                          <Divider />
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-green-700">
                                Payment Hash:
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onPress={() =>
                                  copyToClipboard(paymentResult.paymentHash)
                                }
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Copiar
                              </Button>
                            </div>
                            <div className="bg-white p-2 rounded text-xs break-all">
                              {paymentResult.paymentHash}
                            </div>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </div>
              </Tab>

              <Tab
                key="history"
                title={
                  <div className="flex items-center space-x-2">
                    <History className="w-4 h-4" />
                    <span>Historial</span>
                  </div>
                }
              >
                <div className="p-6 space-y-6">
                  <div className="flex space-x-2">
                    <Button
                      variant={filter === "all" ? "solid" : "outline"}
                      color="primary"
                      size="sm"
                      onPress={() => setFilter("all")}
                    >
                      Todos
                    </Button>
                    <Button
                      variant={filter === "incoming" ? "solid" : "outline"}
                      color="success"
                      size="sm"
                      onPress={() => setFilter("incoming")}
                    >
                      Recibidos
                    </Button>
                    <Button
                      variant={filter === "outgoing" ? "solid" : "outline"}
                      color="danger"
                      size="sm"
                      onPress={() => setFilter("outgoing")}
                    >
                      Enviados
                    </Button>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-deep mb-2">
                        No hay transacciones
                      </h3>
                      <p className="text-gray-500">
                        Las transacciones aparecerán aquí una vez que comiences
                        a usar la wallet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {transactions.map((tx, i) => (
                        <Card
                          key={tx.paymentId || tx.txId || i}
                          className="border"
                        >
                          <CardBody className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                  {getTransactionIcon(tx.type)}
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-deep">
                                      {tx.type === "outgoing_payment"
                                        ? "Enviado"
                                        : "Recibido"}
                                    </span>
                                    <Chip
                                      size="sm"
                                      color={
                                        tx.type === "outgoing_payment"
                                          ? "danger"
                                          : "success"
                                      }
                                      variant="flat"
                                    >
                                      {formatSats(
                                        tx.type === "outgoing_payment"
                                          ? tx.sent
                                          : tx.receivedSat,
                                      )}{" "}
                                      sats
                                    </Chip>
                                  </div>
                                  <p className="text-sm text-forest">
                                    Fee: {formatSats(Number(tx.fees) / 1000)}{" "}
                                    sats
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-500">
                                  {new Date(
                                    tx.completedAt,
                                  ).toLocaleDateString()}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {new Date(
                                    tx.completedAt,
                                  ).toLocaleTimeString()}
                                </p>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>

        {/* Invoice Modal */}
        <Modal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          size="2xl"
        >
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-forest" />
                <span>Invoice Lightning Generada</span>
              </div>
            </ModalHeader>
            <ModalBody>
              {createdInvoice && (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="bg-white p-4 rounded-lg border">
                      <QRCode value={createdInvoice.serialized} size={200} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-deep">
                          BOLT11 Invoice:
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() =>
                            copyToClipboard(createdInvoice.serialized)
                          }
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </Button>
                      </div>
                      <div className="bg-gray-50 p-3 rounded text-xs break-all">
                        {createdInvoice.serialized}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-deep">
                          Payment Hash:
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() =>
                            copyToClipboard(createdInvoice.paymentHash)
                          }
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar
                        </Button>
                      </div>
                      <div className="bg-gray-50 p-3 rounded text-xs break-all">
                        {createdInvoice.paymentHash}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              <Button
                variant="outline"
                onPress={() => setShowInvoiceModal(false)}
              >
                Cerrar
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}

export default function Wallet() {
  return (
    <WalletGuard
      placeholder={<div className="min-h-screen gradient-fresh p-4" />}
      title="Confirmar acceso a Wallet"
      passwordLabel="Contraseña"
      confirmText="Entrar"
    >
      <WalletInner />
    </WalletGuard>
  );
}
