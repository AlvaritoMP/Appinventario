import React, { createContext, useReducer, useContext, Dispatch } from 'react';
import { Product, LogEntry, LogType, Warehouse, InventoryItem, User, UserWarehouseAccess } from '../types';
import { mockProducts, mockLogs, mockWarehouses, mockInventory, mockUsers, mockUserWarehouseAccess } from '../services/mockData';

// Generador simple de UUID para evitar dependencias externas.
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface AppState {
  products: Product[];
  warehouses: Warehouse[];
  inventory: InventoryItem[];
  logs: LogEntry[];
  users: User[];
  userWarehouseAccess: UserWarehouseAccess[];
  currentUser: User; // Simula el usuario logueado
}

const initialState: AppState = {
  products: mockProducts,
  warehouses: mockWarehouses,
  inventory: mockInventory,
  logs: mockLogs,
  users: mockUsers,
  userWarehouseAccess: mockUserWarehouseAccess,
  currentUser: mockUsers[0], // Por defecto, logueado como el primer usuario (Admin)
};

type Action =
  | { type: 'ADD_PRODUCT'; payload: { product: Omit<Product, 'id'> } }
  | { type: 'BULK_ADD_PRODUCTS'; payload: { products: Omit<Product, 'id'>[] } }
  | { type: 'UPDATE_PRODUCT'; payload: { product: Product } }
  | { type: 'DELETE_PRODUCT'; payload: { productId: string } }
  | { type: 'ADJUST_STOCK'; payload: { productId: string; warehouseId: string; quantityChange: number; type: LogType; details: string } }
  | { type: 'TRANSFER_STOCK'; payload: { productId: string; fromWarehouseId: string; toWarehouseId: string; quantity: number; details: string } }
  | { type: 'ADD_WAREHOUSE'; payload: { warehouse: Omit<Warehouse, 'id'> } }
  | { type: 'ADD_USER'; payload: { user: Omit<User, 'id'>; warehouseIds: string[] } }
  | { type: 'UPDATE_USER'; payload: { user: User; warehouseIds: string[] } }
  | { type: 'DELETE_USER'; payload: { userId: string } };

