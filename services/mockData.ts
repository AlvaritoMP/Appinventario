import { Product, LogEntry, Warehouse, InventoryItem, User, UserRole, UserWarehouseAccess, MyCompany, Supplier, PurchaseOrder } from '../types';

export const mockMyCompanies: MyCompany[] = [
    {
        id: 'mc1',
        profileName: 'Empresa Principal (Multidistribuciones)',
        details: [
            { label: "Nombre Comercial", value: "MULTIDISTRIBUCIONES" },
            { label: "Razón Social", value: "EMPRESA SIMPLE SAC" },
            { label: "RUC", value: "20200200200" },
            { label: "Dirección Fiscal", value: "Manzana X lote 5 (1er.piso) Urb.Covicorti Trujillo - Trujillo - La Libertad" },
            { label: "Sucursal", value: "Av. Húsares de Junín 1248 Urb.La Merced III Trujillo - Trujillo - La Libertad" },
        ]
    },
    {
        id: 'mc2',
        profileName: 'Negocio Secundario (Ferretería)',
        details: [
             { label: "Nombre Comercial", value: "FERRETERÍA EL TORNILLO SAC" },
             { label: "Razón Social", value: "FERRETERÍA EL TORNILLO SAC" },
             { label: "RUC", value: "20998877665" },
             { label: "Dirección Fiscal", value: "Av. Industrial 123, Lima" },
        ]
    }
];

export const mockWarehouses: Warehouse[] = [
  { id: 'w1', name: 'Almacén Principal', location: '150141 - AV LOS GERANIOS 321' },
  { id: 'w2', name: 'Bodega Norte', location: 'Ciudad Capital, Sector Norte' },
  { id: 'w3', name: 'Punto de Venta Central', location: '150140 - AV. CAMINOS DEL INCA NRO. 3140 DPTO. 401 URB. PROLONGACION BENAVIDES - LIMA LIMA SANTIAGO DE SURCO' },
];

export const mockProducts: Product[] = [
  { id: 'p1', name: 'Taladro Inalámbrico 20V', sku: 'TLD-20V-001', category: 'Herramientas Elétricas', price: 129.99, lowStockThreshold: 10, description: 'Potente taladro inalámbrico de 20V con batería de litio de larga duración. Ideal para trabajos de perforación en madera, metal y plástico.', images: ['https://via.placeholder.com/600x400.png/2d3748/ffffff?text=Taladro'] },
  { id: 'p2', name: 'Juego de 100 Brocas', sku: 'BRC-100-002', category: 'Accesorios', price: 49.99, lowStockThreshold: 15, description: 'Set completo de 100 brocas de titanio de alta velocidad para múltiples materiales. Incluye estuche organizador.', images: ['https://via.placeholder.com/600x400.png/2d3748/ffffff?text=Brocas'] },
  { id: 'p3', name: 'Martillo de Carpintero', sku: 'MTC-CF-003', category: 'Herramientas Manuales', price: 24.50, lowStockThreshold: 20, description: 'Martillo de carpintero con cabeza de acero forjado y mango de fibra de vidrio para una absorción óptima de impactos.', images: ['https://via.placeholder.com/600x400.png/2d3748/ffffff?text=Martillo'] },
  { id: 'p4', name: 'Caja de Herramientas Metálica', sku: 'CJA-MTL-004', category: 'Almacenamiento', price: 75.00, lowStockThreshold: 5, description: 'Caja de herramientas metálica de 5 compartimentos, resistente y con amplio espacio para organizar todas tus herramientas.', images: ['https://via.placeholder.com/600x400.png/2d3748/ffffff?text=Caja'] },
  { id: 'p5', name: 'Guantes de Seguridad (Par)', sku: 'GNT-SEG-005', category: 'Seguridad', price: 9.99, lowStockThreshold: 50, description: 'Par de guantes de seguridad recubiertos de nitrilo para un mejor agarre y protección contra cortes y abrasiones.', images: ['https://via.placeholder.com/600x400.png/2d3748/ffffff?text=Guantes'] },
  { id: 'p6', name: 'COCA COLA 500ML X12', sku: 'CF_600/04', category: 'Bebidas', price: 15.00, lowStockThreshold: 20, description: 'Paquete de 12 botellas de Coca Cola de 500ml.', images: [] },
];

