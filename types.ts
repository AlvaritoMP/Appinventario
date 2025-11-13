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
}

export type UserRole = 'ADMINISTRADOR' | 'GERENTE' | 'EMPLEADO';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface UserWarehouseAccess {
  userId: string;
  warehouseId: string;
}

export type View = 'dashboard' | 'products' | 'warehouses' | 'log' | 'users' | 'settings';

// --- Nuevos Tipos de Configuración ---
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