const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'ADD_WAREHOUSE': {
      const newWarehouse: Warehouse = {
        ...action.payload.warehouse,
        id: generateUUID(),
      };
      return {
        ...state,
        warehouses: [...state.warehouses, newWarehouse],
      };
    }
    case 'ADD_PRODUCT': {
      const { product } = action.payload;
      const newProduct: Product = {
        ...product,
        id: generateUUID(),
      };
      
      const newLog: LogEntry = {
          id: generateUUID(),
          timestamp: new Date().toISOString(),
          productName: newProduct.name,
          sku: newProduct.sku,
          warehouseName: 'N/A',
          type: 'CREACIÓN',
          quantityChange: 0,
          newQuantityInWarehouse: 0,
          details: 'Producto nuevo añadido al sistema.',
          user: state.currentUser.name,
      };

      return {
        ...state,
        products: [...state.products, newProduct],
        logs: [newLog, ...state.logs],
      };
    }
    case 'BULK_ADD_PRODUCTS': {
        const { products: productsToAdd } = action.payload;
        const newProducts: Product[] = [];
        const newLogs: LogEntry[] = [];

        productsToAdd.forEach(productData => {
            const newProduct: Product = {
                ...productData,
                id: generateUUID(),
            };
            newProducts.push(newProduct);

            newLogs.push({
                id: generateUUID(),
                timestamp: new Date().toISOString(),
                productName: newProduct.name,
                sku: newProduct.sku,
                warehouseName: 'N/A',
                type: 'CREACIÓN',
                quantityChange: 0,
                newQuantityInWarehouse: 0,
                details: 'Producto añadido por carga masiva.',
                user: state.currentUser.name,
            });
        });

        return {
            ...state,
            products: [...state.products, ...newProducts],
            logs: [...newLogs, ...state.logs],
        };
    }
    case 'UPDATE_PRODUCT': {
        const { product: updatedProduct } = action.payload;
        const products = state.products.map(p =>
            p.id === updatedProduct.id ? updatedProduct : p
        );
        return { ...state, products };
    }
    case 'DELETE_PRODUCT': {
        const products = state.products.filter(p => p.id !== action.payload.productId);
        const inventory = state.inventory.filter(i => i.productId !== action.payload.productId);
        // Opcional: Podrías añadir un log para la eliminación.
        return { ...state, products, inventory };
    }
    case 'ADJUST_STOCK': {
        const { productId, warehouseId, quantityChange, type, details } = action.payload;
        
        const product = state.products.find(p => p.id === productId);
        const warehouse = state.warehouses.find(w => w.id === warehouseId);
        if (!product || !warehouse) return state;

        const inventoryItemIndex = state.inventory.findIndex(
            i => i.productId === productId && i.warehouseId === warehouseId
        );

        let newQuantityInWarehouse = 0;
        let updatedInventory = [...state.inventory];

        if (inventoryItemIndex > -1) {
            const currentItem = state.inventory[inventoryItemIndex];
            newQuantityInWarehouse = Math.max(0, currentItem.quantity + quantityChange);
            updatedInventory[inventoryItemIndex] = { ...currentItem, quantity: newQuantityInWarehouse };
        } else {
             newQuantityInWarehouse = Math.max(0, quantityChange);
             if(newQuantityInWarehouse > 0) { // Only add if it's a positive adjustment
                updatedInventory.push({ productId, warehouseId, quantity: newQuantityInWarehouse });
             }
        }

        const newLog: LogEntry = {
            id: generateUUID(),
            timestamp: new Date().toISOString(),
            productName: product.name,
            sku: product.sku,
            warehouseName: warehouse.name,
            type,
            quantityChange,
            newQuantityInWarehouse,
            details,
            user: state.currentUser.name,
        };

        return {
            ...state,
            inventory: updatedInventory,
            logs: [newLog, ...state.logs],
        };
    }
    case 'TRANSFER_STOCK': {
        const { productId, fromWarehouseId, toWarehouseId, quantity, details } = action.payload;
        const product = state.products.find(p => p.id === productId);
        const fromWarehouse = state.warehouses.find(w => w.id === fromWarehouseId);
        const toWarehouse = state.warehouses.find(w => w.id === toWarehouseId);

        if (!product || !fromWarehouse || !toWarehouse || quantity <= 0) return state;

        let updatedInventory = [...state.inventory];
        let logsToAdd: LogEntry[] = [];
        let finalFromQuantity = 0;
        let finalToQuantity = 0;

        // Salida del almacén de origen
        const fromInventoryIndex = updatedInventory.findIndex(i => i.productId === productId && i.warehouseId === fromWarehouseId);
        if (fromInventoryIndex === -1 || updatedInventory[fromInventoryIndex].quantity < quantity) {
            return state; // No hay suficiente stock
        }
        const fromItem = updatedInventory[fromInventoryIndex];
        finalFromQuantity = fromItem.quantity - quantity;
        updatedInventory[fromInventoryIndex] = { ...fromItem, quantity: finalFromQuantity };

        logsToAdd.push({
            id: generateUUID(),
            timestamp: new Date().toISOString(),
            productName: product.name,
            sku: product.sku,
            warehouseName: fromWarehouse.name,
            type: 'SALIDA',
            quantityChange: -quantity,
            newQuantityInWarehouse: finalFromQuantity,
            details: `Transferencia a ${toWarehouse.name}. ${details}`,
            user: state.currentUser.name,
        });

        // Entrada en el almacén de destino
        const toInventoryIndex = updatedInventory.findIndex(i => i.productId === productId && i.warehouseId === toWarehouseId);
        if (toInventoryIndex > -1) {
            const toItem = updatedInventory[toInventoryIndex];
            finalToQuantity = toItem.quantity + quantity;
            updatedInventory[toInventoryIndex] = { ...toItem, quantity: finalToQuantity };
        } else {
            finalToQuantity = quantity;
            updatedInventory.push({ productId, warehouseId: toWarehouseId, quantity });
        }
        
        logsToAdd.push({
            id: generateUUID(),
            timestamp: new Date().toISOString(),
            productName: product.name,
            sku: product.sku,
            warehouseName: toWarehouse.name,
            type: 'ENTRADA',
            quantityChange: quantity,
            newQuantityInWarehouse: finalToQuantity,
            details: `Transferencia desde ${fromWarehouse.name}. ${details}`,
            user: state.currentUser.name,
        });

        return {
            ...state,
            inventory: updatedInventory,
            logs: [...logsToAdd, ...state.logs],
        };
    }
    case 'ADD_USER': {
        const { user, warehouseIds } = action.payload;
        const newUser: User = { ...user, id: generateUUID() };
        const newAccessEntries: UserWarehouseAccess[] = warehouseIds.map(warehouseId => ({
            userId: newUser.id,
            warehouseId,
        }));
        return {
            ...state,
            users: [...state.users, newUser],
            userWarehouseAccess: [...state.userWarehouseAccess, ...newAccessEntries],
        };
    }
    case 'UPDATE_USER': {
        const { user: updatedUser, warehouseIds } = action.payload;
        const users = state.users.map(u => u.id === updatedUser.id ? updatedUser : u);
        const userWarehouseAccess = state.userWarehouseAccess.filter(access => access.userId !== updatedUser.id);
        const newAccessEntries: UserWarehouseAccess[] = warehouseIds.map(warehouseId => ({
            userId: updatedUser.id,
            warehouseId,
        }));
        return {
            ...state,
            users,
            userWarehouseAccess: [...userWarehouseAccess, ...newAccessEntries],
        };
    }
    case 'DELETE_USER': {
        const { userId } = action.payload;
        // Prevenir la eliminación del usuario actual
        if (userId === state.currentUser.id) return state;
        const users = state.users.filter(u => u.id !== userId);
        const userWarehouseAccess = state.userWarehouseAccess.filter(access => access.userId !== userId);
        return {
            ...state,
            users,
            userWarehouseAccess,
        };
    }
    default:
      return state;
  }
};

const InventoryStateContext = createContext<AppState | undefined>(undefined);
const InventoryDispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <InventoryStateContext.Provider value={state}>
      <InventoryDispatchContext.Provider value={dispatch}>
        {children}
      </InventoryDispatchContext.Provider>
    </InventoryStateContext.Provider>
  );
};

export const useInventoryState = () => {
  const context = useContext(InventoryStateContext);
  if (context === undefined) {
    throw new Error('useInventoryState debe usarse dentro de un InventoryProvider');
  }
  return context;
};

export const useInventoryDispatch = () => {
    const context = useContext(InventoryDispatchContext);
    if (context === undefined) {
      throw new Error('useInventoryDispatch debe usarse dentro de un InventoryProvider');
    }
    return context;
};