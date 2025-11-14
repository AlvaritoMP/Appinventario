import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Product, LogEntry, View, LogType, Warehouse, User, UserRole, AppSettings } from './types';
import { useInventoryState, useInventoryDispatch } from './context/InventoryContext';
import { ICONS } from './constants';
import { SettingsView } from './components/SettingsView';
import { MovementDocumentModal } from './components/MovementDocumentModal';
import { BulkTransferModal } from './components/BulkTransferModal';
import { SuppliersView } from './components/SuppliersView';
import { PurchaseOrdersView } from './components/PurchaseOrdersView';
import { PurchaseCalendarView } from './components/PurchaseCalendarView';


declare global {
  interface Window { QRious: any; }
}

// Hook para obtener los almacenes permitidos para el usuario actual
const usePermittedWarehouses = () => {
    const { warehouses, currentUser, userWarehouseAccess } = useInventoryState();
    
    return useMemo(() => {
        if (!currentUser) return [];
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
const Card = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6 ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-lg' }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode, maxWidth?: string }) => {
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

const Button = ({ children, onClick, className = 'bg-blue-600 hover:bg-blue-700', type = 'button', disabled = false, title }: { children?: React.ReactNode, onClick?: () => void, className?: string, type?: 'button' | 'submit' | 'reset', disabled?: boolean, title?: string }) => (
  <button type={type} onClick={onClick} disabled={disabled} title={title} className={`flex items-center justify-center gap-2 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input {...props} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 transition" />
    </div>
);

const Textarea = ({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <textarea {...props} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 transition" />
    </div>
);

// Vistas de la Aplicación
const DashboardView = ({ onGenerateSuggestedPO }: { onGenerateSuggestedPO: (products: Product[]) => void }) => {
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
                 {currentUser?.role === 'ADMINISTRADOR' && (
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
                     {lowStockItems.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-md font-semibold text-yellow-400 mb-2">Productos con Stock Bajo</h4>
                            <ul className="space-y-2">
                                {lowStockItems.slice(0, 3).map(p => (
                                    <li key={p.id} className="flex justify-between items-center bg-yellow-900/30 p-3 rounded-md">
                                        <span className="text-gray-300">{p.name} <span className="text-xs text-gray-500">({p.sku})</span></span>
                                        <span className="font-bold text-yellow-400">{p.totalQuantity} unidades</span>
                                    </li>
                                ))}
                            </ul>
                            <Button 
                                onClick={() => onGenerateSuggestedPO(lowStockItems)}
                                className="w-full mt-4 bg-yellow-600 hover:bg-yellow-700">
                                Generar OC Sugerida
                            </Button>
                        </div>
                     )}
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
                    {lowStockItems.length === 0 && outOfStockItems.length === 0 && <p className="text-gray-400">No hay alertas de inventario.</p>}
                </Card>
            </div>
        </div>
    );
};

const ProductFormModal = ({ product, onClose, onSave }: { product?: Product, onClose: () => void, onSave: (p: Omit<Product, 'id'>) => void }) => {
    const { settings } = useInventoryState();
    const [formData, setFormData] = useState({
        name: product?.name || '',
        sku: product?.sku || '',
        category: product?.category || '',
        price: product?.price || 0,
        lowStockThreshold: product?.lowStockThreshold || settings.alerts.defaultLowStockThreshold || 0,
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
        const files: File[] = Array.from(e.target.files || []);
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
                        <p className="text-gray-400 mt-2">Este producto no tiene stock en ningún almacén.</p>
                    )}
                </div>
                <div className="flex justify-end pt-4">
                     <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cerrar</Button>
                </div>
            </div>
        </Modal>
    );
};

const ProductsView = () => {
    const { products, inventory, warehouses, settings } = useInventoryState();
    const dispatch = useInventoryDispatch();
    const permittedWarehouses = usePermittedWarehouses();

    const [modal, setModal] = useState<'add' | 'edit' | 'detail' | 'adjust' | 'transfer' | 'bulk-transfer' | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ category: '', stockStatus: '' });
    const [showFilters, setShowFilters] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const productTotals = useMemo(() => {
        return products.map(p => {
            const totalQuantity = inventory
                .filter(item => item.productId === p.id)
                .reduce((sum, item) => sum + item.quantity, 0);
            return { ...p, totalQuantity };
        });
    }, [products, inventory]);

    const filteredProducts = useMemo(() => {
        return productTotals.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = filters.category ? p.category === filters.category : true;
            
            const matchesStock = () => {
                if (!filters.stockStatus) return true;
                if (filters.stockStatus === 'inStock') return p.totalQuantity > p.lowStockThreshold;
                if (filters.stockStatus === 'lowStock') return p.totalQuantity > 0 && p.totalQuantity <= p.lowStockThreshold;
                if (filters.stockStatus === 'outOfStock') return p.totalQuantity === 0;
                return true;
            };

            return matchesSearch && matchesCategory && matchesStock();
        });
    }, [productTotals, searchTerm, filters]);

    const categories = useMemo(() => [...new Set(products.map(p => p.category))], [products]);

    const handleSaveProduct = (productData: Omit<Product, 'id'>) => {
        if (selectedProduct) {
            dispatch({ type: 'UPDATE_PRODUCT', payload: { product: { ...selectedProduct, ...productData } } });
        } else {
            dispatch({ type: 'ADD_PRODUCT', payload: { product: productData } });
        }
        setModal(null);
        setSelectedProduct(null);
    };

    const handleAdjustStock = (productId: string, warehouseId: string, quantityChange: number, type: LogType, details: string) => {
        dispatch({ type: 'ADJUST_STOCK', payload: { productId, warehouseId, quantityChange, type, details } });
        setModal(null);
    };

    const handleTransferStock = (productId: string, fromWarehouseId: string, toWarehouseId: string, quantity: number, details: string) => {
        dispatch({ type: 'TRANSFER_STOCK', payload: { productId, fromWarehouseId, toWarehouseId, quantity, details } });
        setModal(null);
    };

    const getStockStatus = (product: Product & { totalQuantity: number }) => {
        if (product.totalQuantity === 0) return { text: 'Agotado', className: settings.colors.outOfStock };
        if (product.totalQuantity <= product.lowStockThreshold) return { text: 'Stock Bajo', className: settings.colors.lowStock };
        return { text: 'En Stock', className: settings.colors.inStock };
    };

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n').slice(1); // Omitir encabezado
            const newProducts: Omit<Product, 'id' | 'images'>[] = [];

            lines.forEach(line => {
                if (line.trim() === '') return;
                const [name, sku, category, priceStr, lowStockThresholdStr, description] = line.split(',');
                const price = parseFloat(priceStr);
                const lowStockThreshold = parseInt(lowStockThresholdStr, 10);
                if (name && sku && !isNaN(price) && !isNaN(lowStockThreshold)) {
                    newProducts.push({
                        name: name.trim(),
                        sku: sku.trim(),
                        category: category.trim(),
                        price,
                        lowStockThreshold,
                        description: description ? description.trim() : '',
                    });
                }
            });

            if (newProducts.length > 0) {
                 dispatch({ type: 'BULK_ADD_PRODUCTS', payload: { products: newProducts.map(p => ({...p, images:[]})) } });
                 alert(`${newProducts.length} productos importados con éxito.`);
            } else {
                 alert('No se pudieron importar productos. Revise el formato del CSV.');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    };

    const handleExportCSV = () => {
        const headers = ["ID", "SKU", "Nombre", "Categoría", "Precio", "Umbral Stock Bajo", "Stock Total", "Descripción"];
        const data = filteredProducts.map(p => [
            p.id,
            p.sku,
            p.name,
            p.category,
            p.price,
            p.lowStockThreshold,
            p.totalQuantity,
            p.description
        ]);
        exportToCsv('productos.csv', headers, data);
    };

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-white">Gestión de Productos</h1>
                <div className="flex flex-wrap gap-2 justify-center md:justify-end">
                    <Button onClick={() => setModal('add')} className="bg-blue-600 hover:bg-blue-700">
                        {ICONS.plus}
                        Añadir Producto
                    </Button>
                    <Button onClick={() => setModal('bulk-transfer')} className="bg-fuchsia-600 hover:bg-fuchsia-700">
                        {ICONS.transfer}
                        Transferencia Múltiple
                    </Button>
                </div>
            </div>

            <Card>
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full md:flex-1 bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                     <div className="flex gap-2">
                        <Button onClick={() => setShowFilters(!showFilters)} className="bg-gray-600 hover:bg-gray-700">
                            {ICONS.filter}
                            Filtros
                        </Button>
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
                        <Button onClick={() => fileInputRef.current?.click()} className="bg-gray-600 hover:bg-gray-700">
                            {ICONS.import}
                            Importar
                        </Button>
                        <Button onClick={handleExportCSV} className="bg-gray-600 hover:bg-gray-700">
                            {ICONS.export}
                            Exportar
                        </Button>
                    </div>
                </div>

                {showFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-gray-900/50 rounded-lg">
                        <select
                            value={filters.category}
                            onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
                        >
                            <option value="">Todas las Categorías</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select
                            value={filters.stockStatus}
                            onChange={e => setFilters(f => ({ ...f, stockStatus: e.target.value }))}
                             className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
                        >
                            <option value="">Todo el Stock</option>
                            <option value="inStock">En Stock</option>
                            <option value="lowStock">Stock Bajo</option>
                            <option value="outOfStock">Agotado</option>
                        </select>
                    </div>
                )}
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-700 text-sm text-gray-400">
                            <tr>
                                <th className="p-4">Producto</th>
                                <th className="p-4">Categoría</th>
                                <th className="p-4 text-right">Precio</th>
                                <th className="p-4 text-center">Stock Total</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(p => {
                                const status = getStockStatus(p);
                                return (
                                    <tr key={p.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img src={p.images?.[0] || `https://via.placeholder.com/40x40.png/2d3748/ffffff?text=${p.name.charAt(0)}`} alt={p.name} className="w-10 h-10 rounded-md object-cover bg-gray-700" />
                                                <div>
                                                    <p className="font-semibold text-white cursor-pointer" onClick={() => { setSelectedProduct(p); setModal('detail'); }}>{p.name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{p.sku}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-gray-400">{p.category}</td>
                                        <td className="p-4 text-right text-white font-semibold">${p.price.toFixed(2)}</td>
                                        <td className="p-4 text-center text-white font-bold text-lg">{p.totalQuantity}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${status.className}`}>
                                                {status.text}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center items-center gap-2">
                                                <Button onClick={() => { setSelectedProduct(p); setModal('edit'); }} title="Editar Producto" className="bg-gray-700 hover:bg-gray-600 p-2"><span className="sr-only">Editar</span>{ICONS.edit}</Button>
                                                <Button onClick={() => { setSelectedProduct(p); setModal('adjust'); }} title="Ajustar Stock" className="bg-gray-700 hover:bg-gray-600 p-2"><span className="sr-only">Ajustar</span>{ICONS.adjust}</Button>
                                                <Button onClick={() => { setSelectedProduct(p); setModal('transfer'); }} title="Transferir Stock" className="bg-gray-700 hover:bg-gray-600 p-2"><span className="sr-only">Transferir</span>{ICONS.transfer}</Button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                 {filteredProducts.length === 0 && (
                    <div className="text-center py-10">
                        <p className="text-gray-400">No se encontraron productos que coincidan con la búsqueda o los filtros.</p>
                    </div>
                )}
            </Card>

            {modal === 'add' && <ProductFormModal onClose={() => { setModal(null); setSelectedProduct(null); }} onSave={handleSaveProduct} />}
            {modal === 'edit' && selectedProduct && <ProductFormModal product={selectedProduct} onClose={() => { setModal(null); setSelectedProduct(null); }} onSave={handleSaveProduct} />}
            {modal === 'detail' && selectedProduct && <ProductDetailModal product={selectedProduct} onClose={() => { setModal(null); setSelectedProduct(null); }} />}
            {modal === 'adjust' && selectedProduct && <StockAdjustModal product={selectedProduct} warehouses={permittedWarehouses} onAdjust={handleAdjustStock} onClose={() => { setModal(null); setSelectedProduct(null); }} />}
            {modal === 'transfer' && selectedProduct && <StockTransferModal product={selectedProduct} warehouses={permittedWarehouses} onTransfer={handleTransferStock} onClose={() => { setModal(null); setSelectedProduct(null); }} />}
            {modal === 'bulk-transfer' && <BulkTransferModal onClose={() => setModal(null)} />}
        </div>
    );
};

const StockAdjustModal = ({ product, warehouses, onAdjust, onClose }: { product: Product, warehouses: Warehouse[], onAdjust: (productId: string, warehouseId: string, quantityChange: number, type: LogType, details: string) => void, onClose: () => void }) => {
    const { inventory } = useInventoryState();
    const [warehouseId, setWarehouseId] = useState('');
    const [quantityChange, setQuantityChange] = useState(0);
    const [type, setType] = useState<LogType>('AJUSTE');
    const [details, setDetails] = useState('');

    const currentStock = useMemo(() => {
        if (!warehouseId) return 0;
        return inventory.find(i => i.productId === product.id && i.warehouseId === warehouseId)?.quantity || 0;
    }, [inventory, product.id, warehouseId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!warehouseId || quantityChange === 0) return;
        onAdjust(product.id, warehouseId, quantityChange, type, details);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Ajustar Stock de: ${product.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Almacén</label>
                    <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                        <option value="">Seleccione un almacén...</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                    {warehouseId && <p className="text-xs text-gray-500 mt-1">Stock actual en este almacén: <strong>{currentStock}</strong></p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Tipo de Ajuste</label>
                     <select value={type} onChange={e => setType(e.target.value as LogType)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                        <option value="AJUSTE">Ajuste Manual</option>
                        <option value="ENTRADA">Entrada (Compra/Devolución)</option>
                        <option value="SALIDA">Salida (Venta/Pérdida)</option>
                    </select>
                </div>
                <Input label="Cantidad a Modificar (+/-)" type="number" value={quantityChange} onChange={e => setQuantityChange(parseInt(e.target.value, 10) || 0)} required />
                <Textarea label="Razón del Ajuste / Detalles" value={details} onChange={e => setDetails(e.target.value)} rows={2} required />
                 {warehouseId && (
                    <div className="p-3 bg-gray-800 rounded-lg text-center">
                        <p className="text-gray-400 text-sm">El nuevo stock será:</p>
                        <p className="text-2xl font-bold text-white">{Math.max(0, currentStock + quantityChange)}</p>
                    </div>
                )}
                <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button type="submit">Confirmar Ajuste</Button>
                </div>
            </form>
        </Modal>
    );
};

const StockTransferModal = ({ product, warehouses, onTransfer, onClose }: { product: Product, warehouses: Warehouse[], onTransfer: (productId: string, from: string, to: string, qty: number, details: string) => void, onClose: () => void }) => {
    const { inventory } = useInventoryState();
    const [fromWarehouseId, setFromWarehouseId] = useState('');
    const [toWarehouseId, setToWarehouseId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [details, setDetails] = useState('');

    const maxQuantity = useMemo(() => {
        if (!fromWarehouseId) return 0;
        return inventory.find(i => i.productId === product.id && i.warehouseId === fromWarehouseId)?.quantity || 0;
    }, [inventory, product.id, fromWarehouseId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromWarehouseId || !toWarehouseId || quantity <= 0 || fromWarehouseId === toWarehouseId) return;
        onTransfer(product.id, fromWarehouseId, toWarehouseId, quantity, details);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={`Transferir: ${product.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Desde Almacén (Origen)</label>
                    <select value={fromWarehouseId} onChange={e => setFromWarehouseId(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                        <option value="">Seleccione origen...</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                     {fromWarehouseId && <p className="text-xs text-gray-500 mt-1">Stock disponible para transferir: <strong>{maxQuantity}</strong></p>}
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Hacia Almacén (Destino)</label>
                    <select value={toWarehouseId} onChange={e => setToWarehouseId(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2" disabled={!fromWarehouseId}>
                        <option value="">Seleccione destino...</option>
                        {warehouses.filter(w => w.id !== fromWarehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <Input label="Cantidad a Transferir" type="number" value={quantity} onChange={e => setQuantity(Math.max(1, Math.min(maxQuantity, parseInt(e.target.value) || 1)))} min="1" max={maxQuantity} required disabled={!fromWarehouseId || maxQuantity === 0} />
                <Textarea label="Detalles de la Transferencia" value={details} onChange={e => setDetails(e.target.value)} rows={2} />
                <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button type="submit" disabled={!fromWarehouseId || !toWarehouseId || quantity <= 0 || fromWarehouseId === toWarehouseId || quantity > maxQuantity}>Confirmar Transferencia</Button>
                </div>
            </form>
        </Modal>
    );
};

const LogView = () => {
    const { logs } = useInventoryState();
    type DocumentType = 'CONSTANCIA' | 'GUIA_DESPACHO' | 'GUIA_REMISION';
    const [documentToView, setDocumentToView] = useState<{ logEntries: LogEntry[], type: DocumentType } | null>(null);

    const handleOpenDocument = (type: DocumentType, logEntries: LogEntry[]) => {
        setDocumentToView({ logEntries, type });
    };

    const groupedLogs = useMemo(() => {
        const groups: { [key: string]: LogEntry[] } = {};
        logs.forEach(log => {
            if (log.transactionId) {
                if (!groups[log.transactionId]) {
                    groups[log.transactionId] = [];
                }
                groups[log.transactionId].push(log);
            }
        });
        return groups;
    }, [logs]);

    const renderedLogIds = new Set<string>();
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white">Registro de Movimientos</h1>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                         <thead className="border-b border-gray-700 text-sm text-gray-400">
                            <tr>
                                <th className="p-4">Fecha y Hora</th>
                                <th className="p-4">Producto</th>
                                <th className="p-4">Almacén</th>
                                <th className="p-4">Tipo</th>
                                <th className="p-4 text-center">Cambio</th>
                                <th className="p-4 text-center">Stock Final</th>
                                <th className="p-4">Detalles</th>
                                <th className="p-4">Usuario</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => {
                                if (renderedLogIds.has(log.id)) {
                                    return null;
                                }

                                if (log.transactionId && groupedLogs[log.transactionId]) {
                                    const transactionLogs = groupedLogs[log.transactionId];
                                    const firstLog = transactionLogs[0];
                                    const fromWarehouse = transactionLogs.find(l => l.type === 'SALIDA')?.warehouseName || 'N/A';
                                    const toWarehouse = transactionLogs.find(l => l.type === 'ENTRADA')?.warehouseName || 'N/A';
                                    
                                    transactionLogs.forEach(l => renderedLogIds.add(l.id));

                                    return (
                                        <React.Fragment key={log.transactionId}>
                                            <tr className="border-b border-gray-700 bg-gray-800/60 font-semibold">
                                                <td className="p-4 whitespace-nowrap">{new Date(firstLog.timestamp).toLocaleString()}</td>
                                                <td className="p-4" colSpan={3}>
                                                    Transferencia Múltiple
                                                    <p className="text-xs font-normal text-gray-400">{fromWarehouse} &rarr; {toWarehouse}</p>
                                                </td>
                                                <td className="p-4 text-center" colSpan={2}>({transactionLogs.length / 2} productos)</td>
                                                <td className="p-4">{firstLog.details}</td>
                                                <td className="p-4">{firstLog.user}</td>
                                                <td className="p-4">
                                                    <div className="flex justify-center items-center gap-1">
                                                        <Button onClick={() => handleOpenDocument('CONSTANCIA', groupedLogs[log.transactionId])} title="Generar Constancia" className="text-xs p-1.5 bg-gray-700 hover:bg-gray-600">{ICONS.document}</Button>
                                                        <Button onClick={() => handleOpenDocument('GUIA_DESPACHO', groupedLogs[log.transactionId])} title="Generar Guía de Despacho" className="text-xs p-1.5 bg-teal-700 hover:bg-teal-600">{ICONS.document}</Button>
                                                        <Button onClick={() => handleOpenDocument('GUIA_REMISION', groupedLogs[log.transactionId])} title="Generar Guía de Remisión" className="text-xs p-1.5 bg-purple-700 hover:bg-purple-600">{ICONS.qr}</Button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {transactionLogs.map(l => (
                                                <tr key={l.id} className="border-b border-gray-800 hover:bg-gray-800/50 text-sm text-gray-400">
                                                    <td className="pl-8 py-2 pr-4 text-xs whitespace-nowrap">&rdsh; {new Date(l.timestamp).toLocaleTimeString()}</td>
                                                    <td className="p-2">{l.productName}<p className="text-xs text-gray-500 font-mono">{l.sku}</p></td>
                                                    <td className="p-2">{l.warehouseName}</td>
                                                    <td className="p-2">
                                                        <span className={`px-2 py-0.5 text-xs rounded-full ${l.type === 'ENTRADA' ? 'bg-green-500/20 text-green-400' : l.type === 'SALIDA' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>{l.type}</span>
                                                    </td>
                                                    <td className={`p-2 text-center font-semibold ${l.quantityChange > 0 ? 'text-green-400' : 'text-red-400'}`}>{l.quantityChange > 0 ? `+${l.quantityChange}` : l.quantityChange}</td>
                                                    <td className="p-2 text-center font-semibold text-white">{l.newQuantityInWarehouse}</td>
                                                    <td className="p-2 italic text-xs" colSpan={3}>ID Transacción: {log.transactionId}</td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                }
                                
                                renderedLogIds.add(log.id);
                                return (
                                    <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="p-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                        <td className="p-4">
                                            <p className="font-semibold text-white">{log.productName}</p>
                                            <p className="text-xs text-gray-500 font-mono">{log.sku}</p>
                                        </td>
                                        <td className="p-4">{log.warehouseName}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${log.type === 'ENTRADA' || log.type === 'CREACIÓN' ? 'bg-green-500/20 text-green-400' : log.type === 'SALIDA' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                {log.type}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-center font-bold ${log.quantityChange > 0 ? 'text-green-400' : 'text-red-400'}`}>{log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange !== 0 ? log.quantityChange : '-'}</td>
                                        <td className="p-4 text-center font-bold text-white">{log.newQuantityInWarehouse}</td>
                                        <td className="p-4 text-sm text-gray-400 italic">{log.details}</td>
                                        <td className="p-4 text-sm text-gray-300">{log.user}</td>
                                        <td className="p-4">
                                            <div className="flex justify-center items-center gap-1">
                                                <Button onClick={() => handleOpenDocument('CONSTANCIA', [log])} title="Generar Constancia" className="text-xs p-1.5 bg-gray-700 hover:bg-gray-600">{ICONS.document}</Button>
                                                {(log.type === 'SALIDA' || log.type === 'AJUSTE') &&
                                                    <>
                                                        <Button onClick={() => handleOpenDocument('GUIA_DESPACHO', [log])} title="Generar Guía de Despacho" className="text-xs p-1.5 bg-teal-700 hover:bg-teal-600">{ICONS.document}</Button>
                                                        <Button onClick={() => handleOpenDocument('GUIA_REMISION', [log])} title="Generar Guía de Remisión" className="text-xs p-1.5 bg-purple-700 hover:bg-purple-600">{ICONS.qr}</Button>
                                                    </>
                                                }
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            {documentToView && (
                <MovementDocumentModal
                    logEntries={documentToView.logEntries}
                    docType={documentToView.type}
                    onClose={() => setDocumentToView(null)}
                />
            )}
        </div>
    );
};

const WarehouseFormModal = ({ onClose, onSave }: { onClose: () => void, onSave: (warehouse: Omit<Warehouse, 'id'>) => void }) => {
    const [name, setName] = useState('');
    const [location, setLocation] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, location });
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Añadir Nuevo Almacén">
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nombre del Almacén" value={name} onChange={e => setName(e.target.value)} required />
                <Input label="Ubicación" value={location} onChange={e => setLocation(e.target.value)} required />
                <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button type="submit">Guardar Almacén</Button>
                </div>
            </form>
        </Modal>
    );
};

const WarehousesView = () => {
    const { warehouses } = useInventoryState();
    const dispatch = useInventoryDispatch();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSaveWarehouse = (warehouse: Omit<Warehouse, 'id'>) => {
        dispatch({ type: 'ADD_WAREHOUSE', payload: { warehouse } });
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Gestión de Almacenes</h1>
                <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    {ICONS.plus}
                    Añadir Almacén
                </Button>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-700 text-sm text-gray-400">
                            <tr>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Ubicación</th>
                            </tr>
                        </thead>
                        <tbody>
                            {warehouses.map(warehouse => (
                                <tr key={warehouse.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                    <td className="p-4 font-semibold text-white">{warehouse.name}</td>
                                    <td className="p-4 text-gray-400">{warehouse.location}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            {isModalOpen && <WarehouseFormModal onClose={() => setIsModalOpen(false)} onSave={handleSaveWarehouse} />}
        </div>
    );
};

const UsersView = () => {
    const { users, userWarehouseAccess, warehouses } = useInventoryState();
    const dispatch = useInventoryDispatch();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleOpenModal = (user: User | null = null) => {
        setEditingUser(user);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setEditingUser(null);
        setIsModalOpen(false);
    };

    const handleSaveUser = (user: Omit<User, 'id'> | User, warehouseIds: string[]) => {
        if ('id' in user) {
            dispatch({ type: 'UPDATE_USER', payload: { user, warehouseIds } });
        } else {
            dispatch({ type: 'ADD_USER', payload: { user, warehouseIds } });
        }
        handleCloseModal();
    };
    
    const handleDeleteUser = (userId: string) => {
        if (window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
            dispatch({ type: 'DELETE_USER', payload: { userId } });
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
                <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
                    {ICONS.plus}
                    Añadir Usuario
                </Button>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-700 text-sm text-gray-400">
                            <tr>
                                <th className="p-4">Nombre</th>
                                <th className="p-4">Rol</th>
                                <th className="p-4">Almacenes Asignados</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(user => {
                                const assignedWarehouses = userWarehouseAccess
                                    .filter(access => access.userId === user.id)
                                    .map(access => warehouses.find(w => w.id === access.warehouseId)?.name)
                                    .filter(Boolean);
                                
                                return (
                                    <tr key={user.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="p-4">
                                            <p className="font-semibold text-white">{user.name}</p>
                                            <p className="text-xs text-gray-500">{user.email}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                user.role === 'ADMINISTRADOR' ? 'bg-purple-500/20 text-purple-400' :
                                                user.role === 'GERENTE' ? 'bg-sky-500/20 text-sky-400' :
                                                'bg-gray-500/20 text-gray-400'
                                            }`}>{user.role}</span>
                                        </td>
                                        <td className="p-4 text-sm text-gray-300">
                                            {user.role === 'ADMINISTRADOR' ? 'Todos' : assignedWarehouses.join(', ')}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center items-center gap-2">
                                                <Button onClick={() => handleOpenModal(user)} className="bg-gray-700 hover:bg-gray-600 p-2"><span className="sr-only">Editar</span>{ICONS.edit}</Button>
                                                <Button onClick={() => handleDeleteUser(user.id)} className="bg-red-800 hover:bg-red-700 p-2"><span className="sr-only">Eliminar</span>{ICONS.trash}</Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
            {isModalOpen && <UserFormModal user={editingUser} onClose={handleCloseModal} onSave={handleSaveUser} />}
        </div>
    );
};

const UserFormModal = ({ user, onClose, onSave }: { user: User | null, onClose: () => void, onSave: (user: Omit<User, 'id'> | User, warehouseIds: string[]) => void }) => {
    const { warehouses, userWarehouseAccess } = useInventoryState();
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        role: user?.role || 'EMPLEADO' as UserRole,
    });
    
    const initialWarehouseIds = user ? userWarehouseAccess
        .filter(access => access.userId === user.id)
        .map(access => access.warehouseId) : [];
    
    const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>(initialWarehouseIds);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleWarehouseToggle = (warehouseId: string) => {
        setSelectedWarehouses(prev => 
            prev.includes(warehouseId)
                ? prev.filter(id => id !== warehouseId)
                : [...prev, warehouseId]
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userPayload = user ? { ...user, ...formData } : formData;
        onSave(userPayload, selectedWarehouses);
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={user ? 'Editar Usuario' : 'Añadir Usuario'}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Nombre Completo" name="name" value={formData.name} onChange={handleChange} required />
                <Input label="Correo Electrónico" name="email" type="email" value={formData.email} onChange={handleChange} required />
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Rol</label>
                    <select name="role" value={formData.role} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                        <option value="EMPLEADO">Empleado</option>
                        <option value="GERENTE">Gerente</option>
                        <option value="ADMINISTRADOR">Administrador</option>
                    </select>
                </div>

                {formData.role !== 'ADMINISTRADOR' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Almacenes Asignados</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-800 rounded-lg">
                            {warehouses.map(w => (
                                <label key={w.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-700/50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedWarehouses.includes(w.id)}
                                        onChange={() => handleWarehouseToggle(w.id)}
                                        className="h-4 w-4 rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-600"
                                    />
                                    <span className="text-gray-300">{w.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}
                <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button type="submit">{user ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
                </div>
            </form>
        </Modal>
    );
};


const LoginView = () => {
    const { users } = useInventoryState();
    const dispatch = useInventoryDispatch();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); // Resetear error en nuevo intento
        const userToLogin = users.find(u => u.email === email);
        
        if (userToLogin && userToLogin.password === password) {
            dispatch({ type: 'LOGIN', payload: { user: userToLogin } });
        } else {
            setError('Correo electrónico o contraseña incorrectos.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <Card className="w-full max-w-sm">
                <h2 className="text-2xl font-bold text-center text-white mb-6">Iniciar Sesión</h2>
                <form onSubmit={handleLogin} className="space-y-4">
                    <Input 
                        label="Correo Electrónico" 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        required 
                        autoComplete="email"
                    />
                    <Input 
                        label="Contraseña" 
                        type="password" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        required 
                        autoComplete="current-password"
                    />

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <div className="pt-2">
                        <Button type="submit" className="w-full">
                            Ingresar
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
}

const App = () => {
    const { currentUser } = useInventoryState();
    const [view, setView] = useState<View>('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [prefillPO, setPrefillPO] = useState<Product[] | null>(null);
    const dispatch = useInventoryDispatch();

    useEffect(() => {
        // Lógica de sesión simple: si no hay usuario, quédate en el login
        if (!currentUser) {
            // No hacer nada, la vista de Login se mostrará
        }
    }, [currentUser]);

    const handleLogout = () => {
        if(window.confirm('¿Está seguro de que desea cerrar sesión?')) {
            dispatch({ type: 'LOGOUT' });
        }
    }
    
    if (!currentUser) {
        return <LoginView />;
    }

    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard, roles: ['ADMINISTRADOR', 'GERENTE', 'EMPLEADO'] },
        { id: 'products', label: 'Productos', icon: ICONS.product, roles: ['ADMINISTRADOR', 'GERENTE', 'EMPLEADO'] },
        { id: 'suppliers', label: 'Proveedores', icon: ICONS.users, roles: ['ADMINISTRADOR', 'GERENTE'] },
        { id: 'purchaseOrders', label: 'Órdenes de Compra', icon: ICONS.document, roles: ['ADMINISTRADOR', 'GERENTE'] },
        { id: 'purchaseCalendar', label: 'Calendario', icon: ICONS.calendar, roles: ['ADMINISTRADOR', 'GERENTE'] },
        { id: 'warehouses', label: 'Almacenes', icon: ICONS.warehouse, roles: ['ADMINISTRADOR', 'GERENTE'] },
        { id: 'log', label: 'Registro', icon: ICONS.log, roles: ['ADMINISTRADOR', 'GERENTE'] },
        { id: 'users', label: 'Usuarios', icon: ICONS.users, roles: ['ADMINISTRADOR'] },
        { id: 'settings', label: 'Configuración', icon: ICONS.settings, roles: ['ADMINISTRADOR'] },
    ];
    
    const permittedNavItems = navItems.filter(item => item.roles.includes(currentUser.role));

    const handleGenerateSuggestedPO = (products: Product[]) => {
        setPrefillPO(products);
        setView('purchaseOrders');
    };

    const renderView = () => {
        switch (view) {
            case 'dashboard': return <DashboardView onGenerateSuggestedPO={handleGenerateSuggestedPO} />;
            case 'products': return <ProductsView />;
            case 'suppliers': return <SuppliersView />;
            case 'purchaseOrders': return <PurchaseOrdersView prefillItems={prefillPO} onPrefillConsumed={() => setPrefillPO(null)} />;
            case 'purchaseCalendar': return <PurchaseCalendarView />;
            case 'warehouses': return <WarehousesView />;
            case 'log': return <LogView />;
            case 'users': return <UsersView />;
            case 'settings': return <SettingsView />;
            default: return <DashboardView onGenerateSuggestedPO={handleGenerateSuggestedPO} />;
        }
    };

    // Componente de enlace de navegación para evitar repetición
    // FIX: Explicitly type NavLink as React.FC to correctly handle the 'key' prop in loops.
    const NavLink: React.FC<{ item: typeof navItems[0] }> = ({ item }) => (
        <a
            href="#"
            onClick={(e) => { e.preventDefault(); setView(item.id as View); setIsMobileMenuOpen(false); }}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === item.id ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
        >
            {item.icon}
            <span>{item.label}</span>
        </a>
    );

    return (
        <div className="flex h-screen bg-gray-900 text-gray-300">
            {/* Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-gray-800 border-r border-gray-700 p-4">
                <div className="flex items-center gap-3 mb-8">
                    {/* Placeholder for logo */}
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">S</div>
                    <h1 className="text-xl font-bold text-white">Inventario</h1>
                </div>
                <nav className="flex-1 space-y-2">
                    {permittedNavItems.map(item => <NavLink key={item.id} item={item} />)}
                </nav>
                 <div className="mt-auto">
                     <div className="p-3 bg-gray-900/50 rounded-lg">
                        <p className="text-sm font-semibold text-white">{currentUser.name}</p>
                        <p className="text-xs text-gray-400">{currentUser.role}</p>
                    </div>
                     <Button onClick={handleLogout} className="w-full mt-4 bg-red-800 hover:bg-red-700">
                        {ICONS.logout}
                        <span className="hidden md:inline">Cerrar Sesión</span>
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="md:hidden flex justify-between items-center bg-gray-800 border-b border-gray-700 p-4">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">S</div>
                        <h1 className="text-lg font-bold text-white">Inventario</h1>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>{ICONS.hamburger}</button>
                </header>
                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-gray-800 border-b border-gray-700">
                        <nav className="p-4 space-y-2">
                            {permittedNavItems.map(item => <NavLink key={item.id} item={item} />)}
                        </nav>
                         <div className="p-4 border-t border-gray-700">
                             <div className="p-3 bg-gray-900/50 rounded-lg mb-2">
                                <p className="text-sm font-semibold text-white">{currentUser.name}</p>
                                <p className="text-xs text-gray-400">{currentUser.role}</p>
                            </div>
                            <Button onClick={handleLogout} className="w-full bg-red-800 hover:bg-red-700">
                                {ICONS.logout}
                                <span>Cerrar Sesión</span>
                            </Button>
                        </div>
                    </div>
                )}
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    {renderView()}
                </main>
            </div>
        </div>
    );
};

export default App;