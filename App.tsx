import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Product, LogEntry, View, LogType, Warehouse, User, UserRole } from './types';
import { useInventoryState, useInventoryDispatch } from './context/InventoryContext';
import { ICONS } from './constants';

declare global {
  interface Window { QRious: any; }
}

// Hook para obtener los almacenes permitidos para el usuario actual
const usePermittedWarehouses = () => {
    const { warehouses, currentUser, userWarehouseAccess } = useInventoryState();
    
    return useMemo(() => {
        if (currentUser.role === 'ADMINISTRADOR') {
            return warehouses;
        }
        const permittedIds = userWarehouseAccess
            .filter(access => access.userId === currentUser.id)
            .map(access => access.warehouseId);
        
        return warehouses.filter(w => permittedIds.includes(w.id));
    }, [warehouses, currentUser, userWarehouseAccess]);
};


// Helper para exportar a CSV
const exportToCsv = (filename: string, headers: string[], data: (string | number)[][]) => {
    const escapeCSV = (value: any): string => {
        const str = String(value ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows = data.map(row => row.map(escapeCSV).join(','));
    const csvContent = [headers.join(','), ...rows].join('\n');
    
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};


// UI Components Reutilizables
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6 ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, maxWidth?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className={`bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full ${maxWidth} mx-auto`} onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">{ICONS.close}</button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const Button = ({ children, onClick, className = 'bg-blue-600 hover:bg-blue-700', type = 'button', disabled = false }: { children: React.ReactNode, onClick?: () => void, className?: string, type?: 'button' | 'submit' | 'reset', disabled?: boolean }) => (
  <button type={type} onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label: string }>(({ label, ...props }, ref) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input ref={ref} {...props} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 transition" />
    </div>
));

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }>(({ label, ...props }, ref) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <textarea ref={ref} {...props} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 transition" />
    </div>
));

