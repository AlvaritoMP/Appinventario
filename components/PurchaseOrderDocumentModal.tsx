import React from 'react';
import { PurchaseOrder } from '../types';
import { useInventoryState } from '../context/InventoryContext';
import { ICONS } from '../constants';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-4xl' }: { isOpen: boolean, onClose: () => void, title: string, children?: React.ReactNode, maxWidth?: string }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4 print-container">
        <div className={`bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full ${maxWidth} mx-auto`} onClick={e => e.stopPropagation()}>
          <div className="p-5 border-b border-gray-700 flex justify-between items-center print:hidden">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <div className="flex items-center gap-4">
                <button onClick={() => window.print()} className="flex items-center gap-2 text-white bg-blue-600 hover:bg-blue-700 font-semibold py-2 px-4 rounded-lg transition-colors">
                    {ICONS.print}
                    Imprimir
                </button>
                <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">{ICONS.close}</button>
            </div>
          </div>
          <div className="p-1 bg-white max-h-[80vh] overflow-y-auto">
              {children}
          </div>
        </div>
      </div>
    );
};


const PurchaseOrderContent = ({ po }: { po: PurchaseOrder }) => {
    const { suppliers, companyInfo, currentUser } = useInventoryState();
    const supplier = suppliers.find(s => s.id === po.supplierId);

    return (
        <div className="p-6 bg-white text-gray-900 text-sm" id="po-document">
            <header className="grid grid-cols-2 gap-8 pb-4 border-b">
                <div>
                    <h1 className="text-4xl font-bold text-gray-800">RANSA</h1>
                    <p className="text-xs text-gray-600 mt-2">Estado: <span className="font-semibold">{po.status}</span></p>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl font-semibold">Orden de compra</h2>
                    <p className="text-lg">Núm. Orden: <span className="font-bold">{po.orderNumber}</span></p>
                </div>
            </header>

            <section className="grid grid-cols-3 gap-6 mt-6 text-xs">
                <div>
                    <h3 className="font-bold mb-1">Proveedor</h3>
                    <p className="font-semibold">{supplier?.name}</p>
                    <p>{supplier?.ruc}</p>
                    <p>{supplier?.address}</p>
                    <p>{supplier?.contactPhone}</p>
                    <p>{supplier?.contactEmail}</p>
                </div>
                <div>
                    <h3 className="font-bold mb-1">Centro / Sede</h3>
                    <p className="font-semibold">{companyInfo.tradeName}</p>
                    <p>{companyInfo.ruc}</p>
                    <p>{companyInfo.fiscalAddress}</p>
                </div>
                <div>
                    <h3 className="font-bold mb-1">Solicitante</h3>
                    <p>{po.solicitante}</p>
                    <p>{currentUser?.email}</p>
                    <h3 className="font-bold mb-1 mt-2">Fecha Entrega</h3>
                    <p>{new Date(po.deliveryDate).toLocaleDateString()}</p>
                </div>
            </section>

            <section className="mt-8">
                <h3 className="font-bold mb-2 text-base border-b pb-1">Productos/Servicios</h3>
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-2 w-1/5">Código</th>
                            <th className="p-2 w-2/5">Desc. Breve</th>
                            <th className="p-2 text-right">Cantidad</th>
                            <th className="p-2 text-right">Precio</th>
                            <th className="p-2 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {po.items.map(item => (
                            <tr key={item.productId} className="border-b">
                                <td className="p-2 font-mono">{item.sku}</td>
                                <td className="p-2">{item.productName}</td>
                                <td className="p-2 text-right">{item.quantity}</td>
                                <td className="p-2 text-right">S/ {item.price.toFixed(2)}</td>
                                <td className="p-2 text-right font-semibold">S/ {(item.quantity * item.price).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section className="mt-4 flex justify-end">
                <div className="w-1/3 text-xs">
                    <div className="flex justify-between p-2">
                        <span>Subtotal</span>
                        <span className="font-semibold">S/ {po.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-2">
                        <span>Impuestos</span>
                        <span>S/ 0.00</span>
                    </div>
                    <div className="flex justify-between p-2 bg-gray-100 border-t-2 border-black">
                        <span className="font-bold">Total:</span>
                        <span className="font-bold">S/ {po.total.toFixed(2)}</span>
                    </div>
                </div>
            </section>
            
            <footer className="mt-12 text-xs text-gray-500 border-t pt-4">
                <h4 className="font-bold text-gray-700 mb-2">RETRIBUCIÓN, FORMA Y OPORTUNIDAD DE PAGO.-</h4>
                <p>Las partes acuerdan que el monto de la retribución que pagará RANSA en calidad de contraprestación por EL SERVICIO a ejecutar por EL PROVEEDOR, será de acuerdo con las disposiciones establecidas en la primera parte de la presente orden de servicio...</p>
            </footer>
        </div>
    );
};

export const PurchaseOrderDocumentModal = ({ po, onClose }: { po: PurchaseOrder, onClose: () => void }) => {
    return (
        <>
        <style>
        {`
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .print-container, .print-container > div {
                    position: absolute !important; top: 0 !important; left: 0 !important;
                    width: 100% !important; height: auto !important;
                    padding: 0 !important; margin: 0 !important;
                    box-shadow: none !important; border: none !important;
                    border-radius: 0 !important; overflow: visible !important;
                }
                body > *:not(.print-container) { display: none !important; }
                .print\\:hidden { display: none !important; }
            }
        `}
        </style>
        <Modal isOpen={true} onClose={onClose} title={`Orden de Compra #${po.orderNumber}`}>
            <PurchaseOrderContent po={po} />
        </Modal>
        </>
    );
};