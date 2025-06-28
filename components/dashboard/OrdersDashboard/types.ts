// File: components/dashboard/OrdersDashboard/types.ts
// ============================================================================
//  Shared TypeScript shapes for the various dashboard components
//  (order grids, cards, modals, etc.)
//  All are *frontend-only* helpers – they do not have to mirror the complete
//  Prisma model, just the fields the React code actually touches.
// ============================================================================

/* ---------------------------------------------------------------------------
   Order – the slice of data every grid / card needs.
--------------------------------------------------------------------------- */
export interface Order {
  /* primary keys */
  id:            string;      // internal UUID
  orderId:       string;      // human-friendly code “ORD-YYYY…”
  createdAt:     string;      // ISO timestamp

  /* lifecycle */
  status:           string;             // “ORDER_RECEIVED” | “ORDER_READY” | …
  schedule:         string | null;      // ISO schedule time for pre-orders
  statusHistory:    Array<Record<string, any>>;

  /* routing / type info */
  orderType?:         string | null;  // “delivery” | “golf” | etc. (nullable for old rows)
  deliveryType:       string;         // PICKUP_AT_CLUBHOUSE | ON_COURSE | …
  holeNumber?:        number | null;  // for on-course golf orders
  deliveryAddress?:   import('@/contexts/OrderContext').DeliveryAddress | null;
  deliveryInstructions?: string | null;

  /* alcohol / compliance */
  containsAlcohol:   boolean;
  paymentMethod:     'CARD' | 'CASH';

  /* money */
  totalAmount:       number;
  tipAmount?:        number;
  driverPayout?:     number;
  tipRecipientId?:   number;

  /* timestamps for print/statement views */
  deliveredAt?:      string | null;    // when the order was delivered
  updatedAt?:        string | null;    // last status‐update timestamp

  /* line items (flat list + rich lineItems for admin detail) */
  items:      Array<Record<string, any>>;
  lineItems:  Array<Record<string, any>>;

  /* relations (all optional so grids don’t explode on partial selects) */
  guestName?: string | null;
  customer?:  { firstName: string; lastName: string } | null;

  driver?: {
    id:         number;
    firstName:  string;
    lastName:   string;
  } | null;

  staff?: {
    firstName:  string;
    lastName:   string;
  } | null;

  /* cash collection (server flow, cashier recon) */
  cashCollection?: {
    status:   'PENDING' | 'SETTLED';
    amount?:  number;
    server?:  { firstName: string; lastName: string } | null;
  };

  /* NOTE ─────────────────────────────────────────────────────────────
     A few grids still cast an `order` to `{ ...order, driverId }`
     so that deeply nested components don’t need to know about the
     `driver?.id` shape.  We keep the prop optional for compatibility.
  ------------------------------------------------------------------- */
  driverId?:    number | null;
}

/* ---------------------------------------------------------------------------
   Aggregated cash-collection counts per server (for the cashier filter)
--------------------------------------------------------------------------- */
export interface ServerAgg {
  server: {
    id:        number;
    firstName: string;
    lastName:  string;
  };
  pendingOrders: number;
  totalAmount:   number;
}

/* ---------------------------------------------------------------------------
   Raw record returned from the /api/orders/cash-collections endpoints
--------------------------------------------------------------------------- */
export interface CashCollectionRecord {
  id:          string;
  orderId:     string;   // human-friendly code
  amount:      number;
  collectedAt: string | null;
}

/* ---------------------------------------------------------------------------
   Shape returned by the `/api/orders` list endpoint
--------------------------------------------------------------------------- */
export interface OrdersListResponse {
  orders:     Order[];
  page:       number;
  totalPages: number;
}