// Vistas de la Aplicación
const DashboardView = () => {
    const { products, inventory, warehouses, currentUser } = useInventoryState();

    const productTotals = useMemo(() => {
        return products.map(p => {
            const totalQuantity = inventory
                .filter(item => item.productId === p.id)
                .reduce((sum, item) => sum + item.quantity, 0);
            return { ...p, totalQuantity };
        });
    }, [products, inventory]);

    const totalUnits = useMemo(() => inventory.reduce((sum, item) => sum + item.quantity, 0), [inventory]);
    const lowStockItems = useMemo(() => productTotals.filter(p => p.totalQuantity > 0 && p.totalQuantity <= p.lowStockThreshold), [productTotals]);
    const outOfStockItems = useMemo(() => productTotals.filter(p => p.totalQuantity === 0), [productTotals]);

    const stockByWarehouse = useMemo(() => {
        return warehouses.map(w => {
            const total = inventory
                .filter(item => item.warehouseId === w.id)
                .reduce((sum, item) => sum + item.quantity, 0);
            return { ...w, total };
        });
    }, [warehouses, inventory]);

    const handleGenerateGeneralReport = () => {
        const productTotalsMap = new Map(products.map(p => {
            const totalQuantity = inventory
                .filter(item => item.productId === p.id)
                .reduce((sum, item) => sum + item.quantity, 0);
            return [p.id, totalQuantity];
        }));

        const headers = [
            "ID Producto", "SKU", "Producto", "Categoría", "Descripción", "Precio", "Umbral Stock Bajo", "Stock Total Producto",
            "ID Almacén", "Almacén", "Ubicación Almacén", "Cantidad en Almacén", "Imágenes"
        ];

        const data = inventory.map(item => {
            const product = products.find(p => p.id === item.productId);
            const warehouse = warehouses.find(w => w.id === item.warehouseId);
            
            if (!product || !warehouse) return null;

            return [
                product.id,
                product.sku,
                product.name,
                product.category,
                product.description,
                product.price,
                product.lowStockThreshold,
                productTotalsMap.get(product.id) || 0,
                warehouse.id,
                warehouse.name,
                warehouse.location,
                item.quantity,
                product.images.join(', ')
            ];
        }).filter(Boolean) as (string|number)[][];

        exportToCsv('reporte_general_inventario.csv', headers, data);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                 <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                 {currentUser.role === 'ADMINISTRADOR' && (
                    <Button onClick={handleGenerateGeneralReport} className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto">
                        {ICONS.document}
                        Generar Reporte General
                    </Button>
                 )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="flex items-center space-x-4">
                    <div className="bg-gray-700 p-3 rounded-lg text-blue-400">{ICONS.product}</div>
                    <div>
                        <p className="text-gray-400 text-sm">Productos Totales</p>
                        <p className="text-white text-3xl font-bold">{products.length}</p>
                    </div>
                </Card>
                <Card className="flex items-center space-x-4">
                     <div className="bg-gray-700 p-3 rounded-lg text-green-400">{ICONS.warehouse}</div>
                     <div>
                        <p className="text-gray-400 text-sm">Almacenes</p>
                        <p className="text-white text-3xl font-bold">{warehouses.length}</p>
                    </div>
                </Card>
                <Card className="flex items-center space-x-4">
                    <div className="bg-gray-700 p-3 rounded-lg text-yellow-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Items con Stock Bajo</p>
                        <p className="text-white text-3xl font-bold">{lowStockItems.length}</p>
                    </div>
                </Card>
                 <Card className="flex items-center space-x-4">
                    <div className="bg-gray-700 p-3 rounded-lg text-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    </div>
                    <div>
                        <p className="text-gray-400 text-sm">Items Agotados</p>
                        <p className="text-white text-3xl font-bold">{outOfStockItems.length}</p>
                    </div>
                </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-1">
                    <h3 className="text-lg font-semibold text-white mb-4">Stock por Almacén</h3>
                     <ul className="space-y-2">
                        {stockByWarehouse.map(w => (
                            <li key={w.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-md">
                                <div>
                                    <span className="text-gray-300 font-semibold">{w.name}</span>
                                    <p className="text-xs text-gray-500">{w.location}</p>
                                </div>
                                <span className="font-bold text-white">{w.total.toLocaleString()}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
                <Card className="lg:col-span-2">
                    <h3 className="text-lg font-semibold text-white mb-4">Alertas de Inventario</h3>
                     {lowStockItems.length > 0 ? (
                        <ul className="space-y-2">
                            {lowStockItems.map(p => (
                                <li key={p.id} className="flex justify-between items-center bg-yellow-900/30 p-3 rounded-md">
                                    <span className="text-gray-300">{p.name} <span className="text-xs text-gray-500">({p.sku})</span></span>
                                    <span className="font-bold text-yellow-400">{p.totalQuantity} unidades</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-400">No hay productos con stock bajo.</p>}
                     {outOfStockItems.length > 0 && <div className="mt-4 pt-4 border-t border-gray-700">
                         <h4 className="text-md font-semibold text-red-400 mb-2">Agotados</h4>
                         <ul className="space-y-2">
                            {outOfStockItems.map(p => (
                                <li key={p.id} className="flex justify-between items-center bg-red-900/30 p-3 rounded-md">
                                    <span className="text-gray-300">{p.name} <span className="text-xs text-gray-500">({p.sku})</span></span>
                                    <span className="font-bold text-red-400">0 unidades</span>
                                </li>
                            ))}
                        </ul>
                    </div>}
                </Card>
            </div>
        </div>
    );
};

const ProductFormModal = ({ product, onClose, onSave }: { product?: Product, onClose: () => void, onSave: (p: Omit<Product, 'id'>) => void }) => {
    const [formData, setFormData] = useState({
        name: product?.name || '',
        sku: product?.sku || '',
        category: product?.category || '',
        price: product?.price || 0,
        lowStockThreshold: product?.lowStockThreshold || 0,
        description: product?.description || '',
    });
    const [images, setImages] = useState<string[]>(product?.images || []);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const type = (e.target instanceof HTMLInputElement) ? e.target.type : 'textarea';
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const remainingSlots = 4 - images.length;
        if (remainingSlots <= 0) return;

        const filesToProcess = files.slice(0, remainingSlots);

        filesToProcess.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setImages(prev => [...prev, event.target.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleRemoveImage = (indexToRemove: number) => {
        setImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...formData,
            images,
        });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={product ? 'Editar Producto' : 'Añadir Producto'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nombre del Producto" name="name" value={formData.name} onChange={handleChange} required />
                <Input label="SKU" name="sku" value={formData.sku} onChange={handleChange} required />
                <Input label="Categoría" name="category" value={formData.category} onChange={handleChange} />
                <Input label="Precio" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} />
                <Input label="Umbral de Stock Bajo" name="lowStockThreshold" type="number" value={formData.lowStockThreshold} onChange={handleChange} />
                <Textarea label="Descripción" name="description" value={formData.description} onChange={handleChange} rows={3} />
                
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Imágenes (hasta 4)</label>
                    <div className="grid grid-cols-4 gap-4 mb-2">
                        {images.map((imgSrc, index) => (
                            <div key={index} className="relative group">
                                <img src={imgSrc} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg bg-gray-700" />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-1 right-1 bg-black bg-opacity-60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        ))}
                    </div>
                    {images.length < 4 && (
                        <>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageUpload}
                                ref={fileInputRef}
                                className="hidden"
                            />
                            <Button type="button" onClick={() => fileInputRef.current?.click()} className="bg-gray-600 hover:bg-gray-700 w-full">
                                {ICONS.upload}
                                Subir Imágenes
                            </Button>
                        </>
                    )}
                </div>

                <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button type="submit">{product ? 'Guardar Cambios' : 'Añadir Producto'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const ProductDetailModal = ({ product, onClose }: { product: Product, onClose: () => void }) => {
    const { inventory, warehouses } = useInventoryState();
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);

    const stockByWarehouse = useMemo(() => {
        return warehouses.map(w => {
            const item = inventory.find(i => i.productId === product.id && i.warehouseId === w.id);
            return {
                warehouseName: w.name,
                quantity: item?.quantity || 0
            };
        }).filter(item => item.quantity > 0);
    }, [product, inventory, warehouses]);

    return (
        <Modal isOpen={true} onClose={onClose} title={product.name}>
            <div className="space-y-4">
                {product.images && product.images.length > 0 && (
                   <div>
                        <img src={product.images[selectedImageIndex]} alt={`${product.name} - ${selectedImageIndex + 1}`} className="w-full h-64 object-cover rounded-lg bg-gray-700 mb-2" />
                        {product.images.length > 1 && (
                            <div className="flex gap-2 justify-center">
                                {product.images.map((imgSrc, index) => (
                                    <img 
                                        key={index}
                                        src={imgSrc} 
                                        alt={`Thumbnail ${index + 1}`} 
                                        onClick={() => setSelectedImageIndex(index)}
                                        className={`w-16 h-16 object-cover rounded-md cursor-pointer border-2 ${selectedImageIndex === index ? 'border-blue-500' : 'border-transparent hover:border-gray-500'}`} 
                                    />
                                ))}
                            </div>
                        )}
                   </div>
                )}
                <div>
                    <h4 className="font-semibold text-white">Descripción</h4>
                    <p className="text-gray-400 mt-1">{product.description || 'No hay descripción disponible.'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm pt-2">
                    <div>
                        <p className="text-gray-500">SKU</p>
                        <p className="font-mono text-white">{product.sku}</p>
                    </div>
                    <div>
                        <p className="text-gray-500">Categoría</p>
                        <p className="text-white">{product.category}</p>
                    </div>
                     <div>
                        <p className="text-gray-500">Precio</p>
                        <p className="font-bold text-lg text-green-400">${product.price.toFixed(2)}</p>
                    </div>
                     <div>
                        <p className="text-gray-500">Umbral Stock Bajo</p>
                        <p className="text-white">{product.lowStockThreshold}</p>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold text-white mt-4 border-t border-gray-700 pt-4">Stock por Almacén</h4>
                    {stockByWarehouse.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                            {stockByWarehouse.map(item => (
                                <li key={item.warehouseName} className="flex justify-between text-gray-300">
                                    <span>{item.warehouseName}</span>
                                    <span className="font-bold">{item.quantity} unidades</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500 mt-2">Este producto no tiene stock en ningún almacén.</p>
                    )}
                </div>
                 <div className="flex justify-end pt-4">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cerrar</Button>
                </div>
            </div>
        </Modal>
    );
};

const AdjustStockModal = ({ product, onClose }: { product: Product, onClose: () => void }) => {
    const { inventory } = useInventoryState();
    const permittedWarehouses = usePermittedWarehouses();
    const dispatch = useInventoryDispatch();
    const [warehouseId, setWarehouseId] = useState(permittedWarehouses[0]?.id || '');
    const [change, setChange] = useState(0);
    const [details, setDetails] = useState('');
    const [type, setType] = useState<LogType>('AJUSTE');

    const currentStock = useMemo(() => {
        return inventory.find(i => i.productId === product.id && i.warehouseId === warehouseId)?.quantity || 0;
    }, [inventory, product, warehouseId]);

    const handleAdjust = () => {
        if (change === 0 || !warehouseId) return;
        dispatch({
            type: 'ADJUST_STOCK',
            payload: {
                productId: product.id,
                warehouseId,
                quantityChange: type === 'SALIDA' ? -Math.abs(change) : Math.abs(change),
                type: type,
                details: details || 'Ajuste manual de stock.'
            }
        });
        onClose();
    };
    
    return (
        <Modal isOpen={true} onClose={onClose} title={`Ajustar Stock de ${product.name}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Almacén</label>
                    <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                        {permittedWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <p className="text-gray-400">Stock Actual en Almacén: <span className="font-bold text-white">{currentStock}</span></p>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Tipo de Movimiento</label>
                    <select value={type} onChange={e => setType(e.target.value as LogType)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                        <option value="ENTRADA">Entrada</option>
                        <option value="SALIDA">Salida</option>
                        <option value="AJUSTE">Ajuste Manual</option>
                    </select>
                </div>
                <Input label={`Cantidad a ${type === 'SALIDA' ? 'Quitar' : 'Añadir'}`} type="number" value={change} onChange={e => setChange(parseInt(e.target.value, 10))} />
                <Input label="Detalles / Razón" value={details} onChange={e => setDetails(e.target.value)} placeholder="Ej: Pedido #123, Devolución, etc."/>
                <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button onClick={handleAdjust}>Confirmar Ajuste</Button>
                </div>
            </div>
        </Modal>
    );
};

const TransferStockModal = ({ product, onClose }: { product: Product, onClose: () => void }) => {
    const { inventory } = useInventoryState();
    const permittedWarehouses = usePermittedWarehouses();
    const dispatch = useInventoryDispatch();

    const [fromWarehouseId, setFromWarehouseId] = useState('');
    const [toWarehouseId, setToWarehouseId] = useState('');
    const [quantity, setQuantity] = useState(0);
    const [details, setDetails] = useState('');

    const fromStock = useMemo(() => {
        return inventory.find(i => i.productId === product.id && i.warehouseId === fromWarehouseId)?.quantity || 0;
    }, [inventory, product.id, fromWarehouseId]);

    const handleTransfer = () => {
        if (quantity <= 0 || !fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId) return;
        dispatch({
            type: 'TRANSFER_STOCK',
            payload: {
                productId: product.id,
                fromWarehouseId,
                toWarehouseId,
                quantity,
                details: details || 'Transferencia entre almacenes.'
            }
        });
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Transferir ${product.name}`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Desde Almacén</label>
                    <select value={fromWarehouseId} onChange={e => setFromWarehouseId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                        <option value="">Seleccione origen...</option>
                        {permittedWarehouses.map(w => <option key={w.id} value={w.id}>{w.name} (Stock: {inventory.find(i => i.productId === product.id && i.warehouseId === w.id)?.quantity || 0})</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Hacia Almacén</label>
                    <select value={toWarehouseId} onChange={e => setToWarehouseId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                        <option value="">Seleccione destino...</option>
                        {permittedWarehouses.filter(w => w.id !== fromWarehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <Input label="Cantidad a Transferir" type="number" value={quantity} onChange={e => setQuantity(Math.max(0, Math.min(fromStock, parseInt(e.target.value, 10))))} max={fromStock} />
                <Input label="Detalles / Razón" value={details} onChange={e => setDetails(e.target.value)} placeholder="Ej: Movimiento interno"/>
                <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button onClick={handleTransfer} disabled={quantity <= 0 || !fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId}>Confirmar Transferencia</Button>
                </div>
            </div>
        </Modal>
    );
};

const ImportProductsModal = ({ onClose }: { onClose: () => void }) => {
    const dispatch = useInventoryDispatch();
    const [parsedData, setParsedData] = useState<{ product: Omit<Product, 'id'>, isValid: boolean, error?: string }[]>([]);
    const [fileName, setFileName] = useState('');
    const [importSummary, setImportSummary] = useState<{ success: number, failed: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDownloadTemplate = () => {
        const headers = ['name', 'sku', 'category', 'price', 'lowStockThreshold', 'description', 'images'];
        const data = [
            ['Taladro de Ejemplo', 'EJEMPLO-001', 'Herramientas', 99.99, 10, 'Descripción de ejemplo para el taladro.', 'https://via.placeholder.com/150, https://via.placeholder.com/150']
        ];
        exportToCsv('plantilla_productos.csv', headers, data as (string|number)[][]);
    };

    const parseCSV = (csvText: string) => {
        try {
            const lines = csvText.trim().split(/\r\n|\n/);
            if (lines.length < 2) {
                setParsedData([]);
                return;
            }
            const headers = lines[0].split(',').map(h => h.trim());
            const dataRows = lines.slice(1);
            
            const processedData = dataRows.map(rowStr => {
                if (!rowStr.trim()) return null;
                const values = rowStr.split(','); // Simplified parsing

                const productData: any = {};
                headers.forEach((header, index) => {
                    productData[header] = values[index]?.trim() || '';
                });

                if (!productData.name || !productData.sku) {
                    return { product: productData, isValid: false, error: 'Nombre y SKU son obligatorios.' };
                }

                return {
                    product: {
                        name: productData.name,
                        sku: productData.sku,
                        category: productData.category || '',
                        price: parseFloat(productData.price) || 0,
                        lowStockThreshold: parseInt(productData.lowStockThreshold, 10) || 0,
                        description: productData.description || '',
                        images: productData.images ? productData.images.split(',').map((s: string) => s.trim()) : [],
                    },
                    isValid: true,
                };
            }).filter(Boolean);

            setParsedData(processedData as { product: Omit<Product, 'id'>, isValid: boolean, error?: string }[]);
        } catch (error) {
            console.error("Error al parsear CSV:", error);
            setParsedData([]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setImportSummary(null);
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            parseCSV(text);
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = () => {
        const validProducts = parsedData.filter(d => d.isValid).map(d => d.product);
        const failedCount = parsedData.length - validProducts.length;
        if (validProducts.length > 0) {
            dispatch({ type: 'BULK_ADD_PRODUCTS', payload: { products: validProducts } });
        }
        setImportSummary({ success: validProducts.length, failed: failedCount });
        setParsedData([]);
        setFileName('');
    };
    
    const validCount = parsedData.filter(d => d.isValid).length;

    return (
        <Modal isOpen={true} onClose={onClose} title="Importar Productos desde CSV" maxWidth="max-w-4xl">
            {importSummary ? (
                 <div className="space-y-4 text-center">
                    <h3 className="text-xl font-bold text-white">Importación Completa</h3>
                    <p className="text-green-400">{importSummary.success} productos importados con éxito.</p>
                    {importSummary.failed > 0 && <p className="text-red-400">{importSummary.failed} filas se omitieron por errores.</p>}
                    <div className="flex justify-center pt-4">
                        <Button onClick={onClose}>Cerrar</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <h4 className="font-semibold text-white">Paso 1: Descargar Plantilla</h4>
                        <p className="text-sm text-gray-400 mt-1 mb-3">Descarga la plantilla para asegurar que tus datos tengan el formato correcto.</p>
                        <Button onClick={handleDownloadTemplate} className="bg-gray-600 hover:bg-gray-700">
                            Descargar Plantilla CSV
                        </Button>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <h4 className="font-semibold text-white">Paso 2: Subir Archivo</h4>
                        <p className="text-sm text-gray-400 mt-1 mb-3">Selecciona el archivo CSV que completaste.</p>
                        <input type="file" accept=".csv" onChange={handleFileChange} ref={fileInputRef} className="hidden" />
                        <div className="flex items-center gap-4">
                            <Button type="button" onClick={() => fileInputRef.current?.click()} className="bg-gray-600 hover:bg-gray-700">
                                {ICONS.upload}
                                Seleccionar Archivo
                            </Button>
                            {fileName && <span className="text-gray-400">{fileName}</span>}
                        </div>
                    </div>
                    {parsedData.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-white mb-2">Paso 3: Previsualizar y Confirmar</h4>
                            <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-800 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2">Estado</th>
                                            <th className="px-4 py-2">Nombre</th>
                                            <th className="px-4 py-2">SKU</th>
                                            <th className="px-4 py-2">Error</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-gray-900">
                                        {parsedData.map((item, index) => (
                                            <tr key={index} className={item.isValid ? '' : 'bg-red-900/50'}>
                                                <td className="px-4 py-2">
                                                    {item.isValid 
                                                        ? <span className="text-green-400 font-semibold">Válido</span> 
                                                        : <span className="text-red-400 font-semibold">Inválido</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-2">{item.product.name}</td>
                                                <td className="px-4 py-2">{item.product.sku}</td>
                                                <td className="px-4 py-2 text-red-400">{item.error}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end pt-4 gap-3">
                        <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                        <Button onClick={handleConfirmImport} disabled={validCount === 0}>
                            Confirmar Importación ({validCount} productos)
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};


const ProductsView = () => {
    const { products, inventory, currentUser } = useInventoryState();
    const dispatch = useInventoryDispatch();
    const [filter, setFilter] = useState('');
    const [modal, setModal] = useState<'add' | 'edit' | 'adjust' | 'detail' | 'transfer' | 'import' | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const canManageProducts = currentUser.role === 'ADMINISTRADOR' || currentUser.role === 'GERENTE';
    const canDeleteProducts = currentUser.role === 'ADMINISTRADOR';


    const productTotals = useMemo(() => {
        return products.map(p => {
            const totalQuantity = inventory
                .filter(item => item.productId === p.id)
                .reduce((sum, item) => sum + item.quantity, 0);
            return { ...p, totalQuantity };
        });
    }, [products, inventory]);

    const handleSave = (productData: Omit<Product, 'id'>) => {
        if (modal === 'add') {
             dispatch({ type: 'ADD_PRODUCT', payload: { product: productData } });
        } else if (selectedProduct) {
            dispatch({ type: 'UPDATE_PRODUCT', payload: { product: { ...productData, id: selectedProduct.id } } });
        }
        setModal(null);
        setSelectedProduct(null);
    };

    const filteredProducts = useMemo(() =>
        productTotals.filter(p =>
            p.name.toLowerCase().includes(filter.toLowerCase()) ||
            p.sku.toLowerCase().includes(filter.toLowerCase()) ||
            p.category.toLowerCase().includes(filter.toLowerCase())
        ).sort((a,b) => a.name.localeCompare(b.name)), [productTotals, filter]
    );

    const getStockStatusClass = (p: { totalQuantity: number, lowStockThreshold: number }) => {
        if (p.totalQuantity === 0) return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (p.totalQuantity <= p.lowStockThreshold) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        return 'bg-green-500/20 text-green-400 border-green-500/30';
    };

    const handleExport = () => {
        const headers = ["Nombre", "SKU", "Categoría", "Stock Total", "Precio", "Umbral Stock Bajo", "Descripción"];
        const data = filteredProducts.map(p => [
            p.name,
            p.sku,
            p.category,
            p.totalQuantity,
            p.price,
            p.lowStockThreshold,
            p.description
        ]);
        exportToCsv('productos.csv', headers, data);
    };

    return (
        <Card>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-white">Gestión de Productos</h2>
                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
                    <Input type="text" placeholder="Buscar producto..." value={filter} onChange={e => setFilter(e.target.value)} label="" className="w-full sm:w-auto" />
                    {canManageProducts && <Button onClick={() => setModal('import')} className="bg-indigo-600 hover:bg-indigo-700">{ICONS.import} Importar</Button>}
                    <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">{ICONS.export} Exportar</Button>
                    {canManageProducts && <Button onClick={() => { setSelectedProduct(null); setModal('add'); }}>{ICONS.plus} Añadir Producto</Button>}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                    <thead className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                        <tr>
                            <th className="px-6 py-3">Nombre</th>
                            <th className="px-6 py-3">SKU</th>
                            <th className="px-6 py-3">Categoría</th>
                            <th className="px-6 py-3 text-right">Stock Total</th>
                            <th className="px-6 py-3 text-right">Precio</th>
                            <th className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => (
                            <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                <td className="px-6 py-4 font-semibold">
                                    <a href="#" onClick={(e) => { e.preventDefault(); setSelectedProduct(p); setModal('detail'); }} className="text-white hover:text-blue-400 transition-colors">
                                        {p.name}
                                    </a>
                                </td>
                                <td className="px-6 py-4 font-mono">{p.sku}</td>
                                <td className="px-6 py-4">{p.category}</td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getStockStatusClass(p)}`}>{p.totalQuantity}</span>
                                </td>
                                <td className="px-6 py-4 text-right">${p.price.toFixed(2)}</td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center space-x-2">
                                        {canManageProducts && <button title="Transferir Stock" onClick={() => { setSelectedProduct(p); setModal('transfer'); }} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors">{ICONS.transfer}</button>}
                                        {canManageProducts && <button title="Ajustar Stock" onClick={() => { setSelectedProduct(p); setModal('adjust'); }} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors">{ICONS.adjust}</button>}
                                        {canManageProducts && <button title="Editar" onClick={() => { setSelectedProduct(p); setModal('edit'); }} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors">{ICONS.edit}</button>}
                                        {canDeleteProducts && <button title="Eliminar" onClick={() => dispatch({type: 'DELETE_PRODUCT', payload: {productId: p.id}})} className="p-2 text-red-500 hover:text-red-400 hover:bg-gray-700 rounded-md transition-colors">{ICONS.trash}</button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {canManageProducts && (modal === 'add' || modal === 'edit') && <ProductFormModal product={selectedProduct || undefined} onClose={() => setModal(null)} onSave={handleSave} />}
            {canManageProducts && modal === 'adjust' && selectedProduct && <AdjustStockModal product={selectedProduct} onClose={() => setModal(null)} />}
            {modal === 'detail' && selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => setModal(null)} />}
            {canManageProducts && modal === 'transfer' && selectedProduct && <TransferStockModal product={selectedProduct} onClose={() => setModal(null)} />}
            {canManageProducts && modal === 'import' && <ImportProductsModal onClose={() => setModal(null)} />}
        </Card>
    );
};

const WarehouseFormModal = ({ onClose, onSave }: { onClose: () => void, onSave: (w: Omit<Warehouse, 'id'>) => void }) => {
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, location });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Añadir Almacén">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nombre del Almacén" value={name} onChange={e => setName(e.target.value)} required />
                <Input label="Ubicación" value={location} onChange={e => setLocation(e.target.value)} required />
                <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button type="submit">Añadir Almacén</Button>
                </div>
            </form>
        </Modal>
    );
};

const WarehousesView = ({ onWarehouseSelect }: { onWarehouseSelect: (id: string) => void }) => {
    const { inventory, products, currentUser } = useInventoryState();
    const permittedWarehouses = usePermittedWarehouses();
    const dispatch = useInventoryDispatch();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSave = (warehouse: Omit<Warehouse, 'id'>) => {
        dispatch({ type: 'ADD_WAREHOUSE', payload: { warehouse } });
        setIsModalOpen(false);
    };

    const getWarehouseStock = (warehouseId: string) => {
        return inventory
            .filter(item => item.warehouseId === warehouseId)
            .reduce((sum, item) => sum + item.quantity, 0);
    };

    const handleExport = () => {
        const headers = ["Almacén", "Ubicación", "SKU", "Producto", "Categoría", "Precio", "Cantidad"];
        const data = inventory.map(item => {
            const warehouse = permittedWarehouses.find(w => w.id === item.warehouseId);
            const product = products.find(p => p.id === item.productId);
            if (!warehouse || !product) return null;
            return [
                warehouse.name,
                warehouse.location,
                product.sku,
                product.name,
                product.category,
                product.price,
                item.quantity
            ];
        }).filter(Boolean) as (string|number)[][];

        exportToCsv('inventario_almacenes.csv', headers, data);
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Gestión de Almacenes</h2>
                <div className="flex items-center gap-4">
                    <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">{ICONS.export} Exportar a CSV</Button>
                    {currentUser.role === 'ADMINISTRADOR' && <Button onClick={() => setIsModalOpen(true)}>{ICONS.plus} Añadir Almacén</Button>}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                    <thead className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                        <tr>
                            <th className="px-6 py-3">Nombre</th>
                            <th className="px-6 py-3">Ubicación</th>
                            <th className="px-6 py-3 text-right">Unidades Totales</th>
                        </tr>
                    </thead>
                    <tbody>
                        {permittedWarehouses.map(w => (
                            <tr key={w.id} className="border-b border-gray-800 hover:bg-gray-800/50 cursor-pointer" onClick={() => onWarehouseSelect(w.id)}>
                                <td className="px-6 py-4 font-semibold text-white">{w.name}</td>
                                <td className="px-6 py-4">{w.location}</td>
                                <td className="px-6 py-4 text-right font-bold">{getWarehouseStock(w.id).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <WarehouseFormModal onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
        </Card>
    );
};

const WarehouseDetailView = ({ warehouseId, onBack }: { warehouseId: string; onBack: () => void }) => {
    const { warehouses, products, inventory } = useInventoryState();

    const warehouse = warehouses.find(w => w.id === warehouseId);

    const warehouseInventory = useMemo(() => {
        return inventory
            .filter(item => item.warehouseId === warehouseId && item.quantity > 0)
            .map(item => {
                const product = products.find(p => p.id === item.productId);
                return { ...item, product };
            })
            .filter(item => item.product); // Asegurarse de que el producto exista
    }, [inventory, products, warehouseId]);

    if (!warehouse) {
        return (
            <Card>
                <p>Almacén no encontrado.</p>
                <Button onClick={onBack} className="mt-4">Volver</Button>
            </Card>
        );
    }

    return (
        <Card>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Detalle de Almacén: {warehouse.name}</h2>
                    <p className="text-gray-400">{warehouse.location}</p>
                </div>
                <Button onClick={onBack} className="bg-gray-600 hover:bg-gray-700">
                    Volver a Almacenes
                </Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                    <thead className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                        <tr>
                            <th className="px-6 py-3">Producto</th>
                            <th className="px-6 py-3">SKU</th>
                            <th className="px-6 py-3 text-right">Cantidad en este Almacén</th>
                        </tr>
                    </thead>
                    <tbody>
                        {warehouseInventory.length > 0 ? warehouseInventory.map(item => (
                            <tr key={item.productId} className="border-b border-gray-800 hover:bg-gray-800/50">
                                <td className="px-6 py-4 font-semibold text-white">{item.product!.name}</td>
                                <td className="px-6 py-4 font-mono">{item.product!.sku}</td>
                                <td className="px-6 py-4 text-right font-bold">{item.quantity.toLocaleString()}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={3} className="text-center py-8 text-gray-500">
                                    Este almacén no tiene productos en stock.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const WarehousesSection = () => {
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);

    if (selectedWarehouseId) {
        return <WarehouseDetailView warehouseId={selectedWarehouseId} onBack={() => setSelectedWarehouseId(null)} />;
    }

    return <WarehousesView onWarehouseSelect={setSelectedWarehouseId} />;
};

const LogView = () => {
    const { logs } = useInventoryState();
    const [searchTerm, setSearchTerm] = useState('');
    const [showColumnFilter, setShowColumnFilter] = useState(false);
    const columnFilterRef = useRef<HTMLDivElement>(null);

    const columnConfig = useMemo(() => ({
        timestamp: { header: "Fecha y Hora" },
        product: { header: "Producto" },
        user: { header: "Usuario" },
        warehouse: { header: "Almacén" },
        type: { header: "Tipo" },
        change: { header: "Cambio" },
        stock: { header: "Stock en Almacén" },
        details: { header: "Detalles" },
    }), []);
    
    type VisibleColumns = Record<keyof typeof columnConfig, boolean>;

    const [visibleColumns, setVisibleColumns] = useState<VisibleColumns>(() => {
        const initial: Partial<VisibleColumns> = {};
        for (const key in columnConfig) {
            initial[key as keyof typeof columnConfig] = true;
        }
        return initial as VisibleColumns;
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (columnFilterRef.current && !columnFilterRef.current.contains(event.target as Node)) {
                setShowColumnFilter(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredLogs = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();
        if (!lowercasedFilter) return logs;
        return logs.filter(log =>
            Object.values(log).some(value => 
                String(value).toLowerCase().includes(lowercasedFilter)
            )
        );
    }, [logs, searchTerm]);

    const getLogTypeClass = (type: LogType) => ({
        'ENTRADA': 'bg-green-500/20 text-green-400',
        'SALIDA': 'bg-red-500/20 text-red-400',
        'AJUSTE': 'bg-yellow-500/20 text-yellow-400',
        'CREACIÓN': 'bg-blue-500/20 text-blue-400',
    }[type]);
    
    const handleExport = () => {
        const activeHeaders = Object.entries(columnConfig)
            .filter(([key]) => visibleColumns[key as keyof VisibleColumns])
            .map(([, config]) => config.header);

        if (activeHeaders.includes("Producto")) {
            const prodIndex = activeHeaders.indexOf("Producto");
            activeHeaders.splice(prodIndex, 1, "Producto", "SKU");
        }
        
        const data = filteredLogs.map(log => {
            const row: (string|number)[] = [];
            if (visibleColumns.timestamp) row.push(new Date(log.timestamp).toLocaleString('es-ES'));
            if (visibleColumns.product) {
                row.push(log.productName);
                row.push(log.sku);
            }
            if (visibleColumns.user) row.push(log.user);
            if (visibleColumns.warehouse) row.push(log.warehouseName);
            if (visibleColumns.type) row.push(log.type);
            if (visibleColumns.change) row.push(log.quantityChange);
            if (visibleColumns.stock) row.push(log.newQuantityInWarehouse);
            if (visibleColumns.details) row.push(log.details);
            return row;
        });

        exportToCsv('registro_movimientos.csv', activeHeaders, data);
    };

    const toggleColumn = (key: keyof VisibleColumns) => {
        setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <Card>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-white">Registro de Movimientos</h2>
                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
                     <Input
                        type="text"
                        placeholder="Buscar en registros..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        label=""
                        className="w-full sm:w-auto"
                    />
                    <div className="relative" ref={columnFilterRef}>
                        <Button onClick={() => setShowColumnFilter(prev => !prev)} className="bg-gray-600 hover:bg-gray-700">
                            {ICONS.filter}
                            Columnas
                        </Button>
                        {showColumnFilter && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
                                <ul className="p-2 space-y-1">
                                    {Object.entries(columnConfig).map(([key, config]) => (
                                         <li key={key}>
                                            <label className="flex items-center space-x-3 cursor-pointer px-2 py-1 rounded-md hover:bg-gray-700">
                                                <input 
                                                    type="checkbox" 
                                                    checked={visibleColumns[key as keyof VisibleColumns]}
                                                    onChange={() => toggleColumn(key as keyof VisibleColumns)}
                                                    className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-gray-300 text-sm">{config.header}</span>
                                            </label>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <Button onClick={handleExport} className="bg-green-600 hover:bg-green-700">{ICONS.export} Exportar</Button>
                </div>
            </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                    <thead className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                        <tr>
                            {Object.entries(columnConfig).map(([key, config]) => 
                                visibleColumns[key as keyof VisibleColumns] && (
                                    <th key={key} className={`px-6 py-3 ${(key === 'change' || key === 'stock') ? 'text-center' : ''}`}>{config.header}</th>
                                )
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.map(log => (
                            <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                {visibleColumns.timestamp && <td className="px-6 py-4 font-mono text-sm">{new Date(log.timestamp).toLocaleString()}</td>}
                                {visibleColumns.product && <td className="px-6 py-4">
                                    <div className="font-semibold text-white">{log.productName}</div>
                                    <div className="text-xs text-gray-400 font-mono">{log.sku}</div>
                                </td>}
                                {visibleColumns.user && <td className="px-6 py-4">{log.user}</td>}
                                {visibleColumns.warehouse && <td className="px-6 py-4">{log.warehouseName}</td>}
                                {visibleColumns.type && <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getLogTypeClass(log.type)}`}>{log.type}</span>
                                </td>}
                                {visibleColumns.change && <td className={`px-6 py-4 text-center font-bold ${log.quantityChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                                </td>}
                                {visibleColumns.stock && <td className="px-6 py-4 text-center font-bold text-white">{log.newQuantityInWarehouse}</td>}
                                {visibleColumns.details && <td className="px-6 py-4 text-sm text-gray-400">{log.details}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

const UserFormModal = ({ user, onClose, onSave }: { user?: User, onClose: () => void, onSave: (data: { user: Omit<User, 'id'> | User, warehouseIds: string[] }) => void }) => {
    const { warehouses, userWarehouseAccess } = useInventoryState();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || 'EMPLEADO' as UserRole,
    });
    const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>(() => {
        if (!user) return [];
        return userWarehouseAccess.filter(access => access.userId === user.id).map(access => access.warehouseId);
    });

    const handleWarehouseToggle = (warehouseId: string) => {
        setSelectedWarehouses(prev => 
            prev.includes(warehouseId) 
                ? prev.filter(id => id !== warehouseId) 
                : [...prev, warehouseId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userData = user ? { ...user, ...formData } : { ...formData };
        onSave({ user: userData, warehouseIds: formData.role === 'ADMINISTRADOR' ? [] : selectedWarehouses });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={user ? 'Editar Usuario' : 'Añadir Usuario'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nombre Completo" name="name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} required />
                <Input label="Correo Electrónico" name="email" type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} required />
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Rol</label>
                    <select value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value as UserRole }))} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                        <option value="ADMINISTRADOR">Administrador</option>
                        <option value="GERENTE">Gerente</option>
                        <option value="EMPLEADO">Empleado</option>
                    </select>
                </div>
                {formData.role !== 'ADMINISTRADOR' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Permisos de Almacén</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-gray-800 rounded-md">
                            {warehouses.map(w => (
                                <label key={w.id} className="flex items-center space-x-3 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedWarehouses.includes(w.id)}
                                        onChange={() => handleWarehouseToggle(w.id)}
                                        className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-gray-300">{w.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button type="submit">{user ? 'Guardar Cambios' : 'Añadir Usuario'}</Button>
                </div>
            </form>
        </Modal>
    );
};

const UsersView = () => {
    const { users, currentUser } = useInventoryState();
    const dispatch = useInventoryDispatch();
    const [modal, setModal] = useState<'add' | 'edit' | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const handleSave = (data: { user: Omit<User, 'id'> | User, warehouseIds: string[] }) => {
        if (modal === 'add') {
            dispatch({ type: 'ADD_USER', payload: { user: data.user as Omit<User, 'id'>, warehouseIds: data.warehouseIds } });
        } else if (selectedUser) {
            dispatch({ type: 'UPDATE_USER', payload: { user: data.user as User, warehouseIds: data.warehouseIds } });
        }
        setModal(null);
    };

    const getRoleClass = (role: UserRole) => ({
        'ADMINISTRADOR': 'bg-purple-500/20 text-purple-400',
        'GERENTE': 'bg-blue-500/20 text-blue-400',
        'EMPLEADO': 'bg-gray-500/20 text-gray-400',
    }[role]);

    return (
        <Card>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Gestión de Usuarios</h2>
                <Button onClick={() => { setSelectedUser(null); setModal('add'); }}>{ICONS.plus} Añadir Usuario</Button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-300">
                    <thead className="border-b border-gray-700 text-xs text-gray-400 uppercase">
                        <tr>
                            <th className="px-6 py-3">Nombre</th>
                            <th className="px-6 py-3">Correo Electrónico</th>
                            <th className="px-6 py-3">Rol</th>
                            <th className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                <td className="px-6 py-4 font-semibold text-white">{u.name}</td>
                                <td className="px-6 py-4">{u.email}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleClass(u.role)}`}>{u.role}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex justify-center space-x-2">
                                        <button title="Editar" onClick={() => { setSelectedUser(u); setModal('edit'); }} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors">{ICONS.edit}</button>
                                        {u.id !== currentUser.id && (
                                            <button title="Eliminar" onClick={() => dispatch({type: 'DELETE_USER', payload: {userId: u.id}})} className="p-2 text-red-500 hover:text-red-400 hover:bg-gray-700 rounded-md transition-colors">{ICONS.trash}</button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {(modal === 'add' || modal === 'edit') && <UserFormModal user={selectedUser || undefined} onClose={() => setModal(null)} onSave={handleSave} />}
        </Card>
    );
};

// Estructura Principal de la App
const AppContent = () => {
    const [view, setView] = useState<View>('dashboard');
    const { currentUser } = useInventoryState();

    const navItems: { id: View, name: string, icon: React.ReactNode }[] = [
        { id: 'dashboard', name: 'Dashboard', icon: ICONS.dashboard },
        { id: 'products', name: 'Productos', icon: ICONS.product },
        { id: 'warehouses', name: 'Almacenes', icon: ICONS.warehouse },
        { id: 'users', name: 'Usuarios', icon: ICONS.users },
        { id: 'log', name: 'Registro', icon: ICONS.log },
    ];

    const visibleNavItems = navItems.filter(item => 
        item.id !== 'users' || currentUser.role === 'ADMINISTRADOR'
    );

    const renderView = () => {
        switch (view) {
            case 'dashboard': return <DashboardView />;
            case 'products': return <ProductsView />;
            case 'warehouses': return <WarehousesSection />;
            case 'log': return <LogView />;
            case 'users': return currentUser.role === 'ADMINISTRADOR' ? <UsersView /> : <DashboardView/>;
            default: return <DashboardView />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-300">
            <aside className="w-64 flex-shrink-0 bg-gray-800 p-4">
                <div className="flex items-center mb-10 h-16 px-2">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-blue-500 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5M12 14.25a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H3.375a2.25 2.25 0 0 0-2.25 2.25v10.5a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
                   <span className="text-xl font-semibold text-white">Inventario Simple</span>
                </div>
                <nav>
                    <ul className="space-y-2">
                        {visibleNavItems.map(item => (
                            <li key={item.id}>
                                <a href="#" onClick={(e) => { e.preventDefault(); setView(item.id); }} 
                                   className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${view === item.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
                                    {item.icon}
                                    <span>{item.name}</span>
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            </aside>
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="bg-gray-800 border-b border-gray-700 p-4 flex justify-end items-center">
                    <div className="text-right">
                        <p className="font-semibold text-white">{currentUser.name}</p>
                        <p className="text-xs text-gray-400">{currentUser.role}</p>
                    </div>
                </header>
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-8">
                    {renderView()}
                </main>
            </div>
        </div>
    );
}

const LoadingScreen = () => (
    <div className="bg-gray-900 min-h-screen flex flex-col justify-center items-center text-white">
        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg mt-4">Cargando Sistema de Inventario...</p>
    </div>
);

const App = () => {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            if (typeof window.QRious === 'function') {
                setIsReady(true);
                clearInterval(interval);
            }
        }, 100);
        return () => clearInterval(interval);
    }, []);

    if (!isReady) {
        return <LoadingScreen />;
    }

    return <AppContent />;
};

export default App;