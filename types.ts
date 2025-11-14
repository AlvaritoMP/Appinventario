export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  lowStockThreshold: number;
  description: string;
  images: string[];
}

export interface InventoryItem {
    productId: string;
    warehouseId: string;
    quantity: number;
}

export type LogType = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'CREACIÓN';

export interface LogEntry {
  id: string;
  timestamp: string;
  productName: string;
  sku: string;
  warehouseName: string;
  type: LogType;
  quantityChange: number;
  newQuantityInWarehouse: number;
  details: string;
  user: string;
  transactionId?: string; // Para agrupar transferencias múltiples
}

export type UserRole = 'ADMINISTRADOR' | 'GERENTE' | 'EMPLEADO';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Para autenticación
}

export interface UserWarehouseAccess {
  userId: string;
  warehouseId: string;
}

export type View = 'dashboard' | 'products' | 'warehouses' | 'log' | 'users' | 'settings' | 'suppliers' | 'purchaseOrders' | 'purchaseCalendar';

// --- Tipos de Configuración ---
export interface ColorSettings {
    inStock: string;
    lowStock: string;
    outOfStock: string;
}

export interface AlertSettings {
    defaultLowStockThreshold: number;
}

export interface PurchaseOrderSettings {
    prefix: string;
    nextNumber: number;
}

export interface AppSettings {
    colors: ColorSettings;
    alerts: AlertSettings;
    purchaseOrderSettings: PurchaseOrderSettings;
}

// --- Tipos para Información de la Empresa (Flexible) ---
export type CompanyInfoDetails = {
    label: string;
    value: string;
}[];

export interface MyCompany {
    id: string;
    profileName: string; // Nombre para identificarlo en la app
    details: CompanyInfoDetails;
}


// --- Tipos para Módulo de Compras ---
export type PurchaseOrderStatus = 'BORRADOR' | 'EMITIDA' | 'RECIBIDA' | 'CANCELADA';

export interface Supplier {
    id: string;
    name: string;
    ruc: string;
    address: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
}

export interface PurchaseOrderItem {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    price: number;
}

export interface PurchaseOrder {
    id: string;
    orderNumber: string;
    supplierId: string;
    issuingCompanyId: string; // ID de la empresa que emite la OC
    destinationWarehouseId: string; // Nuevo: ID del almacén de destino
    issueDate: string;
    deliveryDate: string;
    status: PurchaseOrderStatus;
    items: PurchaseOrderItem[];
    solicitante: string;
    total: number;
}

export interface ScheduledPurchaseItem {
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
}

export interface ScheduledPurchase {
    id: string;
    date: string; // YYYY-MM-DD
    title: string;
    supplierId?: string;
    notes: string;
    items: ScheduledPurchaseItem[];
    createdBy: string;
}