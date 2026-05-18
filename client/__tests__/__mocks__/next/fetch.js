const mockProducts = [
  {
    id: "1",
    SKU: "jade-wallet",
    name: "Jade Wallet",
    description: "Blockstream hardware wallet",
    categoryId: "cat-hw",
    priceCents: 1600,
    quantity: 20,
    imageUrl:
      "https://store.blockstream.com/cdn/shop/files/Jade_Bitcoin_Hardware_Wallet_-_Green_-_Front.png",
  },
  {
    id: "2",
    SKU: "jade-plus-wallet",
    name: "Jade Plus",
    description: "Introducing Jade Plus",
    categoryId: "cat-hw",
    priceCents: 4000,
    quantity: 10,
    imageUrl:
      "https://store.blockstream.com/cdn/shop/files/Blockstream_Jade_Plus_Bitcoin_Wallet_Angled_Back_Grey.jpg",
  },
];

const mockCategories = [{ id: "cat-hw", name: "Hardware Wallet" }];
const mockCurrencies = [
  { id: "currency-1", acronym: "USD", countryCode: "US" },
];

const ResponseImpl = typeof Response !== "undefined" ? Response : null;

const jsonResponse = (body, init = {}) => {
  if (!ResponseImpl) {
    return Promise.resolve({
      ok: true,
      status: init.status ?? 200,
      json: async () => body,
      text: async () => JSON.stringify(body),
      headers: { get: () => "application/json" },
    });
  }

  return Promise.resolve(
    new ResponseImpl(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
      ...init,
    }),
  );
};

export function setupFetchMocks() {
  global.fetch = jest.fn((input = {}) => {
    const url = typeof input === "string" ? input : input.url || "";
    const path = url.replace(/^https?:\/\/[^/]+/, "");

    if (path.startsWith("/api/products")) {
      return jsonResponse(mockProducts);
    }

    if (path.startsWith("/api/categories")) {
      return jsonResponse(mockCategories);
    }

    if (path.startsWith("/api/base-currency")) {
      return jsonResponse({ currencyId: "currency-1" });
    }

    if (path.startsWith("/api/currencies")) {
      return jsonResponse(mockCurrencies);
    }

    if (path.startsWith("/api/uploads")) {
      return jsonResponse({
        uploads: [
          { url: "http://example.com/image.png", path: "/uploads/mock.png" },
        ],
      });
    }

    return jsonResponse({});
  });
}

setupFetchMocks();
