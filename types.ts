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

export type View = 'dashboard' | 'products' | 'warehouses' | 'log' | 'users' | 'settings';

// --- Tipos de Configuración ---
export interface ColorSettings {
    inStock: string;
    lowStock: string;
    outOfStock: string;
}

export interface AlertSettings {
    defaultLowStockThreshold: number;
}

export interface AppSettings {
    colors: ColorSettings;
    alerts: AlertSettings;
}

// --- Nuevo Tipo para Información de la Empresa ---
export interface CompanyInfo {
    name: string;
    tradeName: string;
    ruc: string;
    fiscalAddress: string;
    branchAddress?: string;
}