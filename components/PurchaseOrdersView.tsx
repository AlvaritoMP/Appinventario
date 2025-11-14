import React, { useState, useEffect } from 'react';
import { useInventoryState, useInventoryDispatch } from '../context/InventoryContext';
import { PurchaseOrder, PurchaseOrderStatus, Supplier, Warehouse, Product } from '../types';
import { ICONS } from '../constants';
import { PurchaseOrderFormModal } from './PurchaseOrderFormModal';
import { PurchaseOrderDocumentModal } from './PurchaseOrderDocumentModal';


// Reusable UI Components
const Card = ({ children, className = '' }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-md p-6 ${className}`}>
    {children}
  </div>
);
const Button = ({ children, onClick, className = 'bg-blue-600 hover:bg-blue-700', type = 'button', disabled = false, title }: { children?: React.ReactNode, onClick?: () => void, className?: string, type?: 'button' | 'submit' | 'reset', disabled?: boolean, title?: string }) => (
  <button type={type} onClick={onClick} disabled={disabled} title={title} className={`flex items-center justify-center gap-2 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}>
    {children}
  </button>
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


const ReceiveOrderModal = ({ po, onClose, onConfirm }: { po: PurchaseOrder, onClose: () => void, onConfirm: (poId: string, warehouseId: string) => void }) => {
    const { warehouses } = useInventoryState();
    const [warehouseId, setWarehouseId] = useState('');

    return (
        <Modal isOpen={true} onClose={onClose} title={`Recibir Orden de Compra #${po.orderNumber}`}>
            <div className="space-y-4">
                <p>Seleccione el almacén de destino para los productos de esta orden.</p>
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Almacén de Destino</label>
                    <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2">
                        <option value="">Seleccione un almacén...</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </div>
                <div className="flex justify-end pt-4 gap-3">
                    <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-700">Cancelar</Button>
                    <Button onClick={() => onConfirm(po.id, warehouseId)} disabled={!warehouseId}>Confirmar Recepción</Button>
                </div>
            </div>
        </Modal>
    );
};


export const PurchaseOrdersView = ({ prefillItems, onPrefillConsumed }: { prefillItems: Product[] | null, onPrefillConsumed: () => void }) => {
    const { purchaseOrders, suppliers } = useInventoryState();
    const dispatch = useInventoryDispatch();

    const [modal, setModal] = useState<'add' | 'view' | 'receive' | null>(null);
    const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

    useEffect(() => {
        if(prefillItems && prefillItems.length > 0) {
            setModal('add');
            // prefillItems will be passed down to the form modal
        }
    }, [prefillItems]);

    const handleCloseModal = () => {
        setModal(null);
        setSelectedPO(null);
        if (prefillItems) {
            onPrefillConsumed();
        }
    };
    
    const handleStatusChange = (poId: string, status: PurchaseOrderStatus, warehouseId?: string) => {
        dispatch({ type: 'UPDATE_PURCHASE_ORDER', payload: { purchaseOrderId: poId, status, receivedInWarehouseId: warehouseId } });
        handleCloseModal();
    };

    const getStatusChip = (status: PurchaseOrderStatus) => {
        const styles = {
            'BORRADOR': 'bg-gray-500/20 text-gray-400',
            'EMITIDA': 'bg-blue-500/20 text-blue-400',
            'RECIBIDA': 'bg-green-500/20 text-green-400',
            'CANCELADA': 'bg-red-500/20 text-red-400',
        };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>{status}</span>;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Órdenes de Compra</h1>
                <Button onClick={() => setModal('add')} className="bg-blue-600 hover:bg-blue-700">
                    {ICONS.plus}
                    Crear Orden de Compra
                </Button>
            </div>
            <Card>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-gray-700 text-sm text-gray-400">
                            <tr>
                                <th className="p-4">N° Orden</th>
                                <th className="p-4">Proveedor</th>
                                <th className="p-4">Fecha Emisión</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-center">Estado</th>
                                <th className="p-4 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchaseOrders.map(po => {
                                const supplier = suppliers.find(s => s.id === po.supplierId);
                                return (
                                    <tr key={po.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                        <td className="p-4 font-mono text-white">{po.orderNumber}</td>
                                        <td className="p-4">{supplier?.name || 'N/A'}</td>
                                        <td className="p-4">{new Date(po.issueDate).toLocaleDateString()}</td>
                                        <td className="p-4 text-right font-semibold text-white">${po.total.toFixed(2)}</td>
                                        <td className="p-4 text-center">{getStatusChip(po.status)}</td>
                                        <td className="p-4">
                                            <div className="flex justify-center items-center gap-2">
                                                <Button onClick={() => { setSelectedPO(po); setModal('view'); }} title="Ver Orden" className="bg-gray-700 hover:bg-gray-600 p-2">{ICONS.document}</Button>
                                                {po.status === 'BORRADOR' && <Button onClick={() => handleStatusChange(po.id, 'EMITIDA')} title="Emitir Orden" className="bg-green-700 hover:bg-green-600 p-2">Emitir</Button>}
                                                {po.status === 'EMITIDA' && <Button onClick={() => { setSelectedPO(po); setModal('receive'); }} title="Recibir Mercancía" className="bg-teal-700 hover:bg-teal-600 p-2">Recibir</Button>}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                     {purchaseOrders.length === 0 && <p className="text-center text-gray-400 py-8">No hay órdenes de compra creadas.</p>}
                </div>
            </Card>

            {modal === 'add' && <PurchaseOrderFormModal onClose={handleCloseModal} prefillItems={prefillItems || undefined}/>}
            {modal === 'view' && selectedPO && <PurchaseOrderDocumentModal po={selectedPO} onClose={handleCloseModal} />}
            {modal === 'receive' && selectedPO && <ReceiveOrderModal po={selectedPO} onClose={handleCloseModal} onConfirm={(poId, whId) => handleStatusChange(poId, 'RECIBIDA', whId)} />}
        </div>
    );
};