export const mockInventory: InventoryItem[] = [
    { productId: 'p1', warehouseId: 'w1', quantity: 25 }, // Ajustado de 30 para reflejar la salida
    { productId: 'p1', warehouseId: 'w2', quantity: 12 },
    { productId: 'p2', warehouseId: 'w1', quantity: 8 },
    { productId: 'p3', warehouseId: 'w1', quantity: 80 },
    { productId: 'p3', warehouseId: 'w2', quantity: 32 },
    { productId: 'p3', warehouseId: 'w3', quantity: 15 },
    { productId: 'p4', warehouseId: 'w2', quantity: 0 },
    { productId: 'p5', warehouseId: 'w1', quantity: 150 },
    { productId: 'p5', warehouseId: 'w2', quantity: 100 },
    { productId: 'p6', warehouseId: 'w1', quantity: 50 },
];

export const mockLogs: LogEntry[] = [
    { 
        id: 'l4', 
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), 
        productName: 'Taladro Inalámbrico 20V',
        sku: 'TLD-20V-001',
        warehouseName: 'Almacén Principal',
        type: 'SALIDA', 
        quantityChange: -5, 
        newQuantityInWarehouse: 25,
        details: 'Venta a cliente #C-2024-01',
        user: 'Empleado Mostrador'
    },
    { 
        id: 'l1', 
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), 
        productName: 'Taladro Inalámbrico 20V', 
        sku: 'TLD-20V-001',
        warehouseName: 'Almacén Principal',
        type: 'ENTRADA', 
        quantityChange: 30, 
        newQuantityInWarehouse: 30,
        details: 'Recepción de pedido de proveedor #PO-1024',
        user: 'Sistema'
    },
    { 
        id: 'l2', 
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), 
        productName: 'Taladro Inalámbrico 20V',
        sku: 'TLD-20V-001',
        warehouseName: 'Bodega Norte',
        type: 'ENTRADA', 
        quantityChange: 12, 
        newQuantityInWarehouse: 12,
        details: 'Transferencia desde Almacén Principal',
        user: 'Sistema'
    },
     { 
        id: 'l3', 
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), 
        productName: 'Guantes de Seguridad (Par)', 
        sku: 'GNT-SEG-005',
        warehouseName: 'N/A',
        type: 'CREACIÓN', 
        quantityChange: 0, 
        newQuantityInWarehouse: 0,
        details: 'Producto nuevo añadido al sistema',
        user: 'Sistema'
    },
];

export const mockUsers: User[] = [
  { id: 'u1', name: 'Admin General', email: 'admin@dominio.com', role: 'ADMINISTRADOR', password: 'adminpassword' },
  { id: 'u2', name: 'Gerente Bodega', email: 'gerente@dominio.com', role: 'GERENTE', password: 'gerentepassword' },
  { id: 'u3', name: 'Empleado Mostrador', email: 'empleado@dominio.com', role: 'EMPLEADO', password: 'empleadopassword' },
  { id: 'u4', name: 'JAYCO SOCIEDAD ANONIMA CERRADA', email: 'cliente@jayco.com', role: 'EMPLEADO', password: 'clientepassword' }, // Mock client
];

export const mockUserWarehouseAccess: UserWarehouseAccess[] = [
  // Admin (u1) tiene acceso a todo por defecto (no necesita entradas aquí)
  // Gerente (u2) tiene acceso a Almacén Principal y Bodega Norte
  { userId: 'u2', warehouseId: 'w1' },
  { userId: 'u2', warehouseId: 'w2' },
  // Empleado (u3) tiene acceso solo al Punto de Venta Central
  { userId: 'u3', warehouseId: 'w3' },
];

export const mockSuppliers: Supplier[] = [
    {
        id: 'sup1',
        name: 'OPALO PERU SAC',
        ruc: '20511627061',
        address: 'Jirón Camino Real, 1715, Of. 203, 15063, Santiago de Surco, Peru',
        contactPerson: 'Aminano',
        contactEmail: 'aminano@opaloperu.com',
        contactPhone: '989112209'
    },
    {
        id: 'sup2',
        name: 'Ferretería Industrial Max',
        ruc: '20123456789',
        address: 'Av. Industrial 456, Parque Industrial, Lima, Peru',
        contactPerson: 'Carlos Ramirez',
        contactEmail: 'carlos.r@ferremax.com',
        contactPhone: '987654321'
    }
];

export const mockPurchaseOrders: PurchaseOrder[] = [];