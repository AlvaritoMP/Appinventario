import React, { useState, useMemo, useEffect } from 'react';
import { useInventoryState, useInventoryDispatch } from '../context/InventoryContext';
import { PurchaseOrderItem, Product } from '../types';
import { ICONS } from '../constants';

// Reusable UI Components
const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-4xl' }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode, maxWidth?: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className={`bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full ${maxWidth} mx-auto`} onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">{ICONS.close}</button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

const Button = ({ children, onClick, className = 'bg-blue-600 hover:bg-blue-700', type = 'button', disabled = false }: { children?: React.ReactNode, onClick?: () => void, className?: string, type?: 'button' | 'submit' | 'reset', disabled?: boolean }) => (
  <button type={type} onClick={onClick} disabled={disabled} className={`flex items-center justify-center gap-2 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
);
const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <div>
        <label className="block text-sm font-medium text-gray-400 mb-1">{label}</label>
        <input {...props} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500 transition" />
    </div>
);


export const PurchaseOrderFormModal = ({ onClose, prefillItems }: { onClose: () => void, prefillItems?: Product[] }) => {
    const { suppliers, products, myCompanies } = useInventoryState();
    const dispatch = useInventoryDispatch();

    const [supplierId, setSupplierId] = useState('');
    const [issuingCompanyId, setIssuingCompanyId] = useState(myCompanies[0]?.id || '');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [items, setItems] = useState<PurchaseOrderItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    useEffect(() => {
        if(prefillItems && prefillItems.length > 0) {
            const prefilledPOItems: PurchaseOrderItem[] = prefillItems.map(p => ({
                productId: p.id,
                productName: p.name,
                sku: p.sku,
                quantity: 1, // Default quantity
                price: p.price
            }));
            setItems(prefilledPOItems);
        }
    }, [prefillItems]);

    const availableProducts = useMemo(() => {
        const currentItemIds = items.map(i => i.productId);
        return products.filter(p => !currentItemIds.includes(p.id));
    }, [products, items]);

    const searchResults = useMemo(() => {
        if (!searchTerm) return [];
        return availableProducts
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
            .slice(0, 5);
    }, [searchTerm, availableProducts]);

    const handleAddItem = (product: Product) => {
        setItems([...items, {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            quantity: 1,
            price: product.price,
        }]);
        setSearchTerm('');
    };

    const handleItemChange = (productId: string, field: 'quantity' | 'price', value: number) => {
        setItems(items.map(item => item.productId === productId ? { ...item, [field]: value } : item));
    };
    
    const handleRemoveItem = (productId: string) => {
        setItems(items.filter(item => item.productId !== productId));
    };

    const subtotal = useMemo(() => items.reduce((sum, item) => sum + (item.quantity * item.price), 0), [items]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!supplierId || !issuingCompanyId || items.length === 0) {
            alert("Por favor, seleccione una empresa emisora, un proveedor y añada al menos un producto.");
            return;
        }

        dispatch({
            type: 'ADD_PURCHASE_ORDER',
            payload: {
                purchaseOrderData: {
                    supplierId,
                    issuingCompanyId,
                    issueDate: new Date().toISOString(),
                    deliveryDate: deliveryDate || new Date().toISOString(),
                    items
                }
            }
        });
        onClose();
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="Crear Orden de Compra">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Empresa Emisora</label>
                        <select value={issuingCompanyId} onChange={e => setIssuingCompanyId(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                            <option value="">Seleccione una empresa...</option>
                            {myCompanies.map(c => <option key={c.id} value={c.id}>{c.profileName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Proveedor</label>
                        <select value={supplierId} onChange={e => setSupplierId(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                            <option value="">Seleccione un proveedor...</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <Input label="Fecha de Entrega Esperada" type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                </div>

                <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-4">
                    <h3 className="text-lg font-semibold text-white">Artículos de la Orden</h3>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar producto para añadir..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2"
                        />
                         {searchResults.length > 0 && (
                            <ul className="absolute z-10 w-full bg-gray-800 border border-gray-600 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.map(p => (
                                    <li key={p.id} onClick={() => handleAddItem(p)} className="px-4 py-2 hover:bg-gray-700 cursor-pointer text-sm">
                                        {p.name} <span className="text-gray-400 font-mono">({p.sku})</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto">
                        {items.map(item => (
                            <div key={item.productId} className="grid grid-cols-12 gap-3 items-center py-2 border-b border-gray-700">
                                <div className="col-span-5">
                                    <p className="font-semibold text-white text-sm">{item.productName}</p>
                                    <p className="text-xs text-gray-500 font-mono">{item.sku}</p>
                                </div>
                                <div className="col-span-3">
                                    <input type="number" value={item.quantity} onChange={e => handleItemChange(item.productId, 'quantity', parseInt(e.target.value) || 0)} className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right" min="1" />
                                </div>
                                <div className="col-span-3">
                                    <input type="number" value={item.price} step="0.01" onChange={e => handleItemChange(item.productId, 'price', parseFloat(e.target.value) || 0)} className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-right" />
                                </div>
                                <div className="col-span-1 text-right">
                                    <button type="button" onClick={() => handleRemoveItem(item.productId)} className="p-1 text-red-500 hover:text-red-400">{ICONS.trash}</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-right pt-2">
                        <p className="text-gray-400">Subtotal:</p>
                        <p className="text-2xl font-bold text-white">${subtotal.toFixed(2)}</p>
                    </div>
                </div>

                <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button type="submit">Guardar Orden</Button>
                </div>
            </form>
        </Modal>
    );
};