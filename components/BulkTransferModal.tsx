import React, { useState, useMemo } from 'react';
import { Product } from '../types';
import { useInventoryState, useInventoryDispatch } from '../context/InventoryContext';
import { ICONS } from '../constants';

// UI Components
const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-4xl' }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode, maxWidth?: string }) => {
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

const Button = ({ children, onClick, className = 'bg-blue-600 hover:bg-blue-700', type = 'button', disabled = false }: { children?: React.ReactNode, onClick?: () => void, className?: string, type?: 'button' | 'submit' | 'reset', disabled?: boolean }) => (
  <button type={type} onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);

interface ItemToTransfer {
    product: Product;
    quantity: number;
    maxQuantity: number;
}

export const BulkTransferModal = ({ onClose }: { onClose: () => void }) => {
    const { products, warehouses, inventory } = useInventoryState();
    const dispatch = useInventoryDispatch();

    const [fromWarehouseId, setFromWarehouseId] = useState('');
    const [toWarehouseId, setToWarehouseId] = useState('');
    const [details, setDetails] = useState('');
    const [itemsToTransfer, setItemsToTransfer] = useState<ItemToTransfer[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const availableProducts = useMemo(() => {
        if (!fromWarehouseId) return [];
        const itemsInThisTransfer = itemsToTransfer.map(item => item.product.id);
        // Filtra productos que tienen stock en el almacén de origen y no están ya en la lista
        return products.filter(p => {
            const stockItem = inventory.find(i => i.productId === p.id && i.warehouseId === fromWarehouseId);
            return (stockItem && stockItem.quantity > 0) && !itemsInThisTransfer.includes(p.id);
        });
    }, [fromWarehouseId, products, inventory, itemsToTransfer]);

    const filteredAvailableProducts = useMemo(() => {
        if (!searchTerm) return [];
        return availableProducts.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 5); // Limitar a 5 resultados para no saturar
    }, [searchTerm, availableProducts]);

    const handleAddProduct = (product: Product) => {
        const stockItem = inventory.find(i => i.productId === product.id && i.warehouseId === fromWarehouseId);
        if (!stockItem || stockItem.quantity <= 0) return;

        setItemsToTransfer(prev => [
            ...prev,
            { product, quantity: 1, maxQuantity: stockItem.quantity }
        ]);
        setSearchTerm('');
    };

    const handleQuantityChange = (productId: string, newQuantity: number) => {
        setItemsToTransfer(prev => prev.map(item => {
            if (item.product.id === productId) {
                const validatedQuantity = Math.max(0, Math.min(item.maxQuantity, newQuantity));
                return { ...item, quantity: validatedQuantity };
            }
            return item;
        }));
    };

    const handleRemoveItem = (productId: string) => {
        setItemsToTransfer(prev => prev.filter(item => item.product.id !== productId));
    };

    const handleConfirmTransfer = () => {
        const itemsPayload = itemsToTransfer
            .filter(item => item.quantity > 0)
            .map(item => ({ productId: item.product.id, quantity: item.quantity }));
        
        if (itemsPayload.length === 0 || !fromWarehouseId || !toWarehouseId) return;

        dispatch({
            type: 'BULK_TRANSFER_STOCK',
            payload: {
                items: itemsPayload,
                fromWarehouseId,
                toWarehouseId,
                details: details || `Transferencia de ${itemsPayload.length} productos.`
            }
        });
        onClose();
    };

    const isTransferDisabled = itemsToTransfer.length === 0 || !fromWarehouseId || !toWarehouseId || fromWarehouseId === toWarehouseId || itemsToTransfer.every(i => i.quantity === 0);

    return (
        <Modal isOpen={true} onClose={onClose} title="Transferencia Múltiple de Productos">
            <div className="space-y-6">
                {/* Selección de Almacenes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Desde Almacén (Origen)</label>
                        <select value={fromWarehouseId} onChange={e => { setFromWarehouseId(e.target.value); setItemsToTransfer([]); }} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                            <option value="">Seleccione origen...</option>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Hacia Almacén (Destino)</label>
                        <select value={toWarehouseId} onChange={e => setToWarehouseId(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2" disabled={!fromWarehouseId}>
                            <option value="">Seleccione destino...</option>
                            {warehouses.filter(w => w.id !== fromWarehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Buscador y Lista de Productos */}
                {fromWarehouseId && (
                    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-4">
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-400 mb-1">Añadir Producto a la Transferencia</label>
                            <input
                                type="text"
                                placeholder="Buscar por nombre o SKU..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
                            />
                            {filteredAvailableProducts.length > 0 && (
                                <ul className="absolute z-10 w-full bg-gray-800 border border-gray-600 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                                    {filteredAvailableProducts.map(p => (
                                        <li key={p.id} onClick={() => handleAddProduct(p)} className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm">
                                            {p.name} <span className="text-gray-400 font-mono">({p.sku})</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        
                        {itemsToTransfer.length > 0 && (
                            <div className="max-h-60 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left text-gray-400">
                                        <tr>
                                            <th className="p-2">Producto</th>
                                            <th className="p-2 w-48">Cantidad a Transferir</th>
                                            <th className="p-2 w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemsToTransfer.map(item => (
                                            <tr key={item.product.id} className="border-t border-gray-700">
                                                <td className="p-2">
                                                    <p className="font-semibold text-white">{item.product.name}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{item.product.sku}</p>
                                                </td>
                                                <td className="p-2">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={e => handleQuantityChange(item.product.id, parseInt(e.target.value, 10) || 0)}
                                                            className="w-20 bg-gray-700 border border-gray-600 text-white rounded-md px-2 py-1 text-right"
                                                            max={item.maxQuantity}
                                                            min="0"
                                                        />
                                                        <span className="text-xs text-gray-400">/ {item.maxQuantity} disp.</span>
                                                    </div>
                                                </td>
                                                <td className="p-2 text-center">
                                                    <button onClick={() => handleRemoveItem(item.product.id)} className="p-1 text-red-500 hover:text-red-400">
                                                        {ICONS.trash}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Detalles y Confirmación */}
                <div>
                     <label className="block text-sm font-medium text-gray-400 mb-1">Detalles / Razón de la Transferencia</label>
                     <textarea value={details} onChange={e => setDetails(e.target.value)} rows={2} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2" />
                </div>

                <div className="flex justify-end items-center pt-4 border-t border-gray-700 gap-3">
                     <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                     <Button onClick={handleConfirmTransfer} disabled={isTransferDisabled}>
                        Confirmar Transferencia
                     </Button>
                </div>
            </div>
        </Modal>
    );
};